import { http as mock, HttpResponse } from 'msw'
import { z } from 'zod'
import { createHttpClient } from './httpClient'
import { API, server, setupMswServer } from '../test/msw'
import {
  EnvError,
  fieldErrors,
  isResponseParseError,
  parseEnv,
  parseResponse,
  ResponseParseError,
  responseParser,
  secureEnv,
} from './zod'

setupMswServer()

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime().transform((value) => new Date(value)),
})
const listSchema = z.object({ items: z.array(projectSchema) })

describe('parseResponse', () => {
  it('devolve o valor tipado e transformado', () => {
    const project = parseResponse(projectSchema, {
      id: 'p1',
      name: 'Nomad',
      createdAt: '2026-09-29T10:00:00Z',
    })
    expect(project.createdAt).toBeInstanceOf(Date)
  })

  it('formato inválido: ResponseParseError com um campo por linha', () => {
    let error: unknown
    try {
      parseResponse(
        listSchema,
        { items: [{ id: 1, name: 'x', createdAt: 'ontem' }] },
        'GET /projects',
      )
    } catch (e) {
      error = e
    }
    expect(isResponseParseError(error)).toBe(true)
    const parseError = error as ResponseParseError
    expect(parseError.context).toBe('GET /projects')
    expect(parseError.message).toMatch(/^Resposta inesperada de GET \/projects:/)
    expect(parseError.message).toContain('items[0].id:')
    expect(parseError.message).toContain('items[0].createdAt:')
    expect(parseError.issues).toHaveLength(2)
  })

  it('encadeado numa chamada HTTP (msw): 200 válido e 200 com contrato quebrado', async () => {
    const client = createHttpClient({ baseURL: API })
    const listProjects = () =>
      client
        .get('/projects')
        .then((r) => r.data)
        .then(responseParser(listSchema, 'GET /projects'))

    server.use(
      mock.get(`${API}/projects`, () =>
        HttpResponse.json({ items: [{ id: 'p1', name: 'A', createdAt: '2026-09-29T10:00:00Z' }] }),
      ),
    )
    await expect(listProjects()).resolves.toMatchObject({ items: [{ id: 'p1' }] })

    server.use(mock.get(`${API}/projects`, () => HttpResponse.json({ data: [] })))
    await expect(listProjects()).rejects.toThrow(/items: /)
  })
})

describe('parseEnv', () => {
  const envSchema = z.object({
    VITE_API_URL: z.url(),
    VITE_FEATURE_X: z.stringbool().default(false),
  })

  it('valida e aplica os padrões', () => {
    expect(parseEnv(envSchema, { VITE_API_URL: 'https://api.exemplo.com/api' })).toEqual({
      VITE_API_URL: 'https://api.exemplo.com/api',
      VITE_FEATURE_X: false,
    })
  })

  it('lista as variáveis erradas', () => {
    expect(() =>
      parseEnv(envSchema, { VITE_API_URL: 'não é url', VITE_FEATURE_X: 'talvez' }),
    ).toThrow(EnvError)
    expect(() => parseEnv(envSchema, {})).toThrow(/VITE_API_URL:/)
  })
})

describe('fieldErrors', () => {
  it('primeiro erro de cada campo e regra do objeto em _form', () => {
    const schema = z
      .object({
        name: z.string().min(1, 'Dá um nome').max(3, 'Nome longo'),
        url: z.url('URL inválida'),
        password: z.string(),
        confirm: z.string(),
      })
      .refine((v) => v.password === v.confirm, 'As senhas não batem')
    const result = schema.safeParse({ name: '', url: 'x', password: 'a', confirm: 'b' })
    expect(result.success).toBe(false)
    if (result.success) return
    // O Zod 4 roda o refine mesmo com campos errados: tudo aparece de uma vez.
    expect(fieldErrors<'name' | 'url'>(result.error)).toEqual({
      name: 'Dá um nome',
      url: 'URL inválida',
      _form: 'As senhas não batem',
    })

    const refined = schema.safeParse({ name: 'a', url: 'https://x.y', password: 'a', confirm: 'b' })
    expect(refined.success).toBe(false)
    if (!refined.success)
      expect(fieldErrors(refined.error)).toEqual({ _form: 'As senhas não batem' })
  })
})

/**
 * Variável de segurança não tem default (trava do pacote, 2026-10-01).
 *
 * O padrão apareceu em três apps: flag de dev ligada por omissão, guard que
 * dependia da variável que deveria proteger. O pacote não tinha o defeito
 * (não lê env sozinho), mas não tinha trava — e o exemplo do JSDoc ensinava
 * `VITE_API_URL: z.url().default(...)`, que é o default permissivo.
 *
 * `secureEnv` carrega a lista de obrigatórias **junto do schema**, para não
 * poder divergir dele.
 */
describe('secureEnv: variável de segurança ausente quebra o boot nomeando a variável', () => {
  const schema = secureEnv(
    z.object({
      VITE_API_URL: z.url(),
      VITE_FEATURE_X: z.stringbool().default(false), // recurso: default é correto
    }),
    ['VITE_API_URL'],
  )

  it('lança EnvError com o nome da variável quando a fonte não a traz', () => {
    expect(() => parseEnv(schema, { VITE_FEATURE_X: 'true' })).toThrow(EnvError)
    expect(() => parseEnv(schema, { VITE_FEATURE_X: 'true' })).toThrow(/VITE_API_URL/)
    expect(() => parseEnv(schema, {})).toThrow(/variável de segurança ausente/)
  })

  it('o default permissivo no schema NÃO segura a variável declarada — é isso que trava', () => {
    // schema com default na mesma variável: sem a trava do secureEnv, o parse
    // passaria e o app rodaria apontando para o default em vez de quebrar.
    const comDefault = secureEnv(
      z.object({ VITE_API_URL: z.url().default('http://localhost/api') }),
      ['VITE_API_URL'],
    )
    expect(() => parseEnv(comDefault, {})).toThrow(/VITE_API_URL/)
  })

  it('fonte não-objeto (ou null) também é falha nomeando a variável', () => {
    expect(() => parseEnv(schema, undefined)).toThrow(/VITE_API_URL/)
    expect(() => parseEnv(schema, null)).toThrow(/VITE_API_URL/)
  })

  it('string vazia conta como ausente (env de orquestrador pode vir vazia)', () => {
    expect(() => parseEnv(schema, { VITE_API_URL: '' })).toThrow(/VITE_API_URL/)
  })

  it('com a variável presente, valida normal e o default da flag continua valendo', () => {
    expect(parseEnv(schema, { VITE_API_URL: 'https://api.exemplo.com/api' })).toEqual({
      VITE_API_URL: 'https://api.exemplo.com/api',
      VITE_FEATURE_X: false,
    })
  })

  it('mais de uma variável ausente: nomeia todas', () => {
    const duas = secureEnv(z.object({ VITE_API_URL: z.url(), VITE_PUBLIC_KEY: z.string() }), [
      'VITE_API_URL',
      'VITE_PUBLIC_KEY',
    ])
    let msg = ''
    try {
      parseEnv(duas, {})
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/VITE_API_URL/)
    expect(msg).toMatch(/VITE_PUBLIC_KEY/)
  })

  it('parseEnv sem secureEnv não muda de comportamento (compat com os 4 apps)', () => {
    // schema puro, sem lista: default continua valendo e fonte incompleta
    // segue exatamente como antes desta trava.
    const puro = z.object({ VITE_API_URL: z.url().default('http://localhost/api') })
    expect(parseEnv(puro, {})).toEqual({ VITE_API_URL: 'http://localhost/api' })
  })
})
