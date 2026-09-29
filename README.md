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
