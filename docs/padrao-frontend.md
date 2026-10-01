# Padrão Frontend Nomad v1

> Vale para todos os frontends da Nomad: agent-package, Conta Nommand, loadbalance e motor.
> Base: o frontend do agent-package (`frontend/`, commit `95df4f2`), escolhido como referência.
> Decisão de produto (2026-09-29): mesmo tema, mesmas bibliotecas, mesma organização de pastas, mesmo jeito de
> consumir dados e a mesma barra superior da Conta Nommand em todos os apps.
> Onde o documento diz **(revisar na v1.0.0)**, o nome exato da API do `@nomad/ui` ainda está sendo fechado
> pelas outras fases do projeto NUI-00.

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
// package.json do app — URL git+https COMPLETA, nunca o atalho github:
"dependencies": {
  "@nomad/ui": "git+https://github.com/PedroPaduelo/nomad-ui.git#v1.6.3"
}
```

`npm install` clona a tag e o `prepare` do pacote gera o `dist`. O app também declara os peers:
`react`, `react-dom` (19), `@tanstack/react-query` (5), `zod` (4) e `tailwindcss` (4).

### Consumo por tag: o package-lock prende o commit (importante)

Com dependência git, o `package-lock.json` guarda o **commit resolvido** da tag. Trocar só a tag no `package.json` e rodar
`npm install` pode **manter em silêncio o commit antigo** (o npm reaproveita a entrada do lock): em 2026-09-30 o motor
ficou na `v1.4.1` acreditando estar na `v1.5.0`. Procedimento de bump:

```bash
# 1. edite a tag no package.json do app
# 2. force a resolução para a nova tag:
npm install @nomad/ui@git+https://github.com/PedroPaduelo/nomad-ui.git#vX.Y.Z
# 3. confirme a versão instalada:
node -p "require('@nomad/ui/package.json').version"
```

**Lock da raiz manda no workspace:** bump no `package.json` do pacote (ex.: `motor/fe`) não instala nada se a entrada
do `package-lock.json` da raiz continuar pinada. Atualize os dois locks e confira
`require('@nomad/ui/package.json').version` (o motor caiu nisso em 2026-09-30: pediu 1.5.1, ficou na 1.4.1).

**SSH:** o atalho `github:PedroPaduelo/nomad-ui#vX.Y.Z` faz o npm resolver por git+ssh e `npm ci` quebra em imagem
Docker sem chave ssh (os 3 frontends de produção caíram nisso em 2026-09-30). Mesmo instalando por `git+https://`, o npm
grava `resolved: git+ssh://git@github.com/…#<sha>` no lock (medido). Para um CI/Docker sem chave: **regere o lock uma
vez** (`rm -f package-lock.json && npm install` na primeira instalação, ou no CI) para ele ficar em https.

### O que vem de lá

| Import                                                         | Conteúdo                                                                                                                                                                                                                                                                                                                                        | Substitui no app                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@nomad/ui`                                                    | kit (`Button`, `Modal`, `Drawer`, `Menu`, `Popover`, `Tabs`, `Field`, `Input`, `Select`, `ConfirmDialog`, `EmptyState`, `Switch`, `Table`, `Pagination`, `Banner`, `MultiSelect`, `CodeBlock`, `StatusDot`, `Progress`, `Kbd`, `Toaster`…) e tema (`ThemeProvider`, `PaletteProvider`, `ThemeSwitcher`, hooks de tema e paleta, boot sem flash) | `src/components/ui/`, `providers/ThemeProvider`, `lib/theme*`, `styles/palettes.ts` |
| `@nomad/ui/theme.css`                                          | o `globals.css` do agent-package: tokens, `@theme inline`, 10 paletas × claro/escuro, e o `@source` do pacote                                                                                                                                                                                                                                   | `src/styles/globals.css` e `palettes.css`                                           |
| `@nomad/ui/topbar`                                             | `TopBar`, `TopBarModel` + `topBarModelSchema`, `TopBarModelBar`, `NotificationsButton`, `TopBarBrand`, `TopBarModelBrand`, `NommandMark`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu` (Padrão SSO Nomad v1, §10)                                                                                                                                | `src/shared/nomad-topbar/` + `scripts/sync-nomad-topbar.sh`                         |
| `@nomad/ui/data`                                               | `createQueryClient`, `createHttpClient({ baseURL, onUnauthorized, isSessionExpired })`, `ApiError` (`errorCode`, `body`), `parseEnv`/`parseResponse`/`responseParser`/`fieldErrors` (tipos **estruturais**, sem zod no `.d.ts`), helpers de Zod e fábrica de query keys                                                                         | `lib/queryClient.ts`, o miolo de `api/client.ts`                                    |
| `@nomad/ui/markdown`                                           | leitor de markdown do kit **(revisar na v1.0.0)**                                                                                                                                                                                                                                                                                               | `components/ui/Markdown.tsx`                                                        |
| `@nomad/ui/tsconfig`, `@nomad/ui/eslint`, `@nomad/ui/prettier` | presets                                                                                                                                                                                                                                                                                                                                         | configs copiadas                                                                    |

