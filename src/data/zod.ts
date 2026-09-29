import type { z } from 'zod'

type Issue = z.core.$ZodIssue

/** Caminho legível de um issue: `items[0].id`; vazio vira `(raiz)`. */
export function issuePath(path: readonly PropertyKey[]): string {
  let out = ''
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`
    else out += out ? `.${String(part)}` : String(part)
  }
  return out || '(raiz)'
}

/** Uma linha por issue: `items[0].id: Invalid input: expected string, received number`. */
export function formatIssues(issues: readonly Issue[], max = 10): string {
  const lines = issues.slice(0, max).map((issue) => `${issuePath(issue.path)}: ${issue.message}`)
  if (issues.length > max) lines.push(`… e mais ${issues.length - max}`)
  return lines.join('\n')
}

/**
 * A resposta da API não tem o formato que o app espera (contrato quebrado,
 * backend de outra versão). Mensagem legível para o log e para a tela de
 * erro; os issues do Zod ficam em `issues`.
 */
export class ResponseParseError extends Error {
  issues: readonly Issue[]
  /** O que foi validado (ex.: `GET /projects`), quando informado. */
  context?: string

  constructor(issues: readonly Issue[], context?: string) {
    const where = context ? ` de ${context}` : ''
    super(`Resposta inesperada${where}:\n${formatIssues(issues)}`)
    this.name = 'ResponseParseError'
    this.issues = issues
    this.context = context
  }
}

export function isResponseParseError(error: unknown): error is ResponseParseError {
  return error instanceof ResponseParseError
}

/**
 * Valida o dado recebido da API contra o schema e devolve o valor tipado
 * (com as transformações do schema). Falhou: `ResponseParseError` com cada
 * campo errado numa linha.
 *
 * ```ts
 * const project = parseResponse(projectSchema, data, 'GET /projects/:id')
 * ```
 */
export function parseResponse<S extends z.ZodType>(
  schema: S,
  data: unknown,
  context?: string,
): z.output<S> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ResponseParseError(result.error.issues, context)
  return result.data
}

/**
 * `parseResponse` para encadear no `.then` de uma chamada:
 * `http.get('/projects').then((r) => r.data).then(responseParser(listSchema, 'GET /projects'))`.
 */
export function responseParser<S extends z.ZodType>(schema: S, context?: string) {
  return (data: unknown): z.output<S> => parseResponse(schema, data, context)
}

/** Variáveis de ambiente inválidas ou ausentes. */
export class EnvError extends Error {
  issues: readonly Issue[]

  constructor(issues: readonly Issue[]) {
    super(`Variáveis de ambiente inválidas:\n${formatIssues(issues, 50)}`)
    this.name = 'EnvError'
    this.issues = issues
  }
}

/**
 * Valida as variáveis de ambiente uma vez, no boot, e devolve o objeto
 * tipado. O app passa a fonte (`import.meta.env` do Vite): o pacote nunca lê
 * o ambiente sozinho.
 *
 * ```ts
 * export const env = parseEnv(
 *   z.object({ VITE_API_URL: z.url().default(`${location.origin}/api`) }),
 *   import.meta.env,
 * )
 * ```
 */
export function parseEnv<S extends z.ZodType>(schema: S, source: unknown): z.output<S> {
  const result = schema.safeParse(source)
  if (!result.success) throw new EnvError(result.error.issues)
  return result.data
}

/**
 * Erros de formulário por campo (o primeiro de cada um), a partir de um
 * `safeParse` que falhou: `{ name: 'Dá um nome', url: 'URL inválida' }`.
 * Issue sem caminho (regra do objeto inteiro) vai em `_form`.
 */
export function fieldErrors<F extends string = string>(
  error: z.ZodError | { issues: readonly Issue[] },
): Partial<Record<F | '_form', string>> {
  const out: Partial<Record<string, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issuePath(issue.path) : '_form'
    out[key] ??= issue.message
  }
  return out as Partial<Record<F | '_form', string>>
}
