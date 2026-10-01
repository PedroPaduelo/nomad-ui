// @nomad/ui/data: a camada de dados do Padrão Frontend Nomad, extraída do
// agent-package (src/api/client.ts, src/lib/queryClient.ts, hooks por feature).
// Levantamento e regras em src/data/README.md.
export {
  ApiError,
  fallbackErrorMessage,
  getErrorMessage,
  isApiError,
  isConflictError,
  isForbiddenError,
  isNetworkError,
  isNotFoundError,
  isUnauthorizedError,
  isValidationError,
} from './apiError'
export {
  createHttpClient,
  DEFAULT_REQUEST_TIMEOUT_MS,
  generatedClientConfig,
  LONG_REQUEST_TIMEOUT_MS,
  REQUEST_ID_HEADER,
  REQUEST_ID_REQUEST_HEADER,
} from './httpClient'
export { defaultIsSessionExpired } from './httpClient'
export type { HeaderSource, HttpClient, HttpClientOptions, UnauthorizedContext } from './httpClient'
export {
  clearCacheOnSessionChange,
  createQueryClient,
  DEFAULT_GC_TIME_MS,
  DEFAULT_STALE_TIME_MS,
  resetQueriesAfterError,
  retryUnlessUnauthorized,
} from './queryClient'
export type { SubscribableStore } from './queryClient'
export { QueryProvider } from './QueryProvider'
export type { QueryProviderProps } from './QueryProvider'
export { createQueryKeys } from './queryKeys'
export type { EntityQueryKeys } from './queryKeys'
export {
  EnvError,
  fieldErrors,
  formatIssues,
  isResponseParseError,
  issuePath,
  parseEnv,
  parseResponse,
  ResponseParseError,
  responseParser,
} from './zod'
export type { Issue, SafeParseSchema } from './zod'
export { createScreenStore } from './screenStore'
export type {
  ScreenSetState,
  ScreenStore,
  ScreenStoreBase,
  ScreenStoreOptions,
} from './screenStore'
export { safeNextPath } from './safeNextPath'