```css
/* src/styles/globals.css do app: primeira linha */
@import '@nomad/ui/theme.css';
@import '@nomad/ui/topbar.css'; /* a barra: CSS é import explícito, uma vez */
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

### Versões publicadas (o que cada uma trouxe)

| Tag      | Traz                                                                                                                                                                                                                                                                                          | Apps devem                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `v1.0.0` | tema (11 paletas × claro/escuro/sistema), kit do agent-package, barra Nomad (`TopBar`, `OrgSwitcher`, `AppSwitcher`, `AccountMenu`), dados (`QueryClient`, `createHttpClient`, Zod, keys), presets                                                                                            | base da migração                                                                     |
| `v1.0.1` | correção de release                                                                                                                                                                                                                                                                           | —                                                                                    |
| `v1.1.0` | + `Switch`, `Table`, `Pagination`, `Banner`, `MultiSelect`, `CodeBlock`, `StatusDot` (7 peças do loadbalance)                                                                                                                                                                                 | trocar o local pelo do pacote                                                        |
| `v1.1.1` | `withCredentials` só na mesma origem; `onUnauthorized` não dispara em 401 de credencial própria                                                                                                                                                                                               | cliente novo, sem `withCredentials: true` global                                     |
| `v1.1.2` | `Menu disabled` propaga ao gatilho (não usar CSS `pointer-events-none`)                                                                                                                                                                                                                       | —                                                                                    |
| `v1.2.0` | `ApiError.errorCode` (`body.error`) e `ApiError.body`                                                                                                                                                                                                                                         | telas que discriminam por `invalid_credentials`, `mfa_required`, `version_conflict`… |
| `v1.3.0` | `Toaster`, `useToast` (wrapper Sonner com os tokens)                                                                                                                                                                                                                                          | sair do `sonner` local                                                               |
| `v1.4.0` | `Progress.tone` (`success/warning/error/info/accent`), `fillClassName`                                                                                                                                                                                                                        | —                                                                                    |
| `v1.4.1` | `Progress` com `w-full` (a trilha colapsava em 0 px dentro de `flex`)                                                                                                                                                                                                                         | —                                                                                    |
| `v1.5.0` | `TopBarModel` + `topBarModelSchema` (Zod) — contrato canônico da barra; tokens `--mark-bg`/`--mark-on` (fix do logo)                                                                                                                                                                          | validar a resposta do topbar com o schema                                            |
| `v1.5.1` | republicação do conteúdo da `v1.5.0` (a tag `v1.5.0` apontava para o commit da `v1.4.1`)                                                                                                                                                                                                      | **apontar para `#v1.5.1`, nunca `#v1.5.0`**                                          |
| `v1.5.2` | o barrel de `@nomad/ui/topbar` passou a exportar o contrato (`topBarModelSchema` e tipos); `createHttpClient`: 401 de credencial (`invalid_credentials`, `mfa_*`) não derruba a sessão (`isSessionExpired`) e `UnauthorizedContext.refreshError`                                              | aponta para `#v1.5.2` ou acima                                                       |
| `v1.6.0` | `<TopBar model={…}>` monta as 3 peças + Ajuda + notificações a partir do `TopBarModel` (ver §8); `NotificationsButton`, `NommandMark`/`TopBarModelBrand`; `MenuItem.onNavigate`; `AccountMenu.onSignOut` opcional; nota de consumo por tag                                                    | barra pelo model; conferir versão instalada                                          |
| `v1.6.1` | `<Kbd symbol>` para glifo Unicode (⌘, ⇧, ⌥, ↻): a fonte de texto tem o glifo, a de mono não — sem isso o navegador desenhava a caixa vazia (▯)                                                                                                                                                | `<Kbd symbol>` em atalhos; **tirar o contorno `font-sans` no app**                   |
| `v1.6.2` | `launcherLinks` como **rodapé** de links da grade (como a Conta), não tiles; tipos de Zod estruturais (`SafeParseSchema`, `Issue`): o `.d.ts` não amarra a versão de zod do consumidor                                                                                                        | nada a mudar no código; **a ponte de tipos do zod sai**                              |
| `v1.6.3` | menu com `href` **navega** de volta (regressão da v1.6.0: "Gerenciar sua Conta", `accountLinks` e `helpLinks` estavam com o clique prevenido e sem função); `safeParse` do topbar não lança (devolve issue); `apps` validado no schema; `href` só http(s); `theme={null}` esconde o item Tema | sem mudança de código: bumpar para `#v1.6.3`                                         |

