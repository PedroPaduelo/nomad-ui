import { QueryClient } from '@tanstack/react-query'
import { createQueryKeys } from './queryKeys'

describe('createQueryKeys', () => {
  const taskKeys = createQueryKeys('tasks', (keys) => ({
    decisions: (taskId: string) => [...keys.detail(taskId), 'decisions'] as const,
    board: ['tasks', 'board'] as const,
  }))

  it('monta as chaves em hierarquia a partir da entidade', () => {
    expect(taskKeys.all).toEqual(['tasks'])
    expect(taskKeys.lists()).toEqual(['tasks', 'list'])
    expect(taskKeys.list({ status: 'todo' })).toEqual(['tasks', 'list', { status: 'todo' }])
    expect(taskKeys.details()).toEqual(['tasks', 'detail'])
    expect(taskKeys.detail('t1')).toEqual(['tasks', 'detail', 't1'])
    expect(taskKeys.decisions('t1')).toEqual(['tasks', 'detail', 't1', 'decisions'])
    expect(taskKeys.board).toEqual(['tasks', 'board'])
  })

  it('invalidar a raiz ou o pai acerta os filhos pelo prefixo', async () => {
    const client = new QueryClient()
    client.setQueryData(taskKeys.list({ page: 1 }), [])
    client.setQueryData(taskKeys.detail('t1'), {})
    client.setQueryData(taskKeys.decisions('t1'), [])
    client.setQueryData(['projects', 'list'], [])

    await client.invalidateQueries({ queryKey: taskKeys.detail('t1') })
    expect(client.getQueryState(taskKeys.decisions('t1'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(taskKeys.list({ page: 1 }))?.isInvalidated).toBe(false)

    await client.invalidateQueries({ queryKey: taskKeys.all })
    expect(client.getQueryState(taskKeys.list({ page: 1 }))?.isInvalidated).toBe(true)
    expect(client.getQueryState(['projects', 'list'])?.isInvalidated).toBe(false)
  })
})
