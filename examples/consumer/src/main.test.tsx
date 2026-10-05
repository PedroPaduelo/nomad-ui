import { createHttpClient, isUnauthorizedError, parseResponse, QueryProvider } from '@nomad/ui/data'
import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { App } from './App'
import { server } from './test/server'

const listSchema = z.object({ items: z.array(z.object({ id: z.string(), name: z.string() })) })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryProvider client={client}>{ui}</QueryProvider>)
}

describe('consumer', () => {
  it('renderiza a lista que veio da API falsa', async () => {
    server.use(
      mock.get('http://api.test/api/projects', () =>
        HttpResponse.json({ items: [{ id: 'p1', name: 'Nomad' }] }),
      ),
    )
    renderWithClient(<App />)
    expect(await screen.findByText(/Nomad/)).toBeInTheDocument()
  })

  it('parseResponse entrega o erro legível em contrato quebrado', async () => {
    server.use(mock.get('http://api.test/api/projects', () => HttpResponse.json({ data: [] })))
    renderWithClient(<App />)
    await waitFor(() => {
      expect(screen.getByText(/items: /)).toBeInTheDocument()
    })
  })

  it('isUnauthorizedError classifica um 401', async () => {
    const http = createHttpClient({ baseURL: 'http://api.test/api' })
    server.use(mock.get('http://api.test/api/x', () => new HttpResponse(null, { status: 401 })))
    const error = await http.get('/x').catch((e: unknown) => e)
    expect(isUnauthorizedError(error)).toBe(true)
  })

  it('o pacote exporta parseResponse', () => {
    const parsed = parseResponse(listSchema, { items: [] }, 'GET /projects')
    expect(parsed.items).toEqual([])
  })
})
