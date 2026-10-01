/**
 * Tipagem do Zod **estrutural** (sem `z.` no `.d.ts`) — PKG-FIXES `25d586a6`.
 *
 * O `.d.ts` do pacote é resolvido pelo TypeScript do app contra a cópia de
 * `zod` que o app tem. Em monorepo com zod 3 na raiz (o `be` do motor precisa
 * do 3.25.76) e zod 4 no `fe`, o `.d.ts` acabava tipado contra o zod 3 e o
 * `parseEnv`/`parseResponse` do `fe` davam TS2345 — mesmo rodando igual, porque
 * em runtime o pacote só usa `safeParse` (igual no 3 e no 4). Aqui nada de zod
 * entra nos tipos públicos: o schema é um `SafeParseSchema<Out>` (o que o
 * app já tem, seja do zod 3 ou 4) e os issues viram o `Issue` estrutural
 * abaixo. A dependência declarada não muda: `zod@^4` segue peer (o `fe` usa
 * o schema do app), o que muda é o `.d.ts`, que deixa de amarrar a versão.
 */

/**
 * O que o `.d.ts` precisa saber de um schema: inferir a saída e ter
 * `safeParse`. Estrutural — o `z.ZodType`/`z.ZodTypeAny` do zod 3 também
 * satisfazem (é o que torna a ponte do motor desnecessária).
 */
export interface SafeParseSchema<Out> {
  safeParse(
    data: unknown,
  ): { success: true; data: Out } | { success: false; error: { issues: readonly Issue[] } }
}

/** Issue do Zod sem depender da versão: o que o pacote usa é `path` e `message`. */
export interface Issue {
  readonly path: readonly PropertyKey[]
  readonly message: string
  readonly code?: string
  readonly expected?: unknown
  readonly received?: unknown
}

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
export function parseResponse<Out>(
  schema: SafeParseSchema<Out>,
  data: unknown,
  context?: string,
): Out {
  const result = schema.safeParse(data)
  if (!result.success) throw new ResponseParseError(result.error.issues, context)
  return result.data
}

/**
 * `parseResponse` para encadear no `.then` de uma chamada:
 * `http.get('/projects').then((r) => r.data).then(responseParser(listSchema, 'GET /projects'))`.
 */
export function responseParser<Out>(schema: SafeParseSchema<Out>, context?: string) {
  return (data: unknown): Out => parseResponse(schema, data, context)
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
export function parseEnv<Out>(schema: SafeParseSchema<Out>, source: unknown): Out {
  const result = schema.safeParse(source)
  if (!result.success) throw new EnvError(result.error.issues)
  return result.data
}

/**
 * Erros de formulário por campo (o primeiro de cada um), a partir de um
 * `safeParse` que falhou: `{ name: 'Dá um nome', url: 'URL inválida' }`.
 * Issue sem caminho (regra do objeto inteiro) vai em `_form`.
 */
export function fieldErrors<F extends string = string>(error: {
  issues: readonly Issue[]
}): Partial<Record<F | '_form', string>> {
  const out: Partial<Record<string, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issuePath(issue.path) : '_form'
    out[key] ??= issue.message
  }
  return out as Partial<Record<F | '_form', string>>
}
