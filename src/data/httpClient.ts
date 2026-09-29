import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ApiError, fallbackErrorMessage } from './apiError'

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Não manda a credencial da sessão e não trata o 401 como sessão vencida:
     * rota pública (login, troca de código), em que 401 é "credencial errada".
     */
    skipAuth?: boolean
  }
}

/** Prazo padrão: quase todo endpoint responde em milissegundos, e 10 s já indica backend travado. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

/**
 * Prazo por chamada para operações longas por natureza (upload, importação,
 * exportação, sincronização externa). Passe na própria chamada:
 * `http.post(url, body, { timeout: LONG_REQUEST_TIMEOUT_MS })`.
 */
export const LONG_REQUEST_TIMEOUT_MS = 120_000

/** Cabeçalho de correlação que o backend devolve em toda resposta. */
export const REQUEST_ID_HEADER = 'x-request-id'

/** O que o `onUnauthorized` recebe. */
export interface UnauthorizedContext {
  /** O erro já normalizado (status 401). */
  error: ApiError
  /** Token Bearer que a requisição levou (`null` quando não levou). */
  sentToken: string | null
}

export interface HttpClientOptions {
  /** URL base da API (ex.: `https://api.exemplo.com/api`), sem barra no fim. */
  baseURL: string
  /**
   * Token da sessão para o `Authorization: Bearer`. Lido a cada requisição
   * (ex.: `() => useSessionStore.getState().token`). Sem ele nenhum Bearer é
   * enviado (sessão por cookie: use `withCredentials`).
   */
  getToken?: () => string | null | undefined
  /**
   * Sessão vencida (401). Chamado uma vez por resposta 401, nunca para
   * requisição `skipAuth`. Com `getToken`, só quando a requisição levou o
   * token ATUAL: um 401 de uma chamada feita com o token anterior (a pessoa já
   * entrou de novo) não derruba o login novo. Encerre a sessão aqui (o guard
   * de rotas leva ao login) ou redirecione para o login da Conta.
   */
  onUnauthorized?: (context: UnauthorizedContext) => void
  /** Chamado a cada resposta HTTP (sucesso ou erro): prova de que o backend está de pé. */
  onResponse?: (status: number) => void
  /** Chamado quando a requisição não recebeu resposta (ERR_NETWORK): o backend pode ter caído. */
  onNetworkError?: (error: ApiError) => void
  /** Prazo padrão das requisições (ms). */
  timeout?: number
  /** Envia cookies em chamadas de outra origem (sessão por cookie). */
  withCredentials?: boolean
  /** Cabeçalhos fixos extras. */
  headers?: Record<string, string>
  /** Qualquer outro padrão do `axios.create`. */
  axios?: Omit<CreateAxiosDefaults, 'baseURL' | 'timeout' | 'withCredentials' | 'headers'>
}

/** A instância do axios, com o `x-request-id` da última resposta. */
export interface HttpClient extends AxiosInstance {
  /** `x-request-id` da última resposta recebida (sucesso ou erro). */
  getLastRequestId: () => string | undefined
}

/** Campos do corpo de erro que o client lê (problem+json mantém os legados no topo). */
interface ErrorBody {
  message?: unknown
  detail?: unknown
  details?: unknown
  errorId?: unknown
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function bearerOf(
  config: InternalAxiosRequestConfig | AxiosRequestConfig | undefined,
): string | null {
  const headers = config?.headers as { get?: (name: string) => unknown } | undefined
  const header = typeof headers?.get === 'function' ? headers.get('Authorization') : undefined
  const match = typeof header === 'string' ? /^Bearer (.+)$/.exec(header) : null
  return match ? match[1] : null
}

function requestIdOf(response: AxiosResponse | undefined): string | undefined {
  const header: unknown = response?.headers?.[REQUEST_ID_HEADER]
  if (typeof header === 'string' && header) return header
  const errorId: unknown = (response?.data as ErrorBody | undefined)?.errorId
  return typeof errorId === 'string' && errorId ? errorId : undefined
}

function bodyMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const { message, detail } = data as ErrorBody
  if (typeof message === 'string' && message) return message
  // RFC 9457: `detail` é o texto para o humano quando não há `message`.
  if (typeof detail === 'string' && detail) return detail
  return undefined
}

