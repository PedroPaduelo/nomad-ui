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
