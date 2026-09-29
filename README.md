# @nomad/ui

Kit de componentes, tema (10 paletas, claro/escuro/sistema), barra Nomad, camada de dados e presets
compartilhados pelos apps da Nomad (agent-package, Conta Nommand, loadbalance e motor). A base é o
kit do AgentPack.

> Em construção (épico NUI-00). Instalação, entradas e exemplos entram aqui até a `v1.0.0`.

## Entradas

| Import                                       | Conteúdo                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `@nomad/ui`                                  | kit (`components/ui`) e tema (provider, hooks, seletor de aparência) |
| `@nomad/ui/theme.css`                        | tema Tailwind 4 (globals.css do AgentPack)                           |
| `@nomad/ui/topbar`                           | barra Nomad: `TopBar`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu`   |
| `@nomad/ui/data`                             | `createQueryClient`, `createHttpClient`, Zod e query keys            |
| `@nomad/ui/tsconfig`, `/eslint`, `/prettier` | presets                                                              |

## Desenvolvimento

```bash
npm install
npm run gates      # typecheck + lint + test + build
npm run test:a11y  # axe em navegador real
```

## Dados (`@nomad/ui/data`)

Um cliente HTTP e um QueryClient para o app inteiro, com o mesmo formato de erro, o mesmo
tratamento de 401 e a mesma convenção de query keys dos outros apps da Nomad. Levantamento e regras
em [`src/data/README.md`](./src/data/README.md).

### Cliente HTTP

`createHttpClient({ baseURL, getToken?, getHeaders?, refreshSession?, onUnauthorized?, ... })`
retorna a instância do axios que o app inteiro usa, inclusive o client gerado pelo
`@hey-api/openapi-ts` (`generatedClientConfig`).

- `getToken` síncrono ou `async` (Conta: access token em memória, sem cookie).
- `getHeaders` injeta cabeçalhos extras a cada requisição (CSRF do loadbalance, versão do app).
- `requestId` por requisição (`http.get('/me', { requestId: 'uuid-…' })`): o `X-Request-Id` vai e
  volta no `x-request-id` da resposta (o `ApiError.requestId` carrega o código para suporte).
- `skipAuth: true` para rota pública (login). `skipSessionExpiry: true` para uma chamada que
  decide a sessão (o refresh): o 401 não dispara `onUnauthorized`.
- `refreshSession()` (Conta): renova o access token no 401 do token ATUAL, repete a requisição
  uma vez. Single-flight: chamadas concorrentes do mesmo refresh não disparam o IdP duas vezes.
- `onUnauthorized({ error, sentToken })`: sessão vencida sem auto-refresh, ou após um refresh que
  falhou.
- `onResponse(status)` / `onNetworkError(error)`: ganchos do monitor de conectividade
  (agent-package: pausa queries/mutations enquanto o backend está fora).

```ts
// agent-package
const http = createHttpClient({
  baseURL: API_BASE_URL,
  getToken: () => useAuthStore.getState().token,
  onResponse: (status) => reportBackendResponse(status),
  onNetworkError: () => reportNetworkFailure(),
  onUnauthorized: ({ error }) => {
    useAuthStore.getState().expire()
    window.location.assign(loginPath(window.location.pathname))
  },
})

// Conta: access token em memória + refresh em 401
const http = createHttpClient({
  baseURL: API_BASE_URL,
  getToken: async () => session.accessToken,
  getHeaders: async () => ({ 'X-CSRF-Token': await session.csrf() }),
  refreshSession: async () => {
    await session.refresh()
  },
  onUnauthorized: () => session.signOut(),
})

// loadbalance: CSRF vindo de cookie
const http = createHttpClient({
  baseURL: API_BASE_URL,
  withCredentials: true,
  getHeaders: () => ({ 'X-CSRF-Token': readCookie('csrf') ?? '' }),
})
```

### QueryClient e cache

```ts
const queryClient = createQueryClient() // padrões do Padrão Nomad
clearCacheOnSessionChange(queryClient, useSessionStore, (s) => s.token)
resetQueriesAfterError(queryClient, [sessionKeys.all]) // refaz tudo menos a sessão
```

### Query keys (uma fábrica por entidade)

```ts
export const projectKeys = createQueryKeys('projects', (k) => ({
  deletePreview: (id: string) => [...k.all, 'delete-preview', id] as const,
}))

useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectsApi.get(id) })
qc.invalidateQueries({ queryKey: projectKeys.all })
```

### Zod na borda

```ts
const project = parseResponse(projectSchema, data, 'GET /projects/:id')
export const env = parseEnv(envSchema, import.meta.env) // no boot do app
const errors = fieldErrors(result.error) // formulário: erro por campo
```

### Zustand: só estado de tela

```ts
export const useBoardView = createScreenStore(
  { mode: 'list' as 'list' | 'board', selectedId: null as string | null },
  (set) => ({ select: (selectedId: string | null) => set({ selectedId }) }),
  { persist: { name: 'meuapp:board-view', keys: ['mode'] } },
)
```

Estado do servidor (listas, detalhes, o usuário da sessão) é sempre TanStack Query; o Zustand
guarda preferências, painéis, seleção, rascunho, o token.

## ESLint: 9 e 10

Os plugins do preset aceitam ESLint 9 e 10 (`^8.57.0 || ^9.0.0 || ^10.0.0` na maioria). O motor
já está no 10; agent-package/Conta/loadbalance ainda no 9. O `@eslint/js` segue a versão major
do ESLint, então o peer dela é o que decide: 9.x para ESLint 9, 10.x para ESLint 10. Cada app
instala o par coerente. Se um plugin travar no 9 (problema conhecido: `eslint-plugin-jsx-a11y`
ainda não publicou suporte a 10 no momento desta release), sobe o peer do app para 10 e espera o
plugin.

## Tailwind no app

O tema é CSS do Tailwind 4 e mora no pacote. O app faz:

```css
/* src/index.css */
@import '@nomad/ui/theme.css';
```

Nenhuma config de Tailwind no app: o `@source` do tema aponta para o `dist/` do pacote, então
todas as classes do kit são lidas. Outros CSS do app entram depois do `@import`.
