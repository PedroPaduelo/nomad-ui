/**
 * ApiError — campos extras para discriminar erros do backend (PKG-FIXES #4).
 *
 * A Conta discrimina 8+ telas pelo `error` do corpo (`invalid_credentials`,
 * `mfa_required`, `token_expired`, `version_conflict`…). O `ApiError` ganha:
 * - `errorCode?: string` — `body.error` quando for string.
 * - `body?: unknown` — corpo bruto da resposta.
 * `details` continua sendo `body.details` (semântica atual preservada).
 */
import { http as mock, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { ApiError, isApiError } from './apiError'
import { createHttpClient } from './httpClient'
import { API, server, setupMswServer } from '../test/msw'

setupMswServer()

describe('ApiError — errorCode + body (PKG-FIXES #4)', () => {
  it('401 { error: "invalid_credentials", message: "x", details: { foo: 1 } }: errorCode="invalid_credentials", body presente, details preservado', async () => {
    server.use(
      mock.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          { error: 'invalid_credentials', message: 'senha errada', details: { foo: 1 } },
          { status: 401 },
        ),
      ),
    )
    const client = createHttpClient({ baseURL: API })

    const err = await client.post('/auth/login', {}).then(
      () => {
        throw new Error('era para falhar')
      },
      (e: unknown) => e,
    )

    expect(isApiError(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(401)
    expect(apiErr.errorCode).toBe('invalid_credentials')
    expect(apiErr.body).toEqual({ error: 'invalid_credentials', message: 'senha errada', details: { foo: 1 } })
    expect(apiErr.details).toEqual({ foo: 1 })
    expect(apiErr.message).toBe('senha errada')
  })

  it('body sem "error": errorCode fica undefined mas body ainda é exposto', async () => {
    server.use(
      mock.get(`${API}/boom`, () =>
        HttpResponse.json({ message: 'no details', reason: 'GENERIC' }, { status: 500 }),
      ),
    )
    const client = createHttpClient({ baseURL: API })

    const err = await client.get('/boom').then(
      () => {
        throw new Error('era para falhar')
      },
      (e: unknown) => e,
    )

    expect(isApiError(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.errorCode).toBeUndefined()
    expect(apiErr.body).toEqual({ message: 'no details', reason: 'GENERIC' })
  })

  it('"error" não-string: ignorado (errorCode undefined), sem quebrar', async () => {
    server.use(
      mock.get(`${API}/weird`, () =>
        HttpResponse.json({ error: { nested: 'shape' }, message: 'x' }, { status: 400 }),
      ),
    )
    const client = createHttpClient({ baseURL: API })

    const err = await client.get('/weird').then(
      () => {
        throw new Error('era para falhar')
      },
      (e: unknown) => e,
    )

    expect(isApiError(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.errorCode).toBeUndefined()
    expect(apiErr.body).toEqual({ error: { nested: 'shape' }, message: 'x' })
  })

  it('sem corpo de resposta (ERR_NETWORK): body undefined, errorCode undefined', async () => {
    server.use(mock.get(`${API}/down`, () => HttpResponse.error()))
    const client = createHttpClient({ baseURL: API })

    const err = await client.get('/down').then(
      () => {
        throw new Error('era para falhar')
      },
      (e: unknown) => e,
    )

    expect(isApiError(err)).toBe(true)
    const apiErr = err as ApiError
    expect(apiErr.status).toBeUndefined()
    expect(apiErr.errorCode).toBeUndefined()
    expect(apiErr.body).toBeUndefined()
  })
})