Tags nunca se movem: conteúdo corrigido sai em **versão nova**.

### Atualizar

1. Leia o `CHANGELOG.md` do `nomad-ui` entre a tag atual e a nova.
2. Troque a tag no `package.json` e rode `npm install @nomad/ui@git+https://github.com/PedroPaduelo/nomad-ui.git#<tag>` (força a resolução; ver "Consumo por tag" acima).
3. Confira `node -p "require('@nomad/ui/package.json').version"`.
4. Rode os gates (seção 11) e a aceitação visual da barra (captura ao lado da Conta).
5. Um commit só: `chore(deps): @nomad/ui v1.6.3`.

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
- Todo erro chega como `ApiError` (`status`, `message` em pt-BR, `details`, `requestId`, `errorCode` = `body.error`, `body` cru). A tela mostra `message`, nunca o texto cru do axios.
- **401 de credencial não encerra a sessão** (`v1.5.2`): `createHttpClient` distingue `invalid_credentials`, `invalid_password`, `mfa_token_invalid`, `invalid_mfa_code`, `mfa_required` (padrão `defaultIsSessionExpired`) — senha errada no login/MFA não derruba quem está entrando. Backend com outros códigos: passe `isSessionExpired: (e) => …`.
- Com `refreshSession`, um refresh que falha chega ao `onUnauthorized` como `refreshError` (o 401 original continua sendo rejeitado).
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
**(revisar na v1.0.0: nomes)**. A resposta do topbar se valida com o `topBarModelSchema` do pacote (ver §8).

**Zod 3 + zod 4 no mesmo workspace (`v1.6.2`):** os tipos públicos de `parseEnv`/`parseResponse`/`responseParser`/
`fieldErrors` são **estruturais** (`SafeParseSchema<Out>`, `Issue`) e o `.d.ts` do pacote **não importa zod** — então
eles tipam contra o zod que o app tem, seja 3 ou 4. Num workspace com o `be` no zod 3 (fastify-type-provider-zod) e
o `fe` no zod 4, a ponte de tipos que o motor precisou fazer **sai**: importe `parseEnv`/`parseResponse`/`fieldErrors`
de `@nomad/ui/data` direto. `zod@^4` continua peer do pacote (o app usa o próprio schema).

**`topBarModelSchema` nunca lança** (`v1.6.3`): `safeParse` devolve `{ success: false, error }` com issue (contrato
quebrado da Conta cai no seu tratamento de erro, não em `Error` crua); `parse` continua lançando. `apps` é validado
com o shape real, e `href` de link só aceita http(s) ou caminho relativo.

### Zustand

Só estado de tela: preferências (tema e paleta ficam no pacote), sidebar, toasts, paleta de comandos aberta, modo de
visão (lista/quadro), atalhos, flag de sessão encerrada. `persist` só para preferências. Seletor sempre
(`useUIStore((s) => s.sidebarState)`). Proibido: copiar resposta do servidor para store, "cache" próprio, store com `fetch`.

### Regras que a auditoria de 2026-10-01 tornou obrigatórias

Sete regras que o padrão já mandava de fato, mas nunca escreveu. Sem texto, quatro apps quebraram a mesma regra ao mesmo tempo. Todas com defeito real medido e com o gate que passa a pegar.

#### A1 — `.catch()` é proibido em schema Zod

**O que é.** `Schema.catch(valor)` transforma qualquer falha de parse no valor: campo ausente vira o valor, campo renomeado vira o valor, tipo errado vira o valor.

