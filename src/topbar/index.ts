/**
 * @nomad/ui/topbar: a barra superior padrão Nomad (Padrão SSO Nomad §10), trazida do `@nomad/topbar` da Conta
 * Nommand (tag `topbar-v1.0.0`, CONTA-24) com a mesma API pública. Só React (peer) e CSS por variáveis; sem busca de
 * dados.
 *
 * O CSS NÃO vem por este import (o build de biblioteca não carrega CSS no JS): o app importa
 * `@nomad/ui/topbar.css` uma vez, no `main.tsx` ou no CSS global (`@import '@nomad/ui/topbar.css';`).
 */
export {
  TopBar,
  TopBarBrand,
  TopBarModelBrand,
  NommandMark,
  type TopBarProps,
  type TopBarBrandProps,
  type TopBarModelBrandProps,
} from './TopBar'
export { TopBarModelBar, type TopBarModelBarProps } from './TopBarModelBar'
export {
  NotificationsButton,
  notificationsLabel,
  type NotificationsButtonProps,
} from './NotificationsButton'
export {
  topBarModelSchema,
  topBarProfileSchema,
  topBarAccountSchema,
  topBarAccountOrgSchema,
  topBarOrgOptionSchema,
  topBarNotificationsSchema,
  barLinkSchema,
  type TopBarModel,
  type TopBarModelInput,
  type TopBarProfile,
  type TopBarAccount,
  type TopBarAccountOrg,
  type TopBarOrgOption,
  type TopBarNotifications,
  type BarLink,
} from './topBarModel'
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
export { initials, roleLabel, toneOf, type MenuItemSpec } from './shared'
export { launchHref } from './launchHref'
export { fetchLauncherApps, type FetchLauncherOptions } from './fetchLauncherApps'
export type { TopbarData } from './types'
