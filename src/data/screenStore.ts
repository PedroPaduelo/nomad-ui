import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

/**
 * Papel do Zustand no Padrão Frontend Nomad (regra do agent-package: "dados
 * do servidor só no TanStack Query; Zustand só para estado de UI"):
 *
 * - SIM: estado de TELA e preferências do usuário — tema, menu recolhido,
 *   painel aberto, modo de visualização (lista/quadro), rascunho de
 *   formulário, seleção, toasts, o token da sessão.
 * - NÃO: nada que veio do servidor (listas, detalhes, o usuário da sessão,
 *   contagens). Isso é cache do TanStack Query, com chave, invalidação e
 *   `staleTime`; copiar para um store cria uma segunda verdade que envelhece.
 *   O store guarda no máximo o ID selecionado; o dado vem de `useX(id)`.
 * - Estado que cabe na URL (filtro, aba, página, item aberto) mora na URL.
 */

/** Ações que todo store de tela ganha. */
export interface ScreenStoreBase<S> {
  /** Volta ao estado inicial (ao sair da tela, ao trocar de sessão). */
  reset: () => void
  /** Troca parte do estado. */
  patch: (partial: Partial<S>) => void
}

export type ScreenStore<S, A> = S & A & ScreenStoreBase<S>

export interface ScreenStoreOptions<S> {
  /**
   * Guarda no storage só as chaves listadas (preferências: tema, menu
   * recolhido, modo de visualização). Estado transitório nunca é persistido.
   */
  persist?: {
    /** Chave no storage (use o prefixo do app: `agentpack:ui`). */
    name: string
    keys: readonly (keyof S)[]
    /** Padrão: `localStorage`. */
    storage?: StateStorage
    version?: number
  }
}

/** `set` que as ações recebem: troca parte do estado de tela. */
export type ScreenSetState<S> = (partial: Partial<S> | ((state: S) => Partial<S>)) => void

type SetState<T> = StoreApi<T>['setState']
type GetState<T> = StoreApi<T>['getState']

/**
 * Store Zustand para estado de tela, com `reset()` e `patch()` prontos.
 *
 * ```ts
 * export const useBoardView = createScreenStore(
 *   { mode: 'list' as 'list' | 'board', selectedId: null as string | null },
 *   (set) => ({ select: (selectedId: string | null) => set({ selectedId }) }),
 *   { persist: { name: 'meuapp:board-view', keys: ['mode'] } },
 * )
 * const mode = useBoardView((s) => s.mode)
 * ```
 */
export function createScreenStore<S extends object, A extends object = Record<never, never>>(
  initialState: S,
  actions?: (set: ScreenSetState<S>, get: () => S & ScreenStoreBase<S>) => A,
  options: ScreenStoreOptions<S> = {},
): UseBoundStore<StoreApi<ScreenStore<S, A>>> {
  type T = ScreenStore<S, A>
  const creator = (set: SetState<T>, get: GetState<T>): T => ({
    ...initialState,
    ...(actions?.(set as ScreenSetState<S>, get) ?? ({} as A)),
    reset: () => set({ ...initialState } as Partial<T>),
    patch: (partial) => set(partial as Partial<T>),
  })

  const persisted = options.persist
  if (!persisted) return create<T>()(creator)

  return create<T>()(
    persist(creator, {
      name: persisted.name,
      version: persisted.version,
      storage: createJSONStorage(() => persisted.storage ?? window.localStorage),
      partialize: (state) =>
        Object.fromEntries(persisted.keys.map((key) => [key, state[key]])) as Partial<T>,
    }),
  ) as unknown as UseBoundStore<StoreApi<T>>
}
