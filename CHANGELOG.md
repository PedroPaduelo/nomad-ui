# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

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
