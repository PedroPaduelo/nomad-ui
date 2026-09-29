# Padrão Frontend Nomad v1

> Vale para todos os frontends da Nomad: agent-package, Conta Nommand, loadbalance e motor.
> Base: o frontend do agent-package (`frontend/`, commit `95df4f2`), que o dono escolheu como referência.
> Pedido do dono (2026-09-29): mesmo tema, mesmas bibliotecas, mesma organização de pastas, mesmo jeito de
> consumir dados e a mesma barra superior da Conta Nommand em todos os apps.
> Onde o documento diz **(revisar na v1.0.0)**, o nome exato da API do `@nomad/ui` ainda está sendo fechado
> pelas outras lanes do épico NUI-00.

## 1. Regras em uma tela

1. O app instala o `@nomad/ui` numa **tag fixa** e não copia nada dele: tema, kit, barra, dados e presets vêm do pacote.
2. Pastas iguais às do agent-package: `app/`, `pages/`, `features/<dominio>/{api,hooks,components,pages,lib}`,
   `components/`, `api/`, `lib/`, `stores/`, `hooks/`, `config/`, `styles/`, `types/`, `utils/`, `test/`.
3. **Estado de servidor só no TanStack Query.** `queryOptions` + fábrica de keys por entidade; mutation invalida o que mudou.
4. **Zod nas bordas:** resposta da API, formulário e variáveis de ambiente.
5. **Zustand só para estado de tela** (tema, sidebar, toasts, modo de visão, flag de sessão). Nunca lista do servidor.
6. Componente e tela não chamam a API: leem e escrevem pelos hooks do domínio. O ESLint barra.
7. Overlay (diálogo, gaveta, menu, popover) só pelo kit. Nada de `fixed inset-0`, `role="dialog"` ou `aria-modal` à mão.
8. Nenhum merge sem os gates da seção 11 verdes.

## 2. Stack e versões

| Peça              | Versão                                                                                                                                                                                              | Observação                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Node              | 24 LTS (`.nvmrc` = `24`, `engines: ^24.11.0`)                                                                                                                                                       | o `@nomad/ui` aceita ≥ 22.12, mas o padrão é 24                         |
| React / React DOM | 19.3                                                                                                                                                                                                |                                                                         |
| Vite              | 8.3 (`@vitejs/plugin-react` 6)                                                                                                                                                                      |                                                                         |
| TypeScript        | 6.0 (`~6.0.3`)                                                                                                                                                                                      | `strict`, `noUnusedLocals`, `noUnusedParameters`; sem `baseUrl`         |
| Tailwind CSS      | 4.3 (`@tailwindcss/vite`)                                                                                                                                                                           | configuração em CSS (`@theme inline`), sem `tailwind.config.js`         |
| Kit               | `@base-ui/react` 1.8, `class-variance-authority` 0.7, `tailwind-merge` 3.7, `clsx` 2, `lucide-react` 1.48                                                                                           | tudo via `@nomad/ui`                                                    |
| Rotas             | `react-router-dom` 7.18                                                                                                                                                                             | data router (`createBrowserRouter`)                                     |
| Dados             | `@tanstack/react-query` 5, `axios` 1, `zod` 4.6, `zustand` 5                                                                                                                                        | cliente gerado com `@hey-api/openapi-ts` onde o backend publica OpenAPI |
| Testes            | `vitest` 5, Testing Library (react 16, user-event 14, jest-dom 7), `jsdom`, `msw` 2, `axe-core` 4, `@vitest/browser-playwright` 5                                                                   |                                                                         |
| Qualidade         | ESLint 9 (flat) + `typescript-eslint` 8 type-aware, `eslint-plugin-react-hooks` 7, `eslint-plugin-jsx-a11y` 6, `@tanstack/eslint-plugin-query` 5, `eslint-config-prettier`, Prettier 3.9, `madge` 8 | presets do `@nomad/ui`                                                  |

Fora do padrão (sair ao migrar): Astryx (`@astryxdesign/*`), StyleX, shadcn/Radix, `sonner`, `react-query-devtools` em produção,
cliente HTTP escrito à mão com `fetch` quando o `createHttpClient` resolve.

## 3. `@nomad/ui` (obrigatório)

### Instalar

```jsonc
// package.json do app
"dependencies": {
  "@nomad/ui": "git+https://github.com/PedroPaduelo/nomad-ui.git#v1.0.0"
}
```

