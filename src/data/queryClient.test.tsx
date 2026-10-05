import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { create } from 'zustand'
import { ApiError } from './apiError'
import { createHttpClient } from './httpClient'
import {
  clearCacheOnSessionChange,
  createQueryClient,
  resetQueriesAfterError,
  retryUnlessUnauthorized,
} from './queryClient'
import { QueryProvider } from './QueryProvider'
import { createQueryKeys } from './queryKeys'
import { API, server, setupMswServer } from '../test/msw'

setupMswServer()

const projectKeys = createQueryKeys('projects')

function newClient() {
  // Sem espera entre tentativas: o teste conta requisições, não tempo.
  return createQueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
}

function wrapperFor(client = newClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryProvider client={client}>{children}</QueryProvider>
  }
}

describe('createQueryClient', () => {
  it('usa os padrões do agent-package e aceita sobrepor', () => {
    const defaults = createQueryClient().getDefaultOptions()
    expect(defaults.queries).toMatchObject({
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      retry: retryUnlessUnauthorized,
    })
    expect(defaults.mutations?.retry).toBe(false)

    const custom = createQueryClient({ defaultOptions: { queries: { staleTime: 0 } } })
    expect(custom.getDefaultOptions().queries).toMatchObject({ staleTime: 0, gcTime: 300_000 })
  })

  it('retry: uma nova tentativa, nenhuma para 401', () => {
    expect(retryUnlessUnauthorized(0, new ApiError('x', 500))).toBe(true)
    expect(retryUnlessUnauthorized(1, new ApiError('x', 500))).toBe(false)
    expect(retryUnlessUnauthorized(0, new ApiError('x', 401))).toBe(false)
    expect(retryUnlessUnauthorized(0, new Error('rede'))).toBe(true)
  })
})

describe('useQuery com o client HTTP (msw)', () => {
  const http = createHttpClient({ baseURL: API })
  const listProjects = () => http.get<{ id: string }[]>('/projects').then((r) => r.data)

  it('200: entrega o dado', async () => {
    server.use(mock.get(`${API}/projects`, () => HttpResponse.json([{ id: 'p1' }])))
    const { result } = renderHook(
      () => useQuery({ queryKey: projectKeys.list(), queryFn: listProjects }),
      { wrapper: wrapperFor() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'p1' }])
  })

  it('500: tenta de novo uma vez e entrega o ApiError', async () => {
    let calls = 0
    server.use(
      mock.get(`${API}/projects`, () => {
        calls += 1
        return HttpResponse.json({ message: 'Caiu' }, { status: 500 })
      }),
    )
    const { result } = renderHook(
      () => useQuery({ queryKey: projectKeys.list(), queryFn: listProjects }),
      { wrapper: wrapperFor() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls).toBe(2)
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.message).toBe('Caiu')
  })

  it('401: não repete', async () => {
    let calls = 0
    server.use(
      mock.get(`${API}/projects`, () => {
        calls += 1
        return new HttpResponse(null, { status: 401 })
      }),
    )
    const { result } = renderHook(
      () => useQuery({ queryKey: projectKeys.list(), queryFn: listProjects }),
      { wrapper: wrapperFor() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls).toBe(1)
  })

  it('mutation invalida as listas da entidade pelo prefixo', async () => {
    let names = ['A']
    server.use(
      mock.get(`${API}/projects`, () => HttpResponse.json(names.map((id) => ({ id })))),
      mock.post(`${API}/projects`, () => {
        names = [...names, 'B']
        return HttpResponse.json({ id: 'B' }, { status: 201 })
      }),
    )

    function Screen() {
      const qc = useQueryClient()
      const list = useQuery({ queryKey: projectKeys.list({ page: 1 }), queryFn: listProjects })
      const create = useMutation({
        mutationFn: () => http.post('/projects', {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
      })
      return (
        <>
          <p>{list.data?.map((p) => p.id).join(',') ?? '…'}</p>
          <button type="button" onClick={() => create.mutate()}>
            criar
          </button>
        </>
      )
    }

    render(<Screen />, { wrapper: wrapperFor() })
    expect(await screen.findByText('A')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'criar' }).click())
    expect(await screen.findByText('A,B')).toBeInTheDocument()
  })
})

describe('sessão e cache', () => {
  it('clearCacheOnSessionChange esvazia o cache quando o token muda ou some', () => {
    const client = newClient()
    const useSession = create<{ token: string | null }>(() => ({ token: null }))
    const stop = clearCacheOnSessionChange(client, useSession, (s) => s.token)

    useSession.setState({ token: 'a' }) // login: nada a limpar
    client.setQueryData(projectKeys.detail('p1'), { id: 'p1' })
    useSession.setState({ token: 'a' })
    expect(client.getQueryData(projectKeys.detail('p1'))).toEqual({ id: 'p1' })

    useSession.setState({ token: null }) // logout / 401
    expect(client.getQueryData(projectKeys.detail('p1'))).toBeUndefined()

    stop()
  })

  it('resetQueriesAfterError preserva as raízes em keep', async () => {
    const client = newClient()
    client.setQueryData(['auth', 'me'], { id: 'u1' })
    client.setQueryData(projectKeys.detail('p1'), { id: 'p1' })

    await resetQueriesAfterError(client, [['auth']])

    expect(client.getQueryData(['auth', 'me'])).toEqual({ id: 'u1' })
    expect(client.getQueryData(projectKeys.detail('p1'))).toBeUndefined()
  })

  it('QueryProvider sem client cria um com os padrões', () => {
    const { result } = renderHook(() => useQueryClient(), {
      wrapper: ({ children }) => <QueryProvider>{children}</QueryProvider>,
    })
    expect(result.current.getDefaultOptions().queries?.staleTime).toBe(60_000)
  })
})