**Por que importa.** `agent-package/frontend/src/features/projects/api/projectSchemas.ts:24-28` usa `.catch(0)` nos cinco contadores e `.catch('')` na descrição (linha 35). O cabeçalho do mesmo arquivo declara que o propósito do schema é _"se o backend trocar o nome do campo, hoje a tela quebra em runtime; com o schema a query falha com `ResponseParseError` dizendo o campo e a rota"_. O `.catch()` anula exatamente isso: campo renomeado deixa de falhar, vira `undefined`, e o `.catch(0)` devolve `0`. A tela mostra **"0 CONHECIMENTOS"** com a confiança de um número lido do servidor. E `.catch()` aceita também tipo errado em silêncio — string onde o schema quer número passa.

**Como fazer certo.** `.catch()` só em campo **genuinamente opcional**, e **estreito**: nunca no meio do caminho, nunca em número que a tela exibe. Campo opcional de verdade se modela com `.optional()` e `?? valor` no transform, o que distingue "o servidor não mandou" de "o servidor mandou com outro nome" — o transform só roda depois que o parse passou.

**O teste que pega.** Teste que faz `Schema.parse` do payload real com o campo renomeado e exige que **lance** (`toThrow(ResponseParseError)`), em vez de exigir que devolva 0. Sem esse teste, reintroduzir o `.catch()` é uma linha a mais e nada reclama.

#### A2 — o schema do cliente é tão estrito quanto o do servidor

**O que é.** O schema Zod do formulário é a **cópia de leitura** do contrato do servidor. Se a cópia é mais permissiva, a validação do cliente não valida nada: o usuário preenche o formulário inteiro e só descobre o problema no 400 do servidor.

**Por que importa.** `load-balance/frontend/src/features/keys/components/keyForm.ts:150` aceita path relativo (`isHttpUrlOrPath`, definida na linha 158: `if (value.startsWith('/')) return true`), enquanto o backend usa `z.string().url()`. `'/api'` passa no formulário e o servidor devolve 400. O comentário do arquivo (linha 127) afirma _"Mesmo contrato do `createKeySchema` do backend"_, e na sequência diz que espelhar o backend é o ponto _"para que, se as duas pontas discordarem, o usuário só descubra no 400 do servidor"_ — a própria razão para o defeito estar ali.

**Como fazer certo.** `uuid()` e `datetime()` no cliente quando o servidor usa. `z.string()` cru só para campo que o servidor também trata como string livre. Comentário que afirma "mesmo contrato do backend" é uma asserção: vale como se fosse testada, porque vai divergir em silêncio se o servidor mudar.

**O teste que pega.** Teste que **compara os dois schemas**: a mesma entrada nos dois, o mesmo resultado. Uma tabela de casos por campo (válido, inválido, limite) roda contra o schema do cliente e contra o import do schema do servidor, e falha se divergirem. Sem ele, "mesmo contrato" é só uma frase.

#### A3 — variável de ambiente que governa segurança não tem default

**O que é.** `z.enum([...]).default(...)` numa variável de ambiente converte **ausente** em **valor**. Em variável de segurança, ausente tem que ser erro de boot, não valor.

**Por que importa.** `conta-nommand/backend/src/config/env.ts:9` tem `NODE_ENV: z.enum(['development', 'test', 'production']).default('development')`, e o serviço `DEV_MAILBOX` (linha 73) é opcional, com o consumidor fazendo `return env.DEV_MAILBOX ?? true` em `services/mailer.ts:34`. Com as variáveis ausentes, um deploy sobe em modo de desenvolvimento: a rota `GET /api/dev/mailbox` (`routes/devMailbox.ts:20`) devolve a caixa de e-mail inteira, com o link de redefinição de senha clicável, e o `redirect_uri` do OIDC passa a aceitar `http:` e `localhost` (`routes/apps.ts:27`).

O padrão mais perigoso é o **guard escrito na direção errada**: `if (NODE_ENV === 'production') throw` protege quando `NODE_ENV` é production e falha em silêncio quando não é — e é exatamente o caso em que a variável pode faltar. A forma correta é **negar por omissão e liberar explicitamente**: `if (NODE_ENV !== 'test') throw`.

**Como fazer certo.** Variável de segurança (`NODE_ENV`, flag de recurso, chave, URL pública, CORS) **sem default**: sem ela, o boot falha com mensagem que nomeia a variável. `devtools`, devtools de dado e rota de diagnóstico são **opt-in explícito** — a ausência desliga, e ligar é ato consciente.

