# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

## [1.5.2] — 2026-09-30

Patch (PKG-FIXES #6 e #7, reportados pela `[CONTA] CONTA-MIG-02` `1aa3522b`). Aditivo: nenhuma chamada existente quebra.

### Corrigido

- **`@nomad/ui/topbar` volta a exportar o contrato canônico** (PKG-FIXES #6). O barrel `src/topbar/index.ts` não re-exportava `./topBarModel`, então `import { topBarModelSchema } from '@nomad/ui/topbar'` vinha **undefined** e os apps não conseguiam validar a resposta da Conta. Exporta agora `topBarModelSchema` e os tipos `TopBarModel`, `TopBarModelInput`, `TopBarProfile`, `TopBarAccount`, `TopBarAccountOrg`, `TopBarOrgOption`, `BarLink`, mais os schemas auxiliares (`barLinkSchema`, `topBarProfileSchema`, `topBarAccountSchema`, `topBarAccountOrgSchema`, `topBarOrgOptionSchema`).
- **401 de credencial recusada não derruba mais a pessoa** (PKG-FIXES #7). `createHttpClient` tratava QUALQUER 401 com o token atual como "sessão vencida": um `401 { error: 'invalid_credentials' }` de `POST /auth/login` (senha errada no MFA disable) disparava `refreshSession` + `onUnauthorized` e deslogava quem estava tentando entrar.

### Adicionado

- **`HttpClientOptions.isSessionExpired?(error)`**: decide se um 401 é sessão vencida. Padrão (`defaultIsSessionExpired`, exportado): 401 cujo `body.error` não está em `{ invalid_credentials, invalid_password, mfa_token_invalid, invalid_mfa_code, mfa_required }`. Passe a sua se o backend usar outros códigos de credencial.
- **`UnauthorizedContext.refreshError?`**: o que o `refreshSession` lançou quando o auto-refresh foi tentado e falhou. Antes o `catch` engolia o erro e o `onUnauthorized` só recebia o 401; agora o app sabe se o refresh foi recusado pelo IdP ou se a rede caiu. `undefined` quando não houve refresh.

### Testes

- `publicExports.test.ts` (novo): importa pelo barrel público e confere que `topBarModelSchema` e os schemas auxiliares são funções, e que o shape legado monta o `account`.
- `httpClient.test.ts`: +11 testes (5 códigos de credencial via msw com o repro real, 401 sem `errorCode` ainda sendo sessão vencida, `token_expired` ainda renova/desloga, `isSessionExpired` custom, `refreshError` chegando ao `onUnauthorized`, refresh ok repetindo com o token novo).
- Vitest 127/127 (era 114/114 na 1.5.1).

### Consumidores
Conta (`[CONTA] CONTA-MIG-02`): pode validar com `topBarModelSchema` vindo de `@nomad/ui/topbar`; o login com senha errada não desloga mais. Apps que já usavam `topBarModelSchema` de um import direto de `src/topbar/topBarModel` passam a usar o sub-path público.

## [1.5.1] — 2026-09-30

Republicação do conteúdo da v1.5.0. A tag `v1.5.0` foi criada no commit errado
(`114e667`, que é o da v1.4.1): quem instalava `#v1.5.0` recebia o pacote da
1.4.1 — sem `TopBarModel`/`topBarModelSchema` e sem o fix do brand mark
(`--mark-bg`/`--mark-on`). O conteúdo nunca esteve errado; a tag apontava para
o commit errado. Tags publicadas não se movem (regra do dono), então a
correção sai em versão nova: use `#v1.5.1`.

Nada muda em relação à 1.5.0 para quem usa a `main`: é o mesmo código, com a
versão do `package.json` correta.

### Corrigido

- **`v1.5.1` republica o conteúdo da `v1.5.0`** (`TopBarModel` + `topBarModelSchema`
  + fix do logo), na `main` `6b1699d` e seguintes.

### Checklist de release (novo)

- Antes de avisar a tag como publicada: `git rev-list -n1 <tag>` tem que ser o
  commit do release **e** `git show <tag>:package.json` tem que trazer a
  versão certainada. Bug reportado pelo motor em 2026-09-30.

## [1.5.0] — 2026-09-30

Minor aditivo (NUI-04 / TOPBAR-PARITY-01 `904e24cf`). Define o **modelo de dados canônico da barra Nomad** (`TopBarModel`) e o Zod schema (`topBarModelSchema`) que os apps usam para validar a resposta de `GET /api/oidc/topbar`. A `[CONTA] [TOPBAR-PARITY-02] c689a5ec` implementa o endpoint com este contrato; cada app migra nas tasks `[LB] NUI-MIG-02b` / `[AP] NUI-MIG-04b` / `[MOTOR] NUI-MIG-03b`. Inclui também o fix visual do brand mark (vitrine mostrava ícone preto sólido no claro).

### Adicionado

- **`TopBarModel` + tipos auxiliares** (`src/topbar/topBarModel.ts`): `apps`, `organization`, `organizations`, `account`, `launcherLinks`, `accountLinks`, `helpLinks`, `createOrgUrl`. Compatível com o `TopbarData` legado (v1.0.x): `profile` + `accountUrl` continuam reconhecidos.
- **`topBarModelSchema` (Zod 4)**: valida a resposta do backend e transforma para o shape canônico. Aceita o shape legado.
- **Tokens `--mark-bg` / `--mark-on`** na paleta (`paletteCssVars`): padrão seguro por modo (`#0b1220`/`#0f172a` bg, `#f8fafc`/`#fff` on). Quem usava `var(--mark-bg)` na SVG do logo da org parou de cair em preto/currentColor — vitrine e apps passam a renderizar o mark com a cor certa.
- **README** (`src/topbar/README.md`): contrato, exemplo de uso, decisões, lista de tipos exportados.

### Testes

- `topBarModel.test.ts` (novo): 5 testes — shape canônico, shape legado, validação de `manageAccountHref`, campos opcionais, rejeição de `launcherLink` sem label.
- Vitest 114/114 (era 109/109).

## [1.4.1] — 2026-09-30

Patch visual do `Progress` (reportado pelo dono na vitrine logo após a v1.4.0). Trilha agora ocupa a largura toda do pai por padrão (`w-full`), evitando que o `flex` do contêiner colapse o componente para 0 px quando o pai não força largura. Comportamento de quem passava largura explícita (`className="w-32"` ou wrapper com largura) preservado.

### Corrigido

- **`Progress` colapsava para 0 px de largura dentro de containers `flex`** (mostrado na seção Progress da vitrine: 5 tons apareciam sem fill porque a trilha tinha largura 0). Adicionado `w-full` ao root.

### Testes

- `progress.test.tsx`: 1 asserção nova (root tem `w-full`); demais inalteradas.
- Vitest 109/109.

## [1.4.0] — 2026-09-30

Minor aditivo (PKG-FIXES #5, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). Mudança aditiva — nenhuma chamada existente quebra.

### Adicionado

- **`Progress.tone?`**: tom do preenchimento. Mapeia para `bg-status-{success,warning,error,info}` ou `bg-accent` no fill, com `data-tone` no root. Antes, `className` ia só na trilha e o fill era sempre `bg-status-success` — apps precisavam pintar o fill via className próprio (o contorno sai).
- **`Progress.fillClassName?`**: classes extras no fill (ex.: `opacity-50` durante polling).
- Tipo exportado `ProgressTone`.

### Testes

- `progress.test.tsx` (novo): 8 testes — default `success`, `warning`/`error`/`accent`/`info`, `fillClassName`, `className` segue na trilha, clamp de `value` em [0, 100] refletido em `aria-valuenow`.
- Vitest 109/109 (era 101/101).
- Vitrine: nova seção "Progress" com os 5 tons.

## [1.3.0] — 2026-09-30

Feature aditiva (PKG-FIXES #3b, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). API 100% compatível com o wrapper do load-balance (`toast.success/error/info/warning` + `<Toaster/>`) — a troca no MIG-02b é só de import. Dependência nova: `sonner` (Sonner 2.x).

### Adicionado

- **`Toaster`** (`src/components/ui/Toaster.tsx`) — wrapper Sonner 2.x com os tokens da paleta ativa. Lê o `theme` do `useResolvedTheme()` automaticamente (sem precisar passar `theme` por prop). Posição e offset configuráveis; padrão `bottom-right`. `richColors` + `closeButton` sempre ligados.
- **`useToast()`** (`src/components/ui/useToast.ts`) — referência CONSTANTE (`success`, `error`, `warning`, `info`, `loading`, `dismiss`, `promise`) segura pra usar como dependência de hooks. Alias `useNotify` (legado) exportado.
- **Vitrine**: nova seção "Toasts" (`examples/showcase/src/sections/toasts/`) com 5 botões (um por tom + dismiss). `Toaster` global montado em `App.tsx`.

### Tokens injetados

- `--normal-{bg,border,text}` → tokens neutros da paleta (`--surface-raised`, `--color-border`, `--color-text-primary`).
- `--{success,error,warning,info}-{bg,border,text}` → tom da paleta via `color-mix(... 12% / 30% / cheia)`. Mesma fórmula do wrapper do load-balance e do `MainLayout` do agent-package.
- `--border-radius` → `--radius-control`.

### Testes

- `toast.test.tsx` (novo): 7 testes — referência estável do hook, todas as funções expostas, região renderizada, tema injeta CSS vars com `color-mix` (não cores hardcoded), clique dispara `[data-sonner-toast]`, `position` customizada aceita.
- Vitest 101/101 (era 94/94).

## [1.2.0] — 2026-09-30

Minor aditivo (PKG-FIXES #4, reportado pela `[CONTA] [CONTA-MIG-02] 1aa3522b`). Mudança aditiva: novos campos opcionais em `ApiError`, nenhum campo existente muda de tipo ou de nome. Apps que já discriminam por `error.details` continuam funcionando.

### Adicionado

- **`ApiError.errorCode?: string`** — `body.error` quando for string (ex.: `invalid_credentials`, `mfa_required`, `token_expired`, `version_conflict`). É o que a Conta usa para escolher a tela/fluxo certo em 401/409/etc. `undefined` quando o corpo não tem `error` ou não é string.
- **`ApiError.body?: unknown`** — corpo bruto da resposta (`response.data` do axios). `undefined` quando não houve resposta (rede/tempo). Use quando precisar ler campos além de `error`/`message`/`details`.

### Compatibilidade

- `ApiError` agora aceita dois argumentos opcionais a mais no construtor (`errorCode`, `body`), depois dos existentes (`message`, `status`, `details`, `requestId`, `code`). Quem chama `new ApiError(...)` com os 5 primeiros argumentos continua igual.
- `httpClient` agora preenche `errorCode`/`body` automaticamente a partir do corpo da resposta.

### Testes

- `apiError.test.ts` (novo): 4 testes — repro literal da Conta (`POST /auth/login 401 { error: "invalid_credentials" }`), corpo sem `error`, `error` não-string (ignorado), `ERR_NETWORK` (sem corpo).
- Vitest 94/94 (era 90/90).

## [1.1.2] — 2026-09-30

Bugfix do `Menu` (PKG-FIXES #3a, reportado pela `[LB] [NUI-MIG-02] 0b537df0`). Mudança aditiva — nenhuma chamada existente quebra.

### Corrigido

- **`<Menu disabled>` agora desativa o gatilho de verdade.** A nova prop `disabled?: boolean` em `MenuProps` é passada para `BaseMenu.Root` e `BaseMenu.Trigger`: o `<button>` recebe o atributo HTML `disabled` (e `data-disabled` do Base UI) e o painel não abre. Antes, o `disabled` era ignorado pelo `Menu` e o loadbalance contornava com `pointer-events-none opacity-60` em Toolbar, ConfigsTable, KeyRowActions, GroupsPage e Page. Esse contorno sai quando o app migrar.

### Documentação

- JSDoc da prop `button` agora avisa que **é só o conteúdo do gatilho** — o `MenuTrigger` já renderiza um `<button>` (atributo HTML), e passar `<button>` aqui gerava `<button><button>…</button></button>` (inválido). Os apps que faziam isso podem voltar ao normal (texto/ícone).

### Testes

- `menu.test.tsx` (novo): 2 testes — `disabled` desativa e impede abrir; sem `disabled` o gatilho abre normalmente.
- Vitest 90/90 (era 88/88).

## [1.1.1] — 2026-09-30

Bugfix de segurança do `@nomad/ui/data` (PKG-FIXES #2, reportado pela `[AP] [NUI-MIG-04] c8e002e1`). Nenhuma API existente muda para quem já usa `withCredentials: true` na mesma origem/baseURL. Apps que dependem do cookie cross-host (nenhum hoje) precisam ligar `withCredentialsCrossOrigin: true` explicitamente.

### Corrigido

- **`withCredentials` agora é por origem**, não mais global. Com `withCredentials: true`, o cookie de sessão só vai para a mesma origem/baseURL do client — antes, o cookie ia também para qualquer URL absoluta de outro host (`https://evil.example/…`, `//evil.example/…`), o que vazava a credencial para fora da API. URLs absolutas de outro host passam a ser enviadas **sem cookie** (padrão seguro). Opt-in explícito: `withCredentialsCrossOrigin: true` no `createHttpClient` para apps legadas que confiam no host cross-origin.
- **`onUnauthorized` (e `refreshSession`) deixa de disparar em 401 de uma chamada que levou `Authorization` próprio num client sem `getToken`** (sessão por cookie). Antes, `(!getToken || ...)` ficava sempre `true` e qualquer 401 de uma chamada com Bearer próprio derrubava a sessão por cookie. Agora, no client de cookie, "a sessão atual" só é verdade quando a chamada **não** levou credencial própria — uma chamada com `Authorization: Bearer apk_revogada` recebe o 401 e propaga; o cookie de sessão segue intacto.

### Adicionado

- Opção `withCredentialsCrossOrigin?: boolean` em `HttpClientOptions` — opt-in explícito para reativar o comportamento antigo em chamadas cross-host (uso raro; exige confiança no host destino).

### Testes

- `httpClient.test.ts`: 5 testes novos (cross-host, opt-in, sessão por cookie + credencial própria, refresh + credencial própria + cookie, repro literal da `[AP]`). Vitest 88/88.

## [1.1.0] — 2026-09-30

Minor aditivo (PKG-FIXES #1, reportado pela NUI-MIG-02 do loadbalance): sete componentes que a auditoria da NUI-04 prometia para a v1.0.0 e não estavam no pacote. Nenhum nome, token, prop ou export existente muda; quem está na v1.0.x atualiza sem alteração.

### Adicionado

- `Switch` (+ `switchTrackVariants`, `SwitchProps`) — liga/desliga APG "Switch" sobre `@base-ui/react/switch`, com `label`/`description` ou `aria-label`, tamanhos `sm`/`md`.
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` (+ `tableRowVariants`, tipos `TableProps`, `TableRowProps`, `TableRowTone`, `TableHeaderCellProps`, `TableCellProps`, `TableSort`) — tabela semântica, cabeçalho ordenável com `aria-sort`, tons de linha `default`/`selected`/`highlight`/`danger`.
- `Pagination` (+ `PaginationProps`) — faixa "26–50 de 1.234", Anterior/Próxima com nome acessível e pontas desabilitadas; rótulos e formatação trocáveis.
- `Banner` (+ `bannerVariants`, `BannerProps`, `BannerTone`) — aviso `info`/`success`/`warning`/`error` com título, descrição, ação e dispensar.
- `MultiSelect` (+ `MultiSelectProps`, `MultiSelectOption`) — seleção múltipla em `Popover` com busca opcional e resumo da seleção.
- `CodeBlock` (+ `highlightJson`, `CodeBlockProps`) — bloco de código em região rolável focável, realce de JSON e botão de copiar.
- `StatusDot` (+ `statusDotVariants`, `StatusDotProps`, `StatusDotTone`) — ponto de status `success`/`warning`/`error`/`info`/`accent`/`neutral`, com `pulse` e nome acessível opcional.

Fonte: `PedroPaduelo/load-balance` em `0d728c1` (`frontend/src/components/ui/*`), só com o alias `@/lib/utils` trocado pelo caminho relativo. Todos usam tokens do tema e Base UI.

### Testes

- Unitários (`src/components/ui/__tests__/*`): 20 testes (os 6 do loadbalance + bordas da `Pagination`).
- `axe a11y` em `src/__tests__/kit-extras.browser.test.tsx`: os 7 componentes com todos os tons, **11 paletas × claro/escuro (22 casos), 0 violação**. Total do `test:a11y`: 182/182.
- `vitest.a11y.config.ts` pré-otimiza as entradas `@base-ui/react/*` (`optimizeDeps.include`) para o Vite não recarregar a suíte na primeira otimização.

## [1.0.1] — 2026-09-30

Patch aditivo: 11ª paleta oficial do @nomad/ui. Compatibilidade total — nenhum nome de paleta, token, componente, prop ou export existente muda. Apps que já estavam na v1.0.0 continuam funcionando sem alterações.

### Adicionado

- Paleta **`nommand`** (a 11ª, aditiva) — design v2 "Institucional" da Conta Nommand, aprovado pelo dono (2026-09-30). Mesmo formato das outras 10 (accent azul institucional + amber + status + bordas + onAccent explícito). Seletor de paletas da vitrine agora mostra as 11; `ThemeSwitcher`, `PALETTES`, `PaletteId`, `getPaletteById`, `paletteCssVars` cobrem a 11ª automaticamente.

### Testes

- `axe a11y` cobre agora **11 paletas × claro/escuro** em sidebar (40 testes), header (60), mainlayout (40) e topbar (20) — total **160/160**, 0 violação. Antes: 1 paleta × claro/escuro nos 3 primeiros e 10 no topbar (34 testes).
- Vitest 63/63.

## [1.0.0] — 2026-09-29

Primeira versão pública do `@nomad/ui`. Marca o fechamento do épico NUI-00 (NUI-01 fundação, NUI-02 barra Nomad, NUI-03 dados + presets, NUI-04 documento + auditoria). Apps instalam por dependência git na tag `v1.0.0`.

### Adicionado

- Peças do app shell lateral (`@nomad/ui`) — `Sidebar`, `Header`, `Breadcrumb`, `HeaderUserMenu` e `MainLayout` trazidas do agent-package (Spec 03/04) com a mesma UX visual (larguras `--sidebar-width` / `--sidebar-collapsed-width`, drawer em mobile, focus trap, `inert` quando fechado, h-12 no header, `--content-max` no main) mas desacopladas do produto: nav via `SidebarSection[]` + `SidebarItem`, brand/workspace switcher opcionais, slots por prop no `Header` (brand, commandBar, mobileSearch, actions), `HeaderUserMenu` recebe `user` + callbacks, `Breadcrumb` recebe `items[]` por prop, `MainLayout` é dono do estado da sidebar e do `onNavigate`. Tokens do tema (`--surface-*`, `--color-*`, `--text-*`, `--border-*`, `--sidebar-*`, `--backdrop-bg`) — nada de cor hardcoded. Exports: `Sidebar`, `Header`, `Breadcrumb`, `HeaderUserMenu`, `MainLayout` e tipos `SidebarItem`, `SidebarSection`, `SidebarBrand`, `SidebarProps`, `HeaderProps`, `BreadcrumbItem`, `BreadcrumbProps`, `HeaderUserMenuUser`, `HeaderUserMenuProps`, `MainLayoutProps`, mais as constantes `SIDEBAR_MOBILE_QUERY` e `SIDEBAR_MOBILE_ID`. Testes axe em 1 paleta × claro/escuro em `src/__tests__/{sidebar,header,mainlayout}.browser.test.tsx`.
- Presets `@nomad/ui/tsconfig`, `@nomad/ui/eslint` (ESLint flat config com TypeScript, React Hooks, jsx-a11y e TanStack Query) e `@nomad/ui/prettier`.
- Consumer mínimo em `examples/consumer`: instala por dependência git, valida o `prepare`/build e exerce `@nomad/ui/data` contra MSW.
- Barra Nomad `@nomad/ui/topbar` — `TopBar`, `TopBarBrand`, `OrgSwitcher`, `AppSwitcher`, `AppGrid`, `AppIcon`, `AccountMenu`, `Avatar`, `Popover`, helpers e tipos (mesma API do `@nomad/topbar` da Conta, tag `topbar-v1.0.0`). CSS importado explicitamente via `@nomad/ui/topbar.css`.
- `open` / `onOpenChange` opcionais em `AppSwitcher` e `AccountMenu` para controle externo, preservando o comportamento uncontrolled padrão; a vitrine usa isto para demonstrar menus abertos.
- O `scripts/sync-nomad-topbar.sh` da Conta fica obsoleto quando os apps migrarem para `@nomad/ui/topbar`; a remoção do script é task da Conta.

- Esqueleto do pacote: build em modo biblioteca (Vite 8), tipos (`tsc`), vitest, ESLint e Prettier.
- Docs: "Padrão Frontend Nomad v1" (`docs/padrao-frontend.md`) e a auditoria dos 4 apps contra ele (`docs/auditoria-apps.md`).
- `@nomad/ui/data`: `createQueryClient` (staleTime 60 s, gcTime 5 min, retry 1 salvo 401, `refetchOnWindowFocus: false`), `createHttpClient` com `getToken` assíncrono (Conta), `getHeaders` (CSRF/loadbalance), `requestId` por requisição, `skipSessionExpiry`, single-flight `refreshSession` + retry, `onUnauthorized`, `onResponse`/`onNetworkError` (ganchos do monitor de conectividade do agent-package). `ApiError` + predicados (`isUnauthorizedError`, `isForbiddenError`, `isNotFoundError`, `isConflictError`, `isValidationError`, `isNetworkError`, `getErrorMessage`, `fallbackErrorMessage`). `createQueryKeys('entidade', extra)` para chaves em hierarquia. `parseResponse`/`responseParser`/`ResponseParseError`, `parseEnv`/`EnvError`, `fieldErrors`. `createScreenStore` (Zustand só para estado de tela: preferências persistidas, `reset`/`patch`). `QueryProvider` e `safeNextPath`. `generatedClientConfig` para o client do `@hey-api/openapi-ts`. Testes com msw. Levantamento em `src/data/README.md`.