`npm install` clona a tag e o `prepare` do pacote gera o `dist`. O app também declara os peers:
`react`, `react-dom` (19), `@tanstack/react-query` (5), `zod` (4) e `tailwindcss` (4).

### O que vem de lá

| Import                                                         | Conteúdo                                                                                                                                                                                                                      | Substitui no app                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@nomad/ui`                                                    | kit (`Button`, `Modal`, `Drawer`, `Menu`, `Popover`, `Tabs`, `Field`, `Input`, `Select`, `ConfirmDialog`, `EmptyState`…) e tema (`ThemeProvider`, `PaletteProvider`, `ThemeSwitcher`, hooks de tema e paleta, boot sem flash) | `src/components/ui/`, `providers/ThemeProvider`, `lib/theme*`, `styles/palettes.ts` |
| `@nomad/ui/theme.css`                                          | o `globals.css` do agent-package: tokens, `@theme inline`, 10 paletas × claro/escuro, e o `@source` do pacote                                                                                                                 | `src/styles/globals.css` e `palettes.css`                                           |
| `@nomad/ui/topbar`                                             | `TopBar`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu` (Padrão SSO Nomad v1, §10)                                                                                                                                              | `src/shared/nomad-topbar/` + `scripts/sync-nomad-topbar.sh`                         |
| `@nomad/ui/data`                                               | `createQueryClient`, `createHttpClient({ baseURL, onUnauthorized })`, `ApiError`, helpers de Zod e fábrica de query keys                                                                                                      | `lib/queryClient.ts`, o miolo de `api/client.ts`                                    |
| `@nomad/ui/markdown`                                           | leitor de markdown do kit **(revisar na v1.0.0)**                                                                                                                                                                             | `components/ui/Markdown.tsx`                                                        |
| `@nomad/ui/tsconfig`, `@nomad/ui/eslint`, `@nomad/ui/prettier` | presets                                                                                                                                                                                                                       | configs copiadas                                                                    |

```css
/* src/styles/globals.css do app: primeira linha */
@import '@nomad/ui/theme.css';
/* depois, só o CSS próprio do app (nada de cor fixa: use os tokens) */
```

```tsx
// src/main.tsx
import { ThemeProvider, PaletteProvider } from '@nomad/ui'
import './styles/globals.css'

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <PaletteProvider>
        <App />
      </PaletteProvider>
    </ThemeProvider>
  </StrictMode>,
)
```

O script de boot sem flash (aplica `data-theme` e `data-palette` antes do CSS) vai inline no `index.html` e vem do
pacote; o hash dele entra no `script-src` da CSP **(revisar na v1.0.0: nome do export do script)**.

### Atualizar

1. Leia o `CHANGELOG.md` do `nomad-ui` entre a tag atual e a nova.
2. Troque só a tag no `package.json` (`#v1.0.0` → `#v1.1.0`) e rode `npm install`.
3. Rode os gates (seção 11) e a aceitação visual da barra (captura ao lado da Conta).
4. Um commit só: `chore(deps): @nomad/ui v1.1.0`.

Nunca aponte para `main`, branch ou sha solto. Não edite nada dentro de `node_modules/@nomad/ui`: mudança vai por PR
no `nomad-ui` e sai numa versão nova. Componente que falta no kit: peça no `nomad-ui`; até sair, ele mora em
`src/components/<nome>/` do app, com task para subir ao pacote.

## 4. Organização de pastas

Igual à do agent-package (`frontend/src`), sem o que é produto dele (Render, glossário).