**O teste que pega.** Teste que faz o parse da env **sem a variável** e exige que lance com mensagem que cite o nome dela. Segundo teste: com a variável ausente, afirmar que a rota de diagnóstico responde 404. A suíte com env completa não pega nada disso.

#### A4 — `dotenv` não sobrescreve a env do processo

**O que é.** `dotenvConfig({ override: true })` faz o `.env` do cwd ganhar de toda variável já presente em `process.env`. O orquestrador injeta env de container; o `.env` da máquina vira a fonte de verdade do deploy.

**Por que importa.** `motor/be/src/bootstrap/dotenv-once.ts:16` usa `dotenvConfig({ override: true })`, e `be/.env.example:124` traz `NODE_ENV=development` pronto para copiar. Um `.env` com essa linha reverte o ambiente do deploy inteiro: desliga `sslmode=require` do Postgres, deixa de exigir as chaves OIDC que só production exige, e passa a valer `OIDC_DEV_LINK_EMAIL` — **a pessoa cujo e-mail casar assume a identidade do usuário padrão, com a sessão aberta valendo**.

**Como fazer certo.** `override: false`, que é o padrão do dotenv: o `.env` preenche o que não foi definido e a env var do orquestrador sempre vence. E o `.env.example` **comenta** a linha sensível em vez de trazer valor pronto — o exemplo não pode ser o valor perigoso.

**O teste que pega.** Teste que faz `loadDotenvOnce()` num processo com `process.env.NODE_ENV = 'production'` e `NODE_ENV=development` no `.env`, e exige que o resultado continue `production`. Sem o teste, reintroduzir `override: true` passa em tudo, porque localmente a env já bate.

#### A5 — teto de tamanho só desce, e contra baseline commitado

**O que é.** `max-lines` do ESLint valida o arquivo contra um teto. Teto que mora **no mesmo arquivo que a regra** não é teto: quem edita o número edita o gate.

**Por que importa.** `load-balance/frontend/eslint.config.js:16-24` tem `SIZE_EXCEPTIONS` com o número exato de linhas de cada arquivo hoje, e o comentário (linha 14) diz que _"estas exceções só podem encolher, nunca crescer para acomodar código novo"_ — **mas nada verifica isso**. O teste (`frontend/src/test/sizeLimits.test.ts:33-40`) lê o teto do próprio config e valida o arquivo contra ele: garante que o arquivo cabe no teto, nunca que o teto não subiu. Editar `366` para `400` (linha 17) passa.

Pior é a medição errada. Os tetos do AgentPack vieram de `wc -l`, mas a regra conta **linhas de código** (`maxLines` em `frontend/eslint.config.js` passa `skipBlankLines` e `skipComments`): `src/api/render.ts` tem 491 linhas no `wc -l` e teto `407` (linha 107) — a exceção foi calibrada no algoritmo errado, e sobra folga que ninguém viu. Na branch `refactor/max-lines` o mesmo arquivo aparece com teto `676` e 203 linhas: configuração morta.

**Como fazer certo.** **Baseline commitado** com os tetos do dia, e o teste exige `atual <= baseline` — assim **subir teto quebra o teste**. Contar com o algoritmo que a regra usa (o mesmo ESLint, mesmo `skipBlankLines`/`skipComments`), nunca com `wc -l`. Arquivo acima do teto geral **quebra por responsabilidade**; exceção só com justificativa escrita no config. Teto que sobe não é teto.

**O teste que pega.** O próprio `sizeLimits.test.ts`, com uma leitura a mais: `expect(atual).toBeLessThanOrEqual(baseline)`, onde `baseline` é o arquivo commitado, e uma checagem de que nenhuma exceção tem folga ociosa (teto muito acima do arquivo é exceção para remover, não exceção para manter).

#### A6 — `test/` entra no typecheck

**O que é.** `tsconfig.json` com `include: ["src/**/*"]` faz o `tsc` não enxergar nada de `test/`. O teste roda (esbuild transpila sem checar tipo) e nunca é typecheckado.

**Por que importa.** `conta-nommand/backend/tsconfig.json:23` tem `include: ["src/**/*"]`, então `npx tsc --noEmit --listFilesOnly | grep -c "backend/test/"` dá **0** — os 24 arquivos de teste do backend nunca são typecheckados. O mesmo no load-balance (`backend/tsconfig.json:23`, 117 arquivos de teste): 420 ocorrências de `as any` em código que nenhum compilador lê. Cast em arquivo que o `tsc` não vê é tipo mentiroso sem fiscal: documenta uma mentira que nada pode contestar. O AgentPack já acerta — `backend/tsconfig.json:21` lista `["src", "tests", "prisma", "scripts", "jest.config.ts"]`, com o comentário de que nenhum diretório de código fica de fora.

