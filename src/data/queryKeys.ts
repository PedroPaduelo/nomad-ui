import type { QueryKey } from '@tanstack/react-query'

/** Chaves que toda entidade tem, em hierarquia: `all` ⊃ `lists()` ⊃ `list(p)`, `all` ⊃ `details()` ⊃ `detail(id)`. */
export interface EntityQueryKeys<E extends string> {
  /** Raiz da entidade: invalidar `all` refaz listas e detalhes. */
  all: readonly [E]
  /** Todas as listas (qualquer filtro). */
  lists: () => readonly [E, 'list']
  /** Uma lista com filtros/paginação; `params` entra na chave. */
  list: <P = undefined>(params?: P) => readonly [E, 'list', P | undefined]
  /** Todos os detalhes. */
  details: () => readonly [E, 'detail']
  /** Um item. */
  detail: (id: string | number) => readonly [E, 'detail', string | number]
}

/**
 * Fábrica de query keys por entidade, a convenção do agent-package
 * (`projectKeys`, `taskKeys`, `memoryKeys`...): uma raiz com o nome da
 * entidade e as chaves derivadas dela, para que a invalidação depois de uma
 * mutation acerte por prefixo.
 *
 * ```ts
 * export const projectKeys = createQueryKeys('projects', (keys) => ({
 *   deletePreview: (id: string) => [...keys.all, 'delete-preview', id] as const,
 * }))
 * projectKeys.detail(id)                                  // ['projects', 'detail', id]
 * qc.invalidateQueries({ queryKey: projectKeys.all })     // listas e detalhes
 * qc.invalidateQueries({ queryKey: projectKeys.lists() }) // só as listas
 * ```
 *
 * Chaves de uma entidade filha começam pela chave do pai
 * (`[...taskKeys.detail(id), 'decisions']`): invalidar o pai leva junto.
 */
export function createQueryKeys<
  const E extends string,
  X extends Record<string, QueryKey | ((...args: never[]) => QueryKey)> = Record<never, never>,
>(entity: E, extend?: (keys: EntityQueryKeys<E>) => X): EntityQueryKeys<E> & X {
  const all = [entity] as const
  const keys: EntityQueryKeys<E> = {
    all,
    lists: () => [entity, 'list'] as const,
    list: <P = undefined>(params?: P) => [entity, 'list', params] as const,
    details: () => [entity, 'detail'] as const,
    detail: (id: string | number) => [entity, 'detail', id] as const,
  }
  return { ...keys, ...(extend?.(keys) ?? ({} as X)) }
}
