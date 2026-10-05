import { setupServer } from 'msw/node'

/** API falsa dos testes da camada de dados. */
export const API = 'http://api.test/api'

export const server = setupServer()

/** Liga o msw no arquivo de teste: requisição sem handler falha o teste. */
export function setupMswServer(): void {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