**Como fazer certo.** `include` cobre `src`, `test`/`tests` e os configs. E o typecheck du CI roda o mesmo `tsc --noEmit` que o dev roda, senão o gate local e o gate do CI medem coisas diferentes.

**O teste que pega.** Script no `typecheck` que roda `tsc --noEmit --listFilesOnly` e **falha se a contagem de arquivos sob `test/` for zero** — é o que impede o `include` de voltar a excluir o diretório sem ninguém perceber. O `tsc` sozinho não pega o próprio apagamento.

#### A7 — helper de teste não engole status HTTP

**O que é.** `Client.req` que devolve `{status, body, headers}` sem lançar em 4xx/5xx esconde o erro de quem chama. Quando o resultado é descartado — um `await` sem atribuição, num `describe` de setup — o 404 vira silêncio.

**Por que importa.** `conta-nommand/backend/test/helpers.ts:83` termina em `return { status: res.statusCode, body: json as any, headers: res.headers }`, sem lançar. O alcance, medido: **176 chamadas** a `client.*` no `test/`, das quais **93 descartam o resultado**, **64 em método que muda estado** (post/put/patch/del, entre elas PUT de app, switch-org e convites), espalhadas por 12 dos 22 arquivos de teste.

O caso que expõe está em `test/topbar.integration.test.ts:380`: o comentário diz _"Uma notificação não lida: é o que o sino da barra mostra"_ e a linha faz `POST /api/organizations/:orgId/apps/:appId` — **rota que não existe**. O helper engole o 404, `unread` fica 0, e a asserção seguinte (`expect.any(Number)`) aceita 0. O teste passa sem criar o objeto que ele afirma criar.

**Como fazer certo.** Helper de teste **lança em status >= 400** por padrão, com opção explícita e nomeada (`expectStatus(404)`, `raw: true`) para os testes que **querem** o erro — assim a exceção é visível no código do teste. E asserção que diz "tem um X" **afirma o valor**; `expect.any(Number)` aceita zero, então não afirma nada sobre a coisa que o teste diz ter criado.

**O mesmo vale para o CI.** Os 4 apps rodam as duas metades do pacote, não só o frontend. Sem isso a regra acima não se sustenta: helper que engole erro só é descoberto quando os testes que dependem dele rodam. Ver a seção 12.

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

O `Header` do app monta a barra pelo **`TopBarModel`** (Padrão SSO Nomad v1 §10): o backend do app expõe
`GET /api/auth/oidc/topbar` (que repassa o endpoint da Conta), o front valida a resposta com `topBarModelSchema` e passa
o objeto para `<TopBar model={…}>`. Com o model, o pacote monta as 3 peças padrão — seletor de empresa, grade de apps
e menu da conta — mais o menu de Ajuda e o sino de notificações, **sem nenhum item hard-coded pelo app**. O app passa
marca, busca (centro) e ações próprias (Paleta, Busca Ctrl K) nos slots, mais `onSwitchOrg` (troca = `/auth/sso?org=<id>`) e
`onSignOut`. Detalhes do contrato e da tabela model × app: página "Padrão SSO Nomad v1" §10.

Nenhum app chama a Conta pelo navegador. Aceite: captura lado a lado com a Conta, mesma largura, grade de apps e menu da
conta abertos — as três peças têm que ser idênticas, mudando só o tema.

**`launcherLinks` são o rodapé da grade** (`v1.6.2`): links de texto com ícone pequeno numa linha abaixo dos tiles,
com "Gerenciar sua Conta Nommand" no fim — como a Conta mostra, e não como tiles iguais aos apps.

**Links de menu navegam** (`v1.6.3`): item com `href` e sem callback (Gerenciar, `accountLinks`, `helpLinks`) segue o
link no clique normal; o `preventDefault()` só acontece quando o app passou `onSelect`/`onNavigate` (navegação SPA).

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

## 12. Gate que não existe é gate que não pega

A auditoria de 2026-10-01 encontrou que metade dos problemas que "ninguém viu" não era código errado: era gate ausente, ou gate escrito e nunca exercitado. Um gate que não roda é decoração — dá a mesma sensação de segurança que um gate que passa, e nenhuma das duas coisas.