```
src/
├── main.tsx            entrada: providers do tema, QueryClient e router
├── app/                raiz do app e roteamento
│   ├── App.tsx         QueryClientProvider + RouterProvider
│   ├── routes.tsx      createBrowserRouter, lazy por rota, errorElement
│   ├── paths.ts        helpers de URL tipados (routes.project(id)…)
│   ├── RequireAuth.tsx guard: sem sessão → /auth/sso?next=<rota>
│   └── RouteErrorPage.tsx, routeBoundary.tsx
├── pages/              telas fora de um domínio (login pela Conta, busca, configurações, 404)
├── features/
│   └── <dominio>/      um por domínio do produto (projects, tasks, keys…)
│       ├── api/        chamadas REST do domínio + schemas Zod da resposta (só hooks/ importa daqui)
│       ├── hooks/      TanStack Query: keys, queryOptions, useX, useXMutation
│       ├── components/ componentes do domínio (+ schema Zod do formulário, ex. taskForm.ts)
│       ├── pages/      telas de rota do domínio (lazy no routes.tsx)
│       └── lib/        funções puras do domínio
├── components/         UI compartilhada do app
│   ├── layout/         Header (monta o TopBar do pacote), Sidebar, Breadcrumb, banners
│   └── <grupo>/        blocos do app usados por vários domínios (dashboard/, markdown/…)
│                       ui/ NÃO existe: o kit vem do @nomad/ui
├── layouts/            MainLayout (shell com barra + sidebar)
├── api/                client.ts (createHttpClient), generated/ (openapi-ts, nunca editado à mão),
│                       chamadas transversais (busca, stats)
├── lib/                queryClient.ts, errorReporter, authRedirect, utilitários com efeito
├── providers/          providers próprios do app (os de tema vêm do pacote)
├── stores/             Zustand: uiStore, authStore (estado de tela)
├── hooks/              hooks transversais (atalhos, busca global, título da página)
├── config/             endpoints.ts e env (validada com Zod)
├── styles/             globals.css (import do tema do pacote + CSS do app)
├── types/              tipos por domínio que o cliente gerado ainda não cobre
├── utils/              funções puras transversais
├── assets/             ícones e ilustrações
└── test/               setup.ts, utils.tsx (render com providers), e testes por área:
                        components/, hooks/, pages/, services/, security/, *.browser.test.tsx
```

Não usar: FSD (`entities/`, `widgets/`, `shared/`, `ui/`/`model/` por página), `contexts/` solto, `src/shared/nomad-topbar/`.
Mapa de migração do FSD: `entities/<x>/api` → `features/<x>/{api,hooks}`, `pages/<x>/ui` → `features/<x>/pages` +
`features/<x>/components`, `pages/<x>/model` → `features/<x>/lib` ou `hooks/`, `widgets/<x>` → `components/<x>` (ou
`features/<dominio>/components`), `shared/api` → `api/` + `lib/`, `shared/lib` → `lib/` ou `utils/`,
`shared/model` → `stores/`, `shared/ui` → kit do pacote ou `components/`.

Tamanho de arquivo (ESLint `max-lines`, só código): **300 por `.tsx`, 400 por `.ts`**; testes fora. Arquivo maior se
quebra por responsabilidade; exceção só com teto registrado no `eslint.config.js`, que pode encolher e nunca crescer.

## 5. Dados

### Cliente HTTP

```ts
// src/api/client.ts — o único lugar que cria o cliente
import { createHttpClient } from '@nomad/ui/data'
import { API_BASE_URL } from '@/config/endpoints'
import { useAuthStore } from '@/stores/authStore'

export const api = createHttpClient({
  baseURL: API_BASE_URL,
  // 401 da sessão: encerra a sessão local e o RequireAuth manda para /auth/sso
  onUnauthorized: () => useAuthStore.getState().expire(),
})
```

- Sessão por cookie httpOnly (`withCredentials` só para o próprio backend). Token nunca vai para `localStorage`.
- Todo erro chega como `ApiError` (`status`, `message` em pt-BR, `details`, `requestId`). A tela mostra `message`, nunca o texto cru do axios.
- Timeout padrão 10 s; operação longa (upload, importação) passa o próprio `timeout`.

### QueryClient

```ts
// src/lib/queryClient.ts
import { createQueryClient } from '@nomad/ui/data'
export const queryClient = createQueryClient()
// padrões: staleTime 60 s, gcTime 5 min, 1 nova tentativa (nenhuma em 401), sem refetch no foco
```

Ao encerrar a sessão, `queryClient.clear()`: nada da identidade anterior aparece para a próxima.

### Keys, queryOptions e mutations (um arquivo de hooks por entidade)

```ts
// src/features/memories/api/memories.ts
import { z } from 'zod'
import { api } from '@/api/client'

export const MemorySchema = z.object({ id: z.string(), title: z.string(), version: z.number() })
export type Memory = z.infer<typeof MemorySchema>

export const memoriesApi = {
  get: (projectId: string, id: string) =>
    api.get(`/projects/${projectId}/memories/${id}`).then((r) => MemorySchema.parse(r.data)),
  update: (projectId: string, id: string, input: { title: string }) =>
    api
      .patch(`/projects/${projectId}/memories/${id}`, input)
      .then((r) => MemorySchema.parse(r.data)),
}
```

