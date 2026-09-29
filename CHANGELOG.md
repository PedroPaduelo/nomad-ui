# Changelog

Todas as mudanças do `@nomad/ui`. Versões por tag semver na `main` (`vX.Y.Z`); os apps instalam por
dependência git numa tag. Tag publicada nunca é movida nem apagada: correção sai em versão nova.

## [Unreleased]

### Adicionado

- Presets `@nomad/ui/tsconfig`, `@nomad/ui/eslint` (ESLint flat config com TypeScript, React Hooks, jsx-a11y e TanStack Query) e `@nomad/ui/prettier`.
- Consumer mínimo em `examples/consumer`: instala por dependência git, valida o `prepare`/build e exerce `@nomad/ui/data` contra MSW.
- Barra Nomad `@nomad/ui/topbar` — `TopBar`, `TopBarBrand`, `OrgSwitcher`, `AppSwitcher`, `AppGrid`, `AppIcon`, `AccountMenu`, `Avatar`, `Popover`, helpers e tipos (mesma API do `@nomad/topbar` da Conta, tag `topbar-v1.0.0`). CSS importado explicitamente via `@nomad/ui/topbar.css`.
- `open` / `onOpenChange` opcionais em `AppSwitcher` e `AccountMenu` para controle externo, preservando o comportamento uncontrolled padrão; a vitrine usa isto para demonstrar menus abertos.
- O `scripts/sync-nomad-topbar.sh` da Conta fica obsoleto quando os apps migrarem para `@nomad/ui/topbar`; a remoção do script é task da Conta.

- Esqueleto do pacote: build em modo biblioteca (Vite 8), tipos (`tsc`), vitest, ESLint e Prettier.
- Docs: "Padrão Frontend Nomad v1" (`docs/padrao-frontend.md`) e a auditoria dos 4 apps contra ele (`docs/auditoria-apps.md`).
- `@nomad/ui/data`: `createQueryClient` (staleTime 60 s, gcTime 5 min, retry 1 salvo 401, `refetchOnWindowFocus: false`), `createHttpClient` com `getToken` assíncrono (Conta), `getHeaders` (CSRF/loadbalance), `requestId` por requisição, `skipSessionExpiry`, single-flight `refreshSession` + retry, `onUnauthorized`, `onResponse`/`onNetworkError` (ganchos do monitor de conectividade do agent-package). `ApiError` + predicados (`isUnauthorizedError`, `isForbiddenError`, `isNotFoundError`, `isConflictError`, `isValidationError`, `isNetworkError`, `getErrorMessage`, `fallbackErrorMessage`). `createQueryKeys('entidade', extra)` para chaves em hierarquia. `parseResponse`/`responseParser`/`ResponseParseError`, `parseEnv`/`EnvError`, `fieldErrors`. `createScreenStore` (Zustand só para estado de tela: preferências persistidas, `reset`/`patch`). `QueryProvider` e `safeNextPath`. `generatedClientConfig` para o client do `@hey-api/openapi-ts`. Testes com msw. Levantamento em `src/data/README.md`.
