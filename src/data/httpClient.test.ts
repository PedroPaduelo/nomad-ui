import { http as mock, HttpResponse } from 'msw'
import { ApiError, isNetworkError, isNotFoundError, isUnauthorizedError } from './apiError'
import { createHttpClient, generatedClientConfig } from './httpClient'
import { API, server, setupMswServer } from '../test/msw'

setupMswServer()

function setup(token: string | null = 'tok-1') {
  const session = { token }
  const onUnauthorized = vi.fn()
  const onResponse = vi.fn()
  const onNetworkError = vi.fn()
  const client = createHttpClient({
    baseURL: `${API}/`,
    getToken: () => session.token,
    onUnauthorized,
    onResponse,
    onNetworkError,
  })
  return { client, session, onUnauthorized, onResponse, onNetworkError }
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('era para falhar')
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('createHttpClient', () => {
  it('200: devolve o corpo, manda o Bearer e guarda o x-request-id', async () => {
    let auth: string | null = null
    server.use(
      mock.get(`${API}/projects`, ({ request }) => {
        auth = request.headers.get('authorization')
        return HttpResponse.json(
          { items: [{ id: 'p1' }] },
          { headers: { 'x-request-id': 'req-200' } },
        )
      }),
    )
    const { client, onResponse } = setup()

    const response = await client.get<{ items: { id: string }[] }>('/projects')

    expect(response.data.items[0].id).toBe('p1')
    expect(auth).toBe('Bearer tok-1')
    expect(client.getLastRequestId()).toBe('req-200')
    expect(onResponse).toHaveBeenCalledWith(200)
  })

  it('não manda o token para outro host nem com skipAuth', async () => {
    const seen: (string | null)[] = []
    server.use(
      mock.get('http://outro.test/x', ({ request }) => {
        seen.push(request.headers.get('authorization'))
        return HttpResponse.json({})
      }),
      mock.post(`${API}/auth/login`, ({ request }) => {
        seen.push(request.headers.get('authorization'))
        return HttpResponse.json({ token: 'novo' })
      }),
    )
    const { client } = setup()

    await client.get('http://outro.test/x')
    await client.post('/auth/login', {}, { skipAuth: true })

    expect(seen).toEqual([null, null])
  })

  it('erro: mensagem do corpo, details e requestId (problem+json)', async () => {
    server.use(
      mock.post(`${API}/projects`, () =>
        HttpResponse.json(
          {
            error: 'ValidationError',
            message: 'Nome obrigatório',
            details: { name: 'required' },
            errorId: 'e-1',
          },
          { status: 422 },
        ),
      ),
    )
    const { client, onUnauthorized } = setup()

    const error = await rejection(client.post('/projects', {}))

    expect(error.status).toBe(422)
    expect(error.message).toBe('Nome obrigatório')
    expect(error.details).toEqual({ name: 'required' })
    expect(error.requestId).toBe('e-1')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('erro sem mensagem: texto do status em pt-BR', async () => {
    server.use(
      mock.get(`${API}/missing`, () => new HttpResponse(null, { status: 404 })),
      mock.get(`${API}/boom`, () =>
        HttpResponse.json({ detail: 'Falha no banco' }, { status: 500 }),
      ),
    )
    const { client } = setup()

    const notFound = await rejection(client.get('/missing'))
    expect(notFound.message).toBe('Não encontrado.')
    expect(isNotFoundError(notFound)).toBe(true)

    const boom = await rejection(client.get('/boom'))
    expect(boom.message).toBe('Falha no banco')
  })

  it('401 com o token atual: chama onUnauthorized uma vez', async () => {
    server.use(
      mock.get(`${API}/me`, () =>
        HttpResponse.json({ message: 'Token expirado' }, { status: 401 }),
      ),
    )
    const { client, onUnauthorized } = setup()

    const error = await rejection(client.get('/me'))

    expect(isUnauthorizedError(error)).toBe(true)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith({ error, sentToken: 'tok-1' })
  })

  it('401 de um token anterior ou de rota skipAuth não derruba a sessão', async () => {
    server.use(
      mock.get(`${API}/me`, () => new HttpResponse(null, { status: 401 })),
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: 'Senha errada' }, { status: 401 }),
      ),
    )
    const { client, session, onUnauthorized } = setup()

    const pending = client.get('/me', { headers: { Authorization: 'Bearer tok-velho' } })
    session.token = 'tok-2'
    await rejection(pending)
    const login = await rejection(client.post('/auth/login', {}, { skipAuth: true }))

    expect(login.message).toBe('Senha errada')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('401 em sessão por cookie (sem getToken): sempre chama onUnauthorized', async () => {
    server.use(mock.get(`${API}/me`, () => new HttpResponse(null, { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ baseURL: API, withCredentials: true, onUnauthorized })

    const error = await rejection(client.get('/me'))

    expect(error.message).toBe('Sua sessão expirou. Entre de novo.')
    expect(onUnauthorized).toHaveBeenCalledWith({ error, sentToken: null })
  })

  it('sem resposta: ApiError sem status e onNetworkError', async () => {
    server.use(mock.get(`${API}/down`, () => HttpResponse.error()))
    const { client, onNetworkError } = setup()

    const error = await rejection(client.get('/down'))

    expect(error.status).toBeUndefined()
    expect(error.code).toBe('ERR_NETWORK')
    expect(error.message).toBe('Sem conexão com o servidor.')
    expect(isNetworkError(error)).toBe(true)
    expect(onNetworkError).toHaveBeenCalledWith(error)
  })

  it('HTML onde se espera JSON vira erro na hora', async () => {
    server.use(mock.get(`${API}/spa`, () => HttpResponse.html('<!doctype html><html></html>')))
    const { client } = setup()

    const error = await rejection(client.get('/spa'))

    expect(error.status).toBe(200)
    expect(error.message).toMatch(/HTML em vez de JSON/)
  })

  it('generatedClientConfig liga o client gerado à mesma instância', () => {
    const { client } = setup()
    expect(generatedClientConfig(client, 'http://api.test/')).toEqual({
      axios: client,
      baseURL: 'http://api.test',
      paramsSerializer: { indexes: null },
      throwOnError: true,
    })
  })
})
