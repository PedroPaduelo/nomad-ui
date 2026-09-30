/**
 * @nomad/ui/topbar: a barra superior padrão Nomad (Padrão SSO Nomad §10), trazida do `@nomad/topbar` da Conta
 * Nommand (tag `topbar-v1.0.0`, CONTA-24) com a mesma API pública. Só React (peer) e CSS por variáveis; sem busca de
 * dados.
 *
 * O CSS NÃO vem por este import (o build de biblioteca não carrega CSS no JS): o app importa
 * `@nomad/ui/topbar.css` uma vez, no `main.tsx` ou no CSS global (`@import '@nomad/ui/topbar.css';`).
 */
export { TopBar, TopBarBrand, type TopBarProps, type TopBarBrandProps } from './TopBar'
export {
  AppSwitcher,
  AppGrid,
  AppIcon,
  type AppSwitcherProps,
  type AppTile,
  type LauncherApp,
  type RenderAppIcon,
} from './AppSwitcher'
export { OrgSwitcher, OrgMark, type OrgSwitcherProps, type TopbarOrganization } from './OrgSwitcher'
export { AccountMenu, Avatar, type AccountMenuProps } from './AccountMenu'
export { Popover, usePopoverClose, type PopoverProps, type PopoverTriggerProps } from './Popover'
// Contrato canônico da barra: tipo + schema Zod (v1.5.0). Sem estes exports o
// `import { topBarModelSchema } from '@nomad/ui/topbar'` dos apps vinha
// `undefined` (achado pela [CONTA] em 2026-09-30, PKG-FIXES #6).
export {
  topBarModelSchema,
  topBarProfileSchema,
  topBarAccountSchema,
  topBarAccountOrgSchema,
  topBarOrgOptionSchema,
  barLinkSchema,
  type TopBarModel,
  type TopBarModelInput,
  type TopBarProfile,
  type TopBarAccount,
  type TopBarAccountOrg,
  type TopBarOrgOption,
  type BarLink,
} from './topBarModel'
export { initials, roleLabel, toneOf, type MenuItemSpec } from './shared'
export { launchHref } from './launchHref'
export { fetchLauncherApps, type FetchLauncherOptions } from './fetchLauncherApps'
export type { TopbarData } from './types'