```ts
// src/features/memories/hooks/useMemories.ts
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memoriesApi } from '../api/memories'

export const memoryKeys = {
  all: (projectId: string) => ['projects', projectId, 'memories'] as const,
  detail: (projectId: string, id: string) => [...memoryKeys.all(projectId), 'detail', id] as const,
}

export const memoryQuery = (projectId: string, id: string) =>
  queryOptions({
    queryKey: memoryKeys.detail(projectId, id),
    queryFn: () => memoriesApi.get(projectId, id),
  })

export const useMemory = (projectId: string, id: string) => useQuery(memoryQuery(projectId, id))

export function useUpdateMemory(projectId: string, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { title: string }) => memoriesApi.update(projectId, id, input),
    onSuccess: (memory) => {
      qc.setQueryData(memoryKeys.detail(projectId, id), memory)
      void qc.invalidateQueries({ queryKey: memoryKeys.all(projectId) })
    },
  })
}
```

Regras:

- Key sempre pela fábrica da entidade (nunca `['providers']` solto no componente). Hierárquica: `all` → `list(params)` → `detail(id)`.
- Toda mutation invalida (ou atualiza com `setQueryData`) as keys que mudaram. Nada de `refetch()` manual depois de salvar.
- Lista que troca de filtro usa `placeholderData: keepPreviousData`.
- Onde o backend publica OpenAPI, o `@hey-api/openapi-ts` gera tipos, SDK e `queryOptions` em `src/api/generated/`
  (sobre o `api` acima); não se escreve à mão interface que o gerado já tem, e o CI roda `api:check`.
- Tempo real (WebSocket, SSE): o cliente mora em `src/api/` (ex. `ws.ts`); o hook que assina aplica cada evento no
  cache (`setQueryData` ou `invalidateQueries`). Nada de store paralelo com cópia dos dados.

### Fronteira de import (ESLint, erro)

Só `src/api`, `features/*/api`, as pastas `hooks/` e `src/lib` importam valor da API. Tela e componente usam os hooks.
Import só de tipo e `ApiError`/predicados `is*Error` estão liberados. Também: `components/` não importa `pages/`;
`api/`, `hooks/`, `components/` e `lib/` de uma feature não importam as `pages/` dela.

### Zod nas bordas

| Borda           | Onde                                  | Como                                                                               |
| --------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Resposta da API | `features/<d>/api/*.ts` (ou o gerado) | `Schema.parse(r.data)`; o tipo sai de `z.infer`                                    |
| Formulário      | `features/<d>/components/<x>Form.ts`  | `safeParse` no submit, mensagens em pt-BR                                          |
| Ambiente        | `src/config/endpoints.ts`             | `z.object({ VITE_API_URL: z.url().optional(), … }).parse(import.meta.env)` no boot |

Mensagens em pt-BR no próprio schema. Os helpers de Zod do `@nomad/ui/data` padronizam o erro de parse como `ApiError`
**(revisar na v1.0.0: nomes)**.

### Zustand

Só estado de tela: preferências (tema e paleta ficam no pacote), sidebar, toasts, paleta de comandos aberta, modo de
visão (lista/quadro), atalhos, flag de sessão encerrada. `persist` só para preferências. Seletor sempre
(`useUIStore((s) => s.sidebarState)`). Proibido: copiar resposta do servidor para store, "cache" próprio, store com `fetch`.

## 6. Formulários

- `<form onSubmit>` com botão `type="submit"`; Enter envia. Campo com `Field` do kit (`label` ligado por `htmlFor`,
  `error` ligado por `aria-describedby`).
- Estado controlado no componente (ou num hook `useXForm` da feature); regras no schema Zod ao lado. Sem biblioteca de
  formulário na v1 (o agent-package não usa).
- Submit: `safeParse` → erros por campo → `mutation.mutate`. Botão desabilitado com `isPending`; não fecha o diálogo no meio do envio.
- Erro do servidor em `role="alert"`, com o `ApiError.message` (e `details` quando vier). 409 de versão abre o diálogo de conflito.
- `window.confirm`/`window.prompt` viram `ConfirmDialog`/`PromptDialog`.

## 7. Rotas

- `createBrowserRouter` em `app/routes.tsx`; cada tela é `lazy` com `Suspense`.
- `errorElement` na rota de topo (tela cheia) e numa rota sem path logo abaixo do layout (erro de página cai dentro do shell).
- URLs pelos helpers de `app/paths.ts`; estado que precisa sobreviver ao F5 (filtro, aba, item aberto) vai na query string.
- Telas públicas do SSO (Padrão SSO Nomad v1): `/login` ("Entrar com a Conta Nommand"), `/auth/logged-out`, `/auth/no-access`.
  Tudo o mais passa pelo `RequireAuth`.

