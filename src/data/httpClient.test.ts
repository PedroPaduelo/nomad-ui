import { http as mock, HttpResponse } from 'msw'
import type { AxiosAdapter } from 'axios'
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

  it('getToken assíncrono (Conta: access token em memória) é esperado pelo interceptor', async () => {
    let calls = 0
    let auth: string | null = null
    server.use(
      mock.get(`${API}/me`, ({ request }) => {
        calls += 1
        auth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'u1' })
      }),
    )
    const client = createHttpClient({
      baseURL: API,
      getToken: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return 'async-tok'
      },
    })

    const response = await client.get('/me')

    expect(response.data).toEqual({ id: 'u1' })
    expect(calls).toBe(1)
    expect(auth).toBe('Bearer async-tok')
  })

  it('getHeaders injeta cabeçalhos extras (CSRF, versão…) em cada requisição', async () => {
    const seen: Array<Record<string, string>> = []
    server.use(
      mock.get(`${API}/x`, ({ request }) => {
        seen.push({
          'x-csrf-token': request.headers.get('x-csrf-token') ?? '',
          'x-app-version': request.headers.get('x-app-version') ?? '',
        })
        return HttpResponse.json({})
      }),
    )
    const client = createHttpClient({
      baseURL: API,
      getHeaders: () => ({ 'X-CSRF-Token': 'csrf-1', 'X-App-Version': '1.2.3' }),
    })

    await client.get('/x')
    await client.get('/x')

    expect(seen).toEqual([
      { 'x-csrf-token': 'csrf-1', 'x-app-version': '1.2.3' },
      { 'x-csrf-token': 'csrf-1', 'x-app-version': '1.2.3' },
    ])
  })

  it('requestId por requisição vai no X-Request-Id e volta no x-request-id', async () => {
    let sent: string | null = null
    server.use(
      mock.get(`${API}/me`, ({ request }) => {
        sent = request.headers.get('x-request-id')
        return HttpResponse.json({}, { headers: { 'x-request-id': 'corr-1' } })
      }),
    )
    const { client } = setup()
    await client.get('/me', { requestId: 'corr-1' })

    expect(sent).toBe('corr-1')
    expect(client.getLastRequestId()).toBe('corr-1')
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

  it('401 com o token atual: chama onUnauthorized uma vez (sem refresh)', async () => {
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

  it('skipSessionExpiry: 401 não dispara onUnauthorized (a chamada decide a sessão)', async () => {
    server.use(mock.get(`${API}/internal`, () => new HttpResponse(null, { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ baseURL: API, getToken: () => 'tok-1', onUnauthorized })

    const error = await rejection(client.get('/internal', { skipSessionExpiry: true }))

    expect(error.message).toBe('Sua sessão expirou. Entre de novo.')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('refreshSession: 401 do token atual → refresh → repete a requisição uma vez', async () => {
    let calls = 0
    let auth: string | null = null
    server.use(
      mock.get(`${API}/me`, ({ request }) => {
        calls += 1
        auth = request.headers.get('authorization')
        if (calls === 1) return HttpResponse.json({ message: 'expirado' }, { status: 401 })
        return HttpResponse.json({ id: 'u1' })
      }),
    )
    const onUnauthorized = vi.fn()
    const session = { token: 'tok-1' }
    const refresh = vi.fn().mockImplementation(async () => {
      session.token = 'tok-2'
    })
    const client = createHttpClient({
      baseURL: API,
      getToken: () => session.token,
      onUnauthorized,
      refreshSession: refresh,
    })

    const response = await client.get('/me')

    expect(response.status).toBe(200)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(auth).toBe('Bearer tok-2')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('refreshSession: single-flight — 5 chamadas simultâneas batem no refresh uma vez só', async () => {
    let calls = 0
    let resolveRefresh!: () => void
    let refreshCalls = 0
    server.use(
      mock.get(`${API}/me`, () => {
        calls += 1
        if (calls <= 5) return HttpResponse.json({ message: 'expirado' }, { status: 401 })
        return HttpResponse.json({ id: 'u1' })
      }),
    )
    const client = createHttpClient({
      baseURL: API,
      getToken: () => 'tok-1',
      refreshSession: async () => {
        refreshCalls += 1
        await new Promise<void>((r) => {
          resolveRefresh = r
        })
      },
    })

    const pending = Promise.all(Array.from({ length: 5 }, () => client.get('/me')))
    await new Promise((r) => setTimeout(r, 10))
    resolveRefresh()
    await pending

    expect(refreshCalls).toBe(1)
    expect(calls).toBe(10) // 5 iniciais + 5 retries
  })

  it('refreshSession falha → cai no onUnauthorized com o 401 original', async () => {
    server.use(
      mock.get(`${API}/me`, () => HttpResponse.json({ message: 'expirado' }, { status: 401 })),
    )
    const onUnauthorized = vi.fn()
    const client = createHttpClient({
      baseURL: API,
      getToken: () => 'tok-1',
      onUnauthorized,
      refreshSession: async () => {
        throw new Error('refresh off')
      },
    })

    const error = await rejection(client.get('/me'))

    expect(error.message).toBe('expirado')
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('refreshSession: 401 de um token VELHO (não atual) não dispara refresh nem onUnauthorized', async () => {
    server.use(mock.get(`${API}/me`, () => new HttpResponse(null, { status: 401 })))
    const refresh = vi.fn()
    const onUnauthorized = vi.fn()
    const session = { token: 'tok-2' }
    const client = createHttpClient({
      baseURL: API,
      getToken: () => session.token,
      refreshSession: refresh,
      onUnauthorized,
    })

    const pending = client.get('/me', { headers: { Authorization: 'Bearer tok-velho' } })
    await rejection(pending)

    expect(refresh).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('refreshSession não roda em chamadas skipAuth nem skipSessionExpiry', async () => {
    server.use(
      mock.get(`${API}/login-check`, () =>
        HttpResponse.json({ message: 'senha errada' }, { status: 401 }),
      ),
      mock.post(`${API}/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    const refresh = vi.fn()
    const onUnauthorized = vi.fn()
    const client = createHttpClient({
      baseURL: API,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized,
    })

    const login = await rejection(client.get('/login-check', { skipAuth: true }))
    const refreshCall = await rejection(client.post('/refresh', {}, { skipSessionExpiry: true }))

    expect(login.message).toBe('senha errada')
    expect(refreshCall.message).toBe('Sua sessão expirou. Entre de novo.')
    expect(refresh).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('401 de uma sessão por cookie (sem getToken): onUnauthorized sempre', async () => {
    server.use(mock.get(`${API}/me`, () => new HttpResponse(null, { status: 401 })))
    const onUnauthorized = vi.fn()
    const client = createHttpClient({ baseURL: API, withCredentials: true, onUnauthorized })

    const error = await rejection(client.get('/me'))

    expect(error.message).toBe('Sua sessão expirou. Entre de novo.')
    expect(onUnauthorized).toHaveBeenCalledWith({ error, sentToken: null })
  })

  it('withCredentials: cookie NÃO vai para URL absoluta de outro host (mesma origem segura por padrão)', async () => {
    const captured: Array<{ url: string; withCredentials: boolean | undefined }> = []
    const adapter: AxiosAdapter = async (config) => {
      captured.push({ url: config.url ?? '', withCredentials: config.withCredentials })
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never,
      }
    }
    const client = createHttpClient({
      baseURL: `${API}/`,
      withCredentials: true,
      axios: { adapter },
    })

    await client.get('https://evil.example/steal')
    await client.get('//evil.example/steal')
    await client.get('/me')
    await client.get('http://api.test/api/me')

    expect(captured).toEqual([
      { url: 'https://evil.example/steal', withCredentials: false },
      { url: '//evil.example/steal', withCredentials: false },
      { url: '/me', withCredentials: true },
      { url: 'http://api.test/api/me', withCredentials: true },
    ])
  })

  it('withCredentials: opt-in explícito via withCredentialsCrossOrigin para chamadas cross-host com cookie', async () => {
    const captured: Array<{ url: string; withCredentials: boolean | undefined }> = []
    const adapter: AxiosAdapter = async (config) => {
      captured.push({ url: config.url ?? '', withCredentials: config.withCredentials })
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never,
      }
    }
    const client = createHttpClient({
      baseURL: `${API}/`,
      withCredentials: true,
      withCredentialsCrossOrigin: true,
      axios: { adapter },
    })

    await client.get('https://other.example/x')

    expect(captured).toEqual([{ url: 'https://other.example/x', withCredentials: true }])
  })

  it('401 com credencial própria (Authorization explícito) e sessão por cookie NÃO dispara onUnauthorized', async () => {
    const sentHeaders: Array<Record<string, string>> = []
    server.use(
      mock.get(`${API}/internal`, ({ request }) => {
        sentHeaders.push({
          authorization: request.headers.get('authorization') ?? '',
          cookie: request.headers.get('cookie') ?? '',
        })
        return HttpResponse.json({ message: 'api key revogada' }, { status: 401 })
      }),
    )
    const onUnauthorized = vi.fn()
    const client = createHttpClient({
      baseURL: API,
      withCredentials: true,
      onUnauthorized,
    })

    const error = await rejection(
      client.get('/internal', { headers: { Authorization: 'Bearer apk_revogada' } }),
    )

    expect(error.status).toBe(401)
    expect(onUnauthorized).not.toHaveBeenCalled()
    expect(sentHeaders).toEqual([{ authorization: 'Bearer apk_revogada', cookie: '' }])
  })

  it('401 com credencial própria (Authorization explícito) e refreshSession NÃO dispara refresh nem onUnauthorized', async () => {
    server.use(
      mock.get(`${API}/me`, () =>
        HttpResponse.json({ message: 'api key revogada' }, { status: 401 }),
      ),
    )
    const onUnauthorized = vi.fn()
    const refresh = vi.fn()
    const client = createHttpClient({
      baseURL: API,
      withCredentials: true,
      onUnauthorized,
      refreshSession: refresh,
    })

    await rejection(
      client.get('/me', { headers: { Authorization: 'Bearer apk_revogada' } }),
    )

    expect(refresh).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('repro da AP: cross-host NÃO leva cookie E credencial própria em cookie NÃO dispara onUnauthorized', async () => {
    // Adapter que finge 401 (sem rede): igual ao repro mínimo da [AP] NUI-MIG-04.
    const captured: Array<{ url: string; withCredentials: boolean | undefined }> = []
    const fake401Adapter: AxiosAdapter = async (config) => {
      captured.push({ url: config.url ?? '', withCredentials: config.withCredentials })
      const err = new Error('401') as Error & {
        response: { status: number; data: unknown; headers: unknown; config: unknown }
        config: unknown
        isAxiosError: boolean
        toJSON: () => unknown
      }
      err.response = { status: 401, data: {}, headers: {}, config }
      err.config = config
      err.isAxiosError = true
      err.toJSON = () => ({})
      throw err
    }
    let n = 0
    const client = createHttpClient({
      baseURL: 'https://api.agentpack.example/',
      withCredentials: true,
      onUnauthorized: () => {
        n++
      },
      axios: { adapter: fake401Adapter },
    })

    await rejection(client.get('https://evil.example/steal'))
    await rejection(
      client.get('/projects', { headers: { Authorization: 'Bearer apk_revogada' } }),
    )

    expect(captured).toEqual([
      { url: 'https://evil.example/steal', withCredentials: false },
      { url: '/projects', withCredentials: true },
    ])
    expect(n).toBe(0)
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

/**
 * PKG-FIXES #7 (v1.5.2): um 401 de credencial recusada (login com senha
 * errada, MFA com código inválido) não pode entrar em refresh nem derrubar a
 * pessoa: antes, `createHttpClient` tratava QUALQUER 401 com o token atual como
 * "sessão vencida" e chamava `refreshSession` + `onUnauthorized`.
 */
describe('createHttpClient: 401 de credencial não é sessão vencida (#7)', () => {
  const credentialCodes = [
    'invalid_credentials',
    'invalid_password',
    'mfa_token_invalid',
    'invalid_mfa_code',
    'mfa_required',
  ]

  it.each(credentialCodes)('repro do backend: 401 { error: %s } não chama refresh nem onUnauthorized', async (code) => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const out = vi.fn()
    server.use(
      mock.post(`${API}/auth/mfa/verify`, () =>
        HttpResponse.json({ error: code, message: 'credencial recusada' }, { status: 401 }),
      ),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized: out,
    })

    const error = await rejection(client.post('/auth/mfa/verify', { code: '000000' }))

    expect(error.status).toBe(401)
    expect(error.errorCode).toBe(code)
    expect(refresh).not.toHaveBeenCalled()
    expect(out).not.toHaveBeenCalled()
  })

  it('401 sem errorCode continua sendo sessão vencida (backend legado)', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const out = vi.fn()
    server.use(
      mock.get(`${API}/projects`, () => HttpResponse.json({ message: 'Sessão expirada' }, { status: 401 })),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized: out,
    })

    await rejection(client.get('/projects'))

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(out).toHaveBeenCalledTimes(1)
  })

  it('401 com errorCode de sessão (token_expired) ainda renova e desloga', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('refresh revogado'))
    const out = vi.fn()
    server.use(
      mock.get(`${API}/projects`, () =>
        HttpResponse.json({ error: 'token_expired', message: 'Sessão expirada' }, { status: 401 }),
      ),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized: out,
    })

    await rejection(client.get('/projects'))

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(out).toHaveBeenCalledTimes(1)
  })

  it('isSessionExpired custom: o app decide pelo próprio código', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined)
    const out = vi.fn()
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json({ error: 'senha_expirada', message: 'troque a senha' }, { status: 401 }),
      ),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized: out,
      isSessionExpired: (e) => e.errorCode !== 'senha_expirada',
    })

    await rejection(client.post('/auth/login', { password: 'x' }))

    expect(refresh).not.toHaveBeenCalled()
    expect(out).not.toHaveBeenCalled()
  })

  it('refresh falho: o onUnauthorized recebe o motivo (refreshError) em vez de engolir', async () => {
    const motivo = new Error('refresh token revogado pelo IdP')
    const refresh = vi.fn().mockRejectedValue(motivo)
    const out = vi.fn()
    server.use(
      mock.get(`${API}/projects`, () => HttpResponse.json({ message: 'Sessão expirada' }, { status: 401 })),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => 'tok-1',
      refreshSession: refresh,
      onUnauthorized: out,
    })

    const error = await rejection(client.get('/projects'))

    expect(out).toHaveBeenCalledTimes(1)
    expect(out.mock.calls[0][0].refreshError).toBe(motivo)
    expect(out.mock.calls[0][0].error).toBe(error)
  })

  it('refresh ok: repete a requisição com o token novo e não desloga', async () => {
    let token = 'tok-1'
    const out = vi.fn()
    server.use(
      mock.get(`${API}/projects`, ({ request }) => {
        if (request.headers.get('authorization') === 'Bearer tok-1') {
          return HttpResponse.json({ message: 'Sessão expirada' }, { status: 401 })
        }
        return HttpResponse.json({ items: [{ id: 'p1' }] })
      }),
    )
    const client = createHttpClient({
      baseURL: `${API}/`,
      getToken: () => token,
      refreshSession: async () => {
        token = 'tok-2'
      },
      onUnauthorized: out,
    })

    const response = await client.get<{ items: { id: string }[] }>('/projects')

    expect(response.data.items[0].id).toBe('p1')
    expect(out).not.toHaveBeenCalled()
  })
})
