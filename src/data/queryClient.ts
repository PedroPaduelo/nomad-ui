import { QueryClient, type QueryClientConfig, type QueryKey } from '@tanstack/react-query'
import { ApiError } from './apiError'

/** Dado fresco por 1 minuto: navegar entre telas não refaz a busca. */
export const DEFAULT_STALE_TIME_MS = 60_000
/** Cache sem observador vive 5 minutos. */
export const DEFAULT_GC_TIME_MS = 5 * 60_000

/**
 * Uma nova tentativa para falha transitória; nenhuma para 401: a sessão
 * acabou, o app já está levando ao login e repetir só dobra o tráfego
 * recusado.
 */
export function retryUnlessUnauthorized(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status === 401) return false
  return failureCount < 1
}

/**
 * QueryClient com os padrões do agent-package (`src/lib/queryClient.ts`):
 * `staleTime` 1 min, `gcTime` 5 min, 1 nova tentativa (nunca em 401) e sem
 * refetch ao voltar o foco para a janela. Mutations não repetem (padrão do
 * TanStack, explícito aqui).
 *
 * `config` sobrepõe os padrões campo a campo (`defaultOptions.queries` e
 * `defaultOptions.mutations` são mesclados, não substituídos).
 */
export function createQueryClient(config: QueryClientConfig = {}): QueryClient {
  const { defaultOptions, ...rest } = config
  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...defaultOptions,
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        retry: retryUnlessUnauthorized,
        refetchOnWindowFocus: false,
        ...defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...defaultOptions?.mutations,
      },
    },
  })
}

/** Loja com `subscribe(listener(estado, anterior))`, como a do Zustand. */
export interface SubscribableStore<S> {
  subscribe: (listener: (state: S, previous: S) => void) => () => void
}

/**
 * Esvazia o cache sempre que a sessão termina ou troca de dono (logout, 401,
 * login de outra pessoa em outra aba): nada que a identidade anterior leu
 * pode aparecer para a próxima. `identityOf` devolve o que identifica a
 * sessão (token, id do usuário, organização ativa); `null` = sem sessão.
 * Devolve a função que desliga.
 *
 * ```ts
 * clearCacheOnSessionChange(queryClient, useSessionStore, (s) => s.token)
 * ```
 */
export function clearCacheOnSessionChange<S>(
  queryClient: QueryClient,
  store: SubscribableStore<S>,
  identityOf: (state: S) => unknown,
): () => void {
  return store.subscribe((state, previous) => {
    const before = identityOf(previous)
    if (before !== null && before !== undefined && identityOf(state) !== before) queryClient.clear()
  })
}

/**
 * "Tentar de novo" das telas de erro: descarta o cache que provavelmente
 * causou o erro (dado em formato inesperado) e refaz as buscas, MENOS as
 * raízes em `keep` (ex.: a sessão, `['auth']`): zerar a sessão trocaria o app
 * inteiro pelo spinner até ela voltar.
 */
export function resetQueriesAfterError(
  queryClient: QueryClient,
  keep: readonly QueryKey[] = [],
): Promise<void> {
  return queryClient.resetQueries({
    predicate: (query) => !keep.some((root) => root.every((part, i) => query.queryKey[i] === part)),
  })
}
