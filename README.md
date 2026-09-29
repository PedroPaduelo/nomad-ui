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

## Barra superior Nomad

O CSS da barra é um import explícito (o JS não importa nem incorpora CSS no bundle). Adicione uma vez ao CSS global, depois do tema:

```css
@import '@nomad/ui/theme.css';
@import '@nomad/ui/topbar.css';
```

Importe os componentes de `@nomad/ui/topbar` (mesma API do antigo `@nomad/topbar` da Conta Nommand):

```tsx
import { TopBar, TopBarBrand, OrgSwitcher, AppSwitcher, AccountMenu, type TopbarData } from '@nomad/ui/topbar'
import { useQuery } from '@tanstack/react-query'

// O backend do app busca a Conta usando o access token OIDC da sessão e repassa
// GET /api/auth/oidc/topbar. O navegador NÃO chama a Conta diretamente.
const { data } = useQuery<TopbarData>({
  queryKey: ['topbar'],
  queryFn: async () => {
    const r = await fetch('/api/auth/oidc/topbar', { credentials: 'include' })
    if (!r.ok) throw new Error('Não foi possível carregar os aplicativos.')
    return r.json()
  },
  staleTime: 60_000,
})

<TopBar
  brand={<TopBarBrand logo={<Logo />} name="Nommand" product="Loadbalance" href="/" />}
  org={data && <OrgSwitcher organizations={data.organizations} currentOrgId={data.organization.id}
    onSwitch={(id) => { window.location.href = `/auth/sso?org=${encodeURIComponent(id)}&next=/` }} />}
  search={<SearchBox />}
  actions={<AppActions />}
  apps={<AppSwitcher apps={data?.apps ?? null} orgId={data?.organization.id}
    currentAppSlug="loadbalance" accountUrl={data?.accountUrl} />}
  account={data && <AccountMenu user={{ name: data.profile.name ?? '', email: data.profile.email,
    picture: data.profile.picture }} organization={data.organization}
    manageAccountHref={data.accountUrl} onSignOut={() => { /* POST /api/auth/logout e seguir endSessionUrl */ }} />}
/>
```

O backend deve servir `GET /api/auth/oidc/topbar`, chamando a API da Conta em nome da sessão (refresh de access token uma vez em 401) e aplicando cache curto (~60 s). O formato completo de `TopbarData` e cada prop estão no README da origem `conta_nommand/packages/topbar/README.md` e no contrato SSO §10. Nunca faça a chamada OIDC do navegador.

A barra mapeia automaticamente as variáveis `--ntb-*` aos tokens `--surface-*`, `--color-*`, `--shadow-*`, `--radius-*`, `--fs-*`, `--lh-*`, `--av1..6-*` do tema. Os apps com tema Nomad não precisam definir `--ntb-*`; uma variável específica pode ser sobrescrita no `:root` ou num ancestral de `.ntb`. O tema escuro precisa definir `color-scheme: dark` para que a placa dos ícones de app (SVG da Conta) acompanhe o modo.

A barra não busca dados e não gerencia sessão. O backend do app é o único cliente da Conta. `AppSwitcher`, `AccountMenu` e `OrgSwitcher` aceitam `open`/`onOpenChange` quando a aplicação precisar controlar a abertura; omitindo as props, cada peça controla o próprio estado.

A migração elimina a cópia em `src/shared/nomad-topbar/` e torna obsoleto `scripts/sync-nomad-topbar.sh` da Conta quando os apps consumirem esta entrada; a remoção do script cabe à task da Conta.

## Shell lateral (sidebar + header)

O `@nomad/ui` também exporta o shell lateral do app (sidebar à esquerda + header no topo + conteúdo à direita) usado pelo agent-package. As peças são desacopladas do produto: a nav vem por prop, o estado da sidebar é do caller, atalhos/toasts/banner ficam no app.

