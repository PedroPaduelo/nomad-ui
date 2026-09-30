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
    /**
     * Mesmo autenticado, não dispara `onUnauthorized` neste 401: usado pelo
     * refresh do token (uma chamada interna que decide a sessão, não pede).
     * Recebe `getToken`/`skipAuth`/`headers`, etc. normalmente.
     */
    skipSessionExpiry?: boolean
    /**
     * `X-Request-Id` desta requisição (o backend devolve o mesmo valor em
     * `x-request-id`; é o código para suporte que a tela de erro mostra).
     * Vazio/não-string = sem correlation id.
     */
    requestId?: string
    /**
     * Quando o cliente tenta de novo por conta própria após `refreshSession`,
     * a retried tem `__retried: true` para não entrar em loop (refresh
     * falhou → 401 → refresh de novo é reentrada).
     */
    __retried?: boolean
    /** Marca de "já rodei o `getHeaders`/`getToken` neste config" para a retry não duplicar. */
    getHeadersUsed?: boolean
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

/** Cabeçalho que o app envia para correlacionar a resposta (espelha `x-request-id`). */
export const REQUEST_ID_REQUEST_HEADER = 'X-Request-Id'

/** O que o `onUnauthorized` recebe (só chamado quando não há auto-refresh). */
export interface UnauthorizedContext {
  /** O erro já normalizado (status 401). */
  error: ApiError
  /** Token Bearer que a requisição levou (`null` quando não levou). */
  sentToken: string | null
}

/** Cabeçalhos extras que o app injeta em cada requisição (CSRF, versionamento, etc.). */
export type HeaderSource = () => Record<string, string> | Promise<Record<string, string>>

export interface HttpClientOptions {
  /** URL base da API (ex.: `https://api.exemplo.com/api`), sem barra no fim. */
  baseURL: string
  /**
   * Token da sessão para o `Authorization: Bearer`. Lido a cada requisição,
   * síncrono ou assíncrono (Conta: access token em memória, sem cookie):
   * `async () => session.accessToken`. Sem ele, nenhum Bearer é enviado
   * (sessão por cookie: use `withCredentials`).
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>
  /**
   * Cabeçalhos extras para cada requisição (CSRF, versão do app, etc.). Os
   * nomes já vão normalizados em maiúsculas; os fixos de `options.headers`
   * entram aqui também (com prioridade sobre o default).
   *
   * ```ts
   * getHeaders: () => ({ 'X-CSRF-Token': readCookie('csrf') })
   * ```
   */
  getHeaders?: HeaderSource
  /**
   * Renova a sessão após um 401 (Conta: refresh do access token). Chamado no
   * MÁXIMO uma vez por 401 que carrega o token ATUAL: a próxima tentativa da
   * MESMA requisição repete a chamada com o token novo. Concorrentes do
   * mesmo refresh entram em fila (single-flight) para não bater no IdP 5×.
   *
   * Lançar aqui significa "refresh falhou" — o `onUnauthorized` recebe o 401
   * original. Devolver `Promise<void>` resolvida = repetir a requisição.
   */
  refreshSession?: () => Promise<void>
  /**
   * Sessão vencida (401) sem auto-refresh, ou após um refresh que falhou.
   * Nunca para requisição `skipAuth` ou `skipSessionExpiry`. Com `getToken`,
   * só quando a requisição levou o token ATUAL: um 401 de uma chamada feita
   * com o token anterior (a pessoa já entrou de novo) não derruba o login
   * novo. Sem `getToken` (sessão por cookie), só quando a chamada NÃO levou
   * `Authorization` próprio — credencial própria é de outro mecanismo, e o 401
   * não é da nossa sessão. Encerre a sessão aqui (o guard de rotas leva ao
   * login) ou redirecione para o login da Conta.
   */
  onUnauthorized?: (context: UnauthorizedContext) => void
  /** Chamado a cada resposta HTTP (sucesso ou erro): prova de que o backend está de pé. */
  onResponse?: (status: number) => void
  /** Chamado quando a requisição não recebeu resposta (ERR_NETWORK): o backend pode ter caiu. */
  onNetworkError?: (error: ApiError) => void
  /** Prazo padrão das requisições (ms). */
  timeout?: number
  /** Envia cookies em chamadas da MESMA origem/baseURL (sessão por cookie). */
  withCredentials?: boolean
  /**
   * Opt-in explícito para enviar o cookie de sessão em chamadas de **outra
   * origem** (`https://outro.test/…`, `//outro.test/…`). Sem esta flag, o
   * cookie da sessão só vai para a mesma origem/baseURL do client — é o padrão
   * seguro: nunca vaza a credencial para um host que não é a sua API. Use só
   * se a sua API lega vive em outro host e você confia nele.
   */
  withCredentialsCrossOrigin?: boolean
  /** Cabeçalhos fixos extras (enviados em toda requisição). */
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
  if (typeof detail === 'string' && detail) return detail
  return undefined
}

/** Pega o valor de um cabeçalho, seja ele `AxiosHeaders` ou um objeto simples. */
function headerValue(
  config: InternalAxiosRequestConfig | AxiosRequestConfig | undefined,
  name: string,
): string | undefined {
  const headers = config?.headers as
    { get?: (n: string) => unknown } | Record<string, unknown> | undefined
  if (!headers) return undefined
  if (typeof (headers as { get?: unknown }).get === 'function') {
    const value = (headers as { get: (n: string) => unknown }).get(name)
    return typeof value === 'string' && value ? value : undefined
  }
  const raw =
    (headers as Record<string, unknown>)[name] ??
    (headers as Record<string, unknown>)[name.toLowerCase()]
  return typeof raw === 'string' && raw ? raw : undefined
}