## 8. Barra superior

O `Header` do app monta o `TopBar` do `@nomad/ui/topbar`: logo + nome do produto, `OrgSwitcher`, busca do app no
centro, ações do app, `AppSwitcher` e `AccountMenu`. Os dados vêm de `GET /api/auth/oidc/topbar` do backend do app
(com hook em `features/…/hooks` ou `hooks/useTopbar.ts`), nunca da Conta pelo navegador. Aceite: captura lado a lado com
a Conta, mesma largura, grade de apps e menu da conta abertos.

## 9. Acessibilidade

- `eslint-plugin-jsx-a11y` ligado; overlays só pelo kit (focus trap, Esc, retorno de foco).
- Teste de teclado dos fluxos principais (Tab, Esc, Enter) com Testing Library + `user-event`.
- `axe` nos testes de tela (jsdom) e **contraste no Chromium** (`*.browser.test.tsx`, `npm run test:a11y`) nas 10 paletas × claro/escuro.
- Nunca cor fixa em componente: use os tokens do tema. Status (`success/warning/error/info`) só para status.
- Atalho de uma tecla só pode ser desligado (WCAG 2.1.4).

## 10. Testes

- Vitest + jsdom; setup em `src/test/setup.ts`; `src/test/utils.tsx` renderiza com QueryClient novo (`retry: false`) e router de memória.
- HTTP falso com `msw` (não mockar o axios à mão).
- O que testar: hooks de dados (keys, invalidação), formulários (validação, erro do servidor), telas (carregando, vazio,
  erro, sucesso), segurança (CSP do `index.html`, HTML sanitizado) e a11y.
- Cobertura com piso por diretório no `vitest.config.ts`: o piso só sobe.

## 11. Gates obrigatórios

Scripts com estes nomes em todo app (o preset do `@nomad/ui` traz as configs):

```json
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"format:check": "prettier --check .",
"cycles": "madge --circular --extensions ts,tsx --ts-config tsconfig.json src",
"test": "vitest run",
"test:coverage": "vitest run --coverage",
"test:a11y": "vitest run -c vitest.a11y.config.ts",
"build": "tsc -p tsconfig.build.json && vite build",
"gates": "npm run typecheck && npm run lint && npm run cycles && npm test && npm run build"
```

| Gate                            | Falha quando                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`                     | qualquer erro de tipo (app, testes e configs do Vite/Vitest)                                                                                                              |
| `lint`                          | erro: segurança (`no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`), fronteira de dados, `max-lines`. Presets entram como aviso e sobem para erro quando zeram |
| `cycles`                        | qualquer ciclo de import                                                                                                                                                  |
| `test` + cobertura              | teste vermelho ou cobertura abaixo do piso                                                                                                                                |
| `test:a11y`                     | violação do axe (contraste) no Chromium                                                                                                                                   |
| `build`                         | `tsc` do build ou `vite build` falha                                                                                                                                      |
| `api:check` (se usa openapi-ts) | `src/api/generated` diferente do backend                                                                                                                                  |
| `npm audit --audit-level=high`  | vulnerabilidade high/critical                                                                                                                                             |
| `format:check`                  | arquivo fora do Prettier (entra no CI quando o app estiver todo formatado; até lá, lint-staged no pre-commit)                                                             |

CI (GitHub Actions) em todo push na `main` e PR, na ordem: `npm ci` → `api:check` → `typecheck` → `lint` → `cycles` →
`test` (com cobertura) → `test:a11y` → `build` → `audit`. Node pela `.nvmrc`.

## 12. Checklist de migração de um app

1. Instalar `@nomad/ui@v1.0.0` e os peers; trocar o tema (`@import '@nomad/ui/theme.css'`, providers e boot do pacote).
2. Trocar a barra pelo `@nomad/ui/topbar`; apagar `src/shared/nomad-topbar/` e `scripts/sync-nomad-topbar.sh`.
3. Trocar o kit local pelo do pacote e apagar `src/components/ui/` (e Astryx/StyleX, se houver).
4. Trocar cliente HTTP e QueryClient pelas fábricas do `@nomad/ui/data`.
5. Presets de tsconfig, ESLint e Prettier; subir Vite/TS/Node para as versões da seção 2.
6. Reorganizar pastas (seção 4) e aplicar as regras de dados (seção 5).
7. Gates e CI (seção 11).

A lista por app, com tamanho, está em [auditoria-apps.md](./auditoria-apps.md).