Casos deste repositório, todos verificados:

- **Motor — o `test` da raiz não testava o backend.** `package.json:22` tinha `"test": "npm -w fe run test"`: os 45 arquivos de teste do `be` nunca rodavam, dentro de um `gates` que os executava todo. O backend era typecheckado e nunca testado. Corrigido em `ef4b6f4` e na lane que subiu o serviço de banco no CI.
- **Motor — `engines.node` não era gate em lugar nenhum.** O CI rodava `npm ci` без `--engine-strict`, e o npm **ignora `.npmrc` de workspace** (avisa `ignoring workspace config`): os dois `.npmrc` com `engine-strict=true` eram inertes. Só os Dockerfiles reprovavam. Corrigido em `cc23baf`.
- **Motor — `HEALTHCHECK` nunca exercitado.** O CI não tinha `docker build`, e o `compose.prod.yml` sobrescreve o healthcheck da imagem, então o da imagem só aparecia no `docker run` de alguém. Resultado: `/health` (a rota real é `/healthz`, `be/src/routes/health.ts:85`) ficou errado semanas. Corrigido na lane do healthcheck.
- **Motor — CI vermelho com nenhum gate rodado.** O job morria no passo 3 de 10 (`setup-node` com `22.23-alpine`, que é tag de imagem Docker e não existe no catálogo do setup-node). `Install`, `Typecheck`, `Lint`, `Test`, `Build` e `Cycles` ficaram `skipped` por 5 horas — **6 gates marcados como pulados com o job vermelho**, lido de longe como "passou 3 de 10". Corrigido em `ef4b6f4`.
- **Load-balance — 135 testes de segurança que ninguém executa.** O CI é só `frontend-gates.yml`, com `working-directory: frontend`: os 117 arquivos de teste do backend nunca rodam. Dentro deles, 13 arquivos (`tenantIsolation`, `rbacMemberMatrix`, `proxyKeyMatrix`…) são pulados por `describe.skipIf`, que depende de `TENANCY_IT_DATABASE_URL` e `REDIS_URL` — variáveis que nem o `backend/vitest.config.ts` nem o workflow definem. São 135 casos de teste que o verde do CI não cobre.
- **Conta Nommand — não tinha workflow nenhum.** Nem frontend nem backend rodavam em CI. Corrigido em `018b9f5`, com `backend` e `frontend` em jobs separados.

**Checklist — responda antes de confiar no seu CI:**

1. Todo script de gate roda **de verdade** no CI, não só local? (`npm run test` na raiz aponta para o pacote certo?)
2. Cada job roda **todas** as partes do pacote (frontend **e** backend), e o nome do job diz qual?
3. As condições de `skip`/`skipIf` dos testes: a variável que elas exigem **está no `env:` do job**? Se não, o teste nunca roda e ninguém vê.
4. O job **falha** quando um passo de setup cai, ou os passos seguintes ficam `skipped` em silêncio?
5. O `test/` está no `include` do `tsconfig`, e o typecheck do CI é o mesmo que o do dev?
6. Existe `docker build`, `docker run` e smoke test no CI, fora do compose?
7. O `HEALTHCHECK` das imagens é exercitado **fora** do `compose.prod.yml` (que sobrescreve o da imagem)?
8. O número de testes **executados** é visível no log do CI, e é o que eu comparo com o esperado?

## 13. Checklist de migração de um app

1. Instalar `@nomad/ui` (v1.6.3 ou acima) e os peers; trocar o tema (`@import '@nomad/ui/theme.css'`, providers e boot do pacote).
2. Trocar a barra pelo `@nomad/ui/topbar` com `model={…}` (validado com `topBarModelSchema`); apagar `src/shared/nomad-topbar/` e `scripts/sync-nomad-topbar.sh`.
3. Trocar o kit local pelo do pacote e apagar `src/components/ui/` (e Astryx/StyleX, se houver).
4. Trocar cliente HTTP e QueryClient pelas fábricas do `@nomad/ui/data`.
5. Presets de tsconfig, ESLint e Prettier; subir Vite/TS/Node para as versões da seção 2.
6. Reorganizar pastas (seção 4) e aplicar as regras de dados (seção 5).
7. Gates e CI (seção 11).

A lista por app, com tamanho, está em [auditoria-apps.md](./auditoria-apps.md).
