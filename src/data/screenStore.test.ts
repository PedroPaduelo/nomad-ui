import { createScreenStore } from './screenStore'
import { safeNextPath } from './safeNextPath'

describe('createScreenStore', () => {
  it('tem ações próprias, patch e reset', () => {
    const useView = createScreenStore(
      { mode: 'list' as 'list' | 'board', selectedId: null as string | null },
      (set) => ({ select: (selectedId: string | null) => set({ selectedId }) }),
    )
    useView.getState().select('t1')
    useView.getState().patch({ mode: 'board' })
    expect(useView.getState()).toMatchObject({ mode: 'board', selectedId: 't1' })

    useView.getState().reset()
    expect(useView.getState()).toMatchObject({ mode: 'list', selectedId: null })
  })

  it('persiste só as chaves listadas', () => {
    window.localStorage.clear()
    const useView = createScreenStore({ mode: 'list', draft: '' }, undefined, {
      persist: { name: 'teste:view', keys: ['mode'] },
    })
    useView.getState().patch({ mode: 'board', draft: 'rascunho' })

    const stored = JSON.parse(window.localStorage.getItem('teste:view') ?? '{}') as {
      state: Record<string, unknown>
    }
    expect(stored.state).toEqual({ mode: 'board' })
  })
})

describe('safeNextPath', () => {
  const origin = 'http://app.test'

  it('aceita caminho interno com query e hash', () => {
    expect(safeNextPath('/projects/1?tab=a#x', { origin })).toBe('/projects/1?tab=a#x')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/\t/evil.com', '', null, 'projects'])(
    'recusa %j',
    (raw) => {
      expect(safeNextPath(raw, { origin })).toBe('/')
    },
  )

  it('o próprio login vira a home', () => {
    expect(safeNextPath('/login?next=/x', { origin, loginPath: '/login' })).toBe('/')
  })
})