/**
 * Cliente HTTP da API (axios), igual ao `src/api/client.ts` do agent-package
 * sem nada do produto:
 *
 * - `Authorization: Bearer <getToken()>` só para URLs do próprio backend (uma
 *   URL absoluta de outro host nunca leva o token), salvo `skipAuth` ou quando
 *   quem chama já mandou a própria credencial.
 * - Todo erro vira `ApiError` com mensagem em pt-BR (`message`/`detail` do
 *   corpo ou, sem eles, o texto do status), `details` e `requestId`.
 * - Resposta HTML onde se espera JSON (build sem a URL da API caindo no
 *   fallback de SPA) vira erro na hora, em vez de falhar longe dali.
 * - 401 → `onUnauthorized` (tratamento central da sessão vencida).
 *
 * Também é a instância que o client gerado pelo `@hey-api/openapi-ts` usa
 * (ver `generatedClientConfig`).
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const baseURL = trimSlash(options.baseURL)
  const instance = axios.create({
    ...options.axios,
    baseURL,
    timeout: options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
    withCredentials: options.withCredentials,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  let lastRequestId: string | undefined

  const isBackendUrl = (url: string | undefined): boolean => {
    if (!url || !/^([a-z][a-z\d+.-]*:)?\/\//i.test(url)) return true
    return url === baseURL || url.startsWith(`${baseURL}/`) || url.startsWith(`${baseURL}?`)
  }

  const remember = (response: AxiosResponse | undefined): string | undefined => {
    const id = requestIdOf(response)
    if (id) lastRequestId = id
    return id
  }

  instance.interceptors.request.use((config) => {
    const token = options.getToken?.()
    if (
      token &&
      !config.skipAuth &&
      isBackendUrl(config.url) &&
      !config.headers.has('Authorization')
    ) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      options.onResponse?.(response.status)
      const requestId = remember(response)
      const type = String(response.headers?.['content-type'] ?? '')
      const expectsJson = !response.config.responseType || response.config.responseType === 'json'
      if (expectsJson && type.includes('text/html')) {
        throw new ApiError(
          'A API respondeu HTML em vez de JSON. O app provavelmente foi construído sem a URL ' +
            'da API e está chamando a própria origem.',
          response.status,
          undefined,
          requestId,
        )
      }
      return response
    },
    (error: unknown) => {
      if (error instanceof ApiError || !axios.isAxiosError(error)) return Promise.reject(error)
      const response = error.response
      const requestId = remember(response)
      const status = response?.status
      const data: unknown = response?.data
      const apiError = new ApiError(
        bodyMessage(data) ?? fallbackErrorMessage(error.code, status),
        status,
        data && typeof data === 'object' ? (data as ErrorBody).details : undefined,
        requestId,
        response ? undefined : error.code,
      )
      if (response) options.onResponse?.(response.status)
      else if (error.code === 'ERR_NETWORK') options.onNetworkError?.(apiError)

      if (status === 401 && options.onUnauthorized && !error.config?.skipAuth) {
        const sentToken = bearerOf(error.config)
        const current = options.getToken?.() ?? null
        // Com Bearer: só o 401 do token atual encerra a sessão. Sem Bearer
        // (sessão por cookie): todo 401 encerra.
        const isCurrentSession = options.getToken
          ? sentToken !== null && sentToken === current
          : true
        if (isCurrentSession) options.onUnauthorized({ error: apiError, sentToken })
      }
      return Promise.reject(apiError)
    },
  )

  return Object.assign(instance, { getLastRequestId: () => lastRequestId })
}

/**
 * Configuração do client gerado pelo `@hey-api/openapi-ts` (plugin
 * `@hey-api/client-axios`, `runtimeConfigPath`): as operações geradas passam
 * pela instância do `createHttpClient`, com a credencial, o `x-request-id` e os
 * erros normalizados em `ApiError`.
 *
 * ```ts
 * // src/api/generatedClient.ts
 * export const createClientConfig: CreateClientConfig = (config) => ({
 *   ...config,
 *   ...generatedClientConfig(http, API_ROOT_URL),
 * })
 * ```
 *
 * `baseURL` é a raiz do backend: os caminhos do OpenAPI já trazem o prefixo
 * (`/api/...`). A query vai em `params` do axios (valores ausentes somem e
 * listas repetem a chave, `a=1&a=2`) e a operação lança o erro em vez de
 * devolvê-lo: o TanStack Query trata falha pela rejeição.
 */
export function generatedClientConfig(http: AxiosInstance, baseURL: string) {
  return {
    axios: http,
    baseURL: trimSlash(baseURL),
    paramsSerializer: { indexes: null },
    throwOnError: true as const,
  }
}
