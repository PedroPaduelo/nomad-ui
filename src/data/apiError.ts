/**
 * Erro normalizado de toda chamada HTTP feita pelo `createHttpClient`.
 *
 * Tela e hook só conhecem `ApiError`: status HTTP (ausente quando não houve
 * resposta), a mensagem em pt-BR pronta para o humano, os `details` do corpo
 * (o motivo real de um 422/409) e o `requestId` (o `x-request-id` da resposta,
 * que a tela de erro mostra como "código para suporte").
 *
 * Para discriminar erros do backend pelo tipo (`invalid_credentials`,
 * `mfa_required`, `version_conflict`…) use `errorCode` (vem de `body.error`
 * quando for string) ou `body` (corpo bruto da resposta). `details`
 * continua sendo `body.details`.
 *
 * Copiado de `frontend/src/api/client.ts` e `api/renderErrors.ts` do
 * agent-package; os predicados só classificam um erro já recebido (não falam
 * com o servidor), por isso a fronteira de dados do ESLint os libera em
 * qualquer camada.
 */
export class ApiError extends Error {
  /** Status HTTP; `undefined` quando não houve resposta (rede, tempo esgotado, cancelada). */
  status?: number
  /**
   * `details` do corpo de erro. O backend manda o motivo real ali
   * (`{ reason: 'VERSION_CONFLICT' }`, campos inválidos) enquanto `message`
   * fica genérico.
   */
  details?: unknown
  /** `x-request-id` da resposta (ou `errorId` do corpo): o código para suporte. */
  requestId?: string
  /** Código do axios quando não houve resposta (`ERR_NETWORK`, `ECONNABORTED`...). */
  code?: string
  /**
   * `error` do corpo de erro quando for string (ex.: `invalid_credentials`,
   * `mfa_required`, `token_expired`, `version_conflict`). É o que a Conta
   * usa para escolher a tela/fluxo certo em 401/409/etc. `undefined` quando
   * o corpo não tem `error` ou não é string.
   */
  errorCode?: string
  /**
   * Corpo bruto da resposta (o `response.data` do axios). `undefined` quando
   * não houve resposta (rede/tempo). Use quando precisar ler campos além de
   * `error`/`message`/`details`.
   */
  body?: unknown

  constructor(
    message: string,
    status?: number,
    details?: unknown,
    requestId?: string,
    code?: string,
    errorCode?: string,
    body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    this.requestId = requestId
    this.code = code
    this.errorCode = errorCode
    this.body = body
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** 401: a sessão acabou (expirou, foi encerrada, credencial trocada). */
export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401
}

/** 403: sessão válida, sem permissão para a ação. */
export function isForbiddenError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403
}

export function isNotFoundError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404
}

/** 409: conflito (versão velha, escrita concorrente, nome em uso). */
export function isConflictError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409
}

/** 400 ou 422: dados recusados pela validação do backend (motivo em `details`). */
export function isValidationError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 400 || error.status === 422)
}

/**
 * Sem resposta do servidor (sem `status`): backend fora do ar, preflight
 * reprovado, tempo esgotado. Nunca é "culpa do conteúdo".
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status == null
  return (
    error instanceof Error && /network|failed to fetch|econn|timeout|abort/i.test(error.message)
  )
}

/**
 * Mensagem para o humano de qualquer erro (toast, `onError` de mutation):
 * a do `ApiError` já vem em pt-BR; para os outros, `fallback`.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Algo deu errado. Tente de novo.',
): string {
  if (error instanceof ApiError) return error.message || fallback
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * Texto em pt-BR quando o backend não mandou `message`. O `message` do axios
 * ("Network Error", "Request failed with status code 500") é cru e em inglês,
 * e nunca chega à tela.
 */
export function fallbackErrorMessage(code: string | undefined, status: number | undefined): string {
  if (status === undefined) {
    if (code === 'ERR_NETWORK') return 'Sem conexão com o servidor.'
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return 'O servidor demorou demais para responder.'
    }
    if (code === 'ERR_CANCELED') return 'A requisição foi cancelada.'
    return 'Não foi possível falar com o servidor.'
  }
  if (status === 401) return 'Sua sessão expirou. Entre de novo.'
  if (status === 403) return 'Você não tem permissão para esta ação.'
  if (status === 404) return 'Não encontrado.'
  if (status === 409) return 'Houve uma alteração ao mesmo tempo. Recarregue e tente de novo.'
  if (status === 413) return 'O conteúdo enviado é grande demais.'
  if (status === 422 || status === 400) return 'Dados inválidos.'
  if (status === 429) return 'Muitas requisições. Aguarde um pouco e tente de novo.'
  if (status >= 500) return `Erro no servidor (HTTP ${status}). Tente de novo em instantes.`
  return `O servidor recusou a requisição (HTTP ${status}).`
}