```tsx
import {
  MainLayout,
  Sidebar,
  Header,
  Breadcrumb,
  HeaderUserMenu,
  ThemeSwitcher,
  ThemeProvider,
  PaletteProvider,
  type SidebarSection,
  type SidebarItem,
} from '@nomad/ui'
import { TopBarBrand } from '@nomad/ui/topbar'
import { useState } from 'react'
import { Folder, Home, Puzzle, Settings } from 'lucide-react'

const sections: SidebarSection[] = [
  {
    items: [
      { key: 'home', label: 'Início', icon: <Home />, href: '/', current: true },
      { key: 'projects', label: 'Projetos', icon: <Folder />, href: '/projects' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { key: 'skills', label: 'Skills', icon: <Puzzle />, href: '/catalog/skills' },
    ],
  },
]

const footerItems: SidebarItem[] = [
  { key: 'settings', label: 'Configurações', icon: <Settings />, href: '/settings' },
]

function App({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <ThemeProvider>
      <PaletteProvider>
        <MainLayout
          sidebar={{
            sections,
            footerItems,
            brand: { initial: 'A', name: 'AgentPack', subtitle: 'Empresa · 3 projetos' },
            ariaLabel: 'Navegação principal',
          }}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          breadcrumb={[
            { label: 'Projetos', href: '/projects' },
            { label: 'AgentPack', href: '/projects/abc' },
            { label: 'Memórias' },
          ]}
          header={{
            brand: <TopBarBrand logo={<Logo />} name="Nommand" product="AgentPack" />,
            actions: (
              <>
                <ThemeSwitcher />
                <HeaderUserMenu
                  user={{ name: 'Ana Souza', email: 'ana@nomad.dev' }}
                  onSignOut={() => { /* limpar sessão */ }}
                />
              </>
            ),
          }}
        >
          {children}
        </MainLayout>
      </PaletteProvider>
    </ThemeProvider>
  )
}
```

`MainLayout` é dono do estado do drawer mobile (`onToggleSidebar`) e do `onNavigate` da sidebar (fecha o drawer quando um item é clicado). Componha as peças diretamente (`<Sidebar> + <Header>`) quando precisar de mais controle (ex.: um shell sem breadcrumb ou com `contentMax` desligado). Slots opcionais:

- `beforeHeader` / `beforeMain` — banners ou barras auxiliares.
- `contentPadding` (`'p-6' | 'p-4' | 'p-0' | false`) e `contentMax` (`'max-w-(--content-max)' | false`).

Tokens usados pelo shell: `--sidebar-width`, `--sidebar-collapsed-width`, `--content-max`, `--backdrop-bg`, `--surface-*`, `--color-*`, `--text-*`, `--border-*`. Tudo vem com o tema.

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

## Presets

Cada preset é uma subentrada do pacote: `@nomad/ui/tsconfig`, `@nomad/ui/eslint` e
`@nomad/ui/prettier`. O consumer executável em `examples/consumer` demonstra os três.

```jsonc
// tsconfig.json
{ "extends": "@nomad/ui/tsconfig", "compilerOptions": { "noEmit": true } }
```

```js
// eslint.config.js (flat config)
import nomad from '@nomad/ui/eslint'
import { defineConfig } from 'eslint/config'
export default defineConfig(nomad)
```

```json
// .prettierrc
"@nomad/ui/prettier"
```

ESLint 9 é a base suportada atualmente; o preset usa flat config e combina
`typescript-eslint`, React Hooks, jsx-a11y, TanStack Query e `eslint-config-prettier`.
O app deve instalar o ESLint e esses plugins/configs nas devDependencies em versões compatíveis.
O suporte a ESLint 10 depende da compatibilidade publicada de cada plugin e não é prometido pelo
preset atual.

## Tailwind no app

O tema é CSS do Tailwind 4 e mora no pacote. O app faz:

```css
/* src/index.css — Tailwind CSS 4 */
@import '@nomad/ui/theme.css';
/* O tema já importa Tailwind, os tokens e @source relativo ao dist do pacote. */
```

O CSS de tema exportado importa a base Tailwind e declara `@source` para o pacote. Não precisa de
`tailwind.config.js` nem de um `@source` próprio para o kit; adicione `@source` apenas para outros
pacotes locais cujas classes Tailwind devam ser varridas. O CSS específico da aplicação vem depois
do tema, sempre usando os tokens Nomad.
