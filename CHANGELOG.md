# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

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