/** Sinal para o interceptor de resposta: "não me processe, já tentei outra vez". */
const RETRIED = '__retried'

/**
 * Cliente HTTP da API (axios), igual ao `src/api/client.ts` do agent-package,
 * sem nada do produto:
 *
 * - `Authorization: Bearer <getToken()>` só para URLs do próprio backend (uma
 *   URL absoluta de outro host nunca leva o token), salvo `skipAuth` ou quando
 *   quem chama já mandou a própria credencial. `getToken` pode ser assíncrono.
 * - `X-Request-Id` por requisição (`requestId: 'uuid-…'` na chamada, ou
 *   `getHeaders` para um valor global). O backend devolve o mesmo valor em
 *   `x-request-id` (ou `errorId` no corpo); o `ApiError.requestId` carrega.
 * - Cabeçalhos extras por requisição via `getHeaders` (CSRF, etc.).
 * - Resposta HTML onde se espera JSON (build sem a URL da API caindo no
 *   fallback de SPA) vira erro na hora, em vez de falhar longe dali.
 * - 401 → opcionalmente `refreshSession()` (single-flight) e repete a
 *   requisição uma vez. Sem refresh, ou com refresh que falhou, o 401 vai
 *   para `onUnauthorized` (sessão vencida).
 * - `skipSessionExpiry: true` em uma chamada que decide a sessão (o próprio
 *   refresh): o 401 não dispara `onUnauthorized` e não entra em refresh.
 * - `onResponse`/`onNetworkError` ligam o monitor de conectividade do app
 *   (agent-package: pausa queries/mutations enquanto o backend está fora).
 *
 * A MESMA instância é o `axios` do client gerado pelo `@hey-api/openapi-ts`
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
  let refreshInFlight: Promise<void> | null = null

  const isBackendUrl = (url: string | undefined): boolean => {
    if (!url || !/^([a-z][a-z\d+.-]*:)?\/\//i.test(url)) return true
    return url === baseURL || url.startsWith(`${baseURL}/`) || url.startsWith(`${baseURL}?`)
  }

  const remember = (response: AxiosResponse | undefined): string | undefined => {
    const id = requestIdOf(response)
    if (id) lastRequestId = id
    return id
  }

  /**
   * Tenta uma vez mais a mesma requisição: o token já mudou (refresh
   * rodou), o corpo não. O axios pega a config e refaz com a mesma URL/body.
   */
  function retry(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
    config[RETRIED] = true
    delete config.getHeadersUsed
    delete config.headers.Authorization
    return instance.request(config)
  }

  instance.interceptors.request.use(async (config) => {
    if (config.getHeadersUsed) return config
    config.getHeadersUsed = true
    // Mesmo com `withCredentials: true` no client, o cookie da sessão só vai
    // para a mesma origem/baseURL — nunca para URL absoluta de outro host.
    // O opt-in explícito é `withCredentialsCrossOrigin: true`.
    if (options.withCredentials) {
      config.withCredentials = isBackendUrl(config.url) || !!options.withCredentialsCrossOrigin
    }
    const token = options.getToken ? await options.getToken() : undefined
    if (
      token &&
      !config.skipAuth &&
      isBackendUrl(config.url) &&
      !headerValue(config, 'Authorization')
    ) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    if (options.getHeaders) {
      const extra = await options.getHeaders()
      for (const [name, value] of Object.entries(extra)) {
        if (typeof value === 'string' && value) config.headers.set(name, value)
      }
    }
    if (typeof config.requestId === 'string' && config.requestId) {
      config.headers.set(REQUEST_ID_REQUEST_HEADER, config.requestId)
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
    async (error: unknown) => {
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

      // 401 do que o client considera "a sessão atual":
      // - A URL é do nosso backend (mesmo origin/baseURL); E
      // - O token enviado (se `getToken`) bate com o atual; ou
      //   não temos `getToken` (sessão por cookie) e a chamada NÃO levou
      //   `Authorization` próprio (credencial própria é outro mecanismo).
      // Chamar `evil.example` com 401, ou um 401 de uma chamada com
      // `Authorization` próprio num client de cookie, não é "sua sessão
      // expirou" — não pode disparar refresh nem `onUnauthorized`.
      const sentToken = bearerOf(error.config)
      const sentOwnAuth = sentToken !== null
      const backendCall = isBackendUrl(error.config?.url)
      const current = options.getToken ? await options.getToken() : null
      const isCurrentSession =
        backendCall &&
        (options.getToken ? sentToken !== null && sentToken === current : !sentOwnAuth)

      if (
        status === 401 &&
        options.refreshSession &&
        isCurrentSession &&
        !error.config?.skipAuth &&
        !error.config?.skipSessionExpiry &&
        !error.config?.[RETRIED]
      ) {
        refreshInFlight ??= options.refreshSession().finally(() => {
          refreshInFlight = null
        })
        try {
          await refreshInFlight
          // Reinterceptor cobre o Bearer novo do getToken() e refaz
          // getHeaders (CSRF pode ter virado outra vez).
          return retry(error.config as InternalAxiosRequestConfig)
        } catch {
          // Refresh falhou: cai no `onUnauthorized` abaixo.
        }
      }

      if (status === 401 && options.onUnauthorized && isCurrentSession && !error.config?.skipSessionExpiry) {
        options.onUnauthorized({ error: apiError, sentToken })
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
