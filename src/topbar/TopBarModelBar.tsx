// ── TopBarModelBar — as peças padrão da barra a partir do TopBarModel ────
//
// Segunda parte da [NUI] [TOPBAR-PARITY-01] (v1.6.0): dado UM `TopBarModel`
// (validado com `topBarModelSchema`), monta as 3 peças padrão da barra —
// seletor de empresa, grade de apps e menu da conta — mais o menu de ajuda e
// o sino de notificações, sem nenhum item hard-coded por app:
//
//   launcher  = apps[] + launcherLinks[] (rodapé em tiles) + "Gerenciar sua Conta Nommand"
//   empresas  = organizations[] + "Criar empresa" (createOrgUrl)
//   conta     = account.profile + accountLinks[] + Tema (do ThemeProvider do
//               pacote) + "Trocar de empresa" (se houver > 1) + "Sair"
//
// O que o app ainda controla: marca e nome do produto, busca no centro,
// ações próprias (busca rápida/paleta) no slot, se trocar de empresa é
// servidor (`onSwitchOrg`) ou local, e o logout. Tudo opcional: o que não
// vier, não aparece.
//
// Duas formas de usar, equivalentes em conteúdo:
//   1. `<TopBar model={model} … />` — o próprio `TopBar` monta a moldura §10
//      (esta peça);
//   2. `<TopBarModelBar model={model} … />` — só o conteúdo, para quem já
//      monta o cabeçalho do próprio jeito (ou quer a barra dentro de outro
//      elemento). `organize` escolhe se o seletor de empresa vem antes do
//      centro (como na §10) ou depois (para quem não tem marca).

import { useState, type ReactNode } from 'react'
import { AccountMenu } from './AccountMenu'
import { AppSwitcher, type AppTile } from './AppSwitcher'
import { HelpIcon, ThemeIcon } from './icons'
import { NotificationsButton } from './NotificationsButton'
import { OrgSwitcher, type TopbarOrganization } from './OrgSwitcher'
import { Popover } from './Popover'
import { MenuItem, type MenuItemSpec } from './shared'
import { useThemeStore, type Theme } from '../theme/store'
import type { BarLink, TopBarModel } from './topBarModel'

const ACCOUNT_LINK_ID = 'manage-account'
const THEME_ITEM_ID = 'theme'
const CREATE_ORG_ID = 'create-org'

function menuItems(links: BarLink[] | undefined): MenuItemSpec[] {
  return (links ?? []).map((l) => ({
    key: l.id,
    label: l.label,
    icon: l.icon as ReactNode,
    href: l.href,
    newTab: l.newTab,
  }))
}

/** Estado do tema em PT-BR, como no item "Tema · Escuro" da conta da Nommand. */
function themeLabel(theme: Theme): string {
  return theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Sistema'
}

export type TopBarModelBarProps = {
  /** Contrato canônico (Padrão SSO §10); validar com `topBarModelSchema` antes. */
  model: TopBarModel
  /** Slug do app em que a pessoa está: o bloco da grade fica `aria-current`. */
  currentAppSlug?: string
  /** Troca de empresa (no app: `/auth/sso?org=<id>`). Opcional: sem callback o item marca mas não navega. */
  onSwitchOrg?: (orgId: string, org: TopbarOrganization) => void
  /** Logout. Sem callback o item "Sair" não aparece. */
  onSignOut?: () => void
  signOutLabel?: string
  /** Ações próprias do app, à esquerda das peças padrão (busca rápida, paleta…). */
  actions?: ReactNode
  /** Busca do app no centro. */
  search?: ReactNode
  /** Antes da marca (☰ do celular). */
  leading?: ReactNode
  /** Notificações da Conta: quando `false`, o sino some (o app tem central própria). */
  showNotifications?: boolean
  /** Clique no sino: chamado no lugar de seguir `notifications.href` (SPA). */
  onNotificationsClick?: () => void
  /** Tema do item do menu da conta; omitir esconde o item (quem não tem tema na conta). */
  theme?: Theme
  onThemeChange?: (theme: Theme) => void
  /** Rótulos e nomes acessíveis (tradução/ajuste fino). */
  labels?: {
    account?: string
    manageAccount?: string
    createOrg?: string
    help?: string
    signOut?: string
    applications?: string
    org?: string
    /** Item de tema no menu da conta (padrão "Tema"; o estado entra junto). */
    theme?: string
    /** Rótulo inteiro do item de tema (sobrescreve o padrão com o estado). */
    themeItem?: ReactNode
  }
  /** Larguras dos painéis (px). */
  widths?: { apps?: number; org?: number; account?: number; help?: number }
  /** Abre os apps numa aba nova (padrão: sim, §10). */
  openInNewTab?: boolean
  /**
   * `bar` (padrão): o seletor de empresa vem antes do centro, como na §10
   * (`brand · org · search · actions · apps · account`) — use dentro de
   * `<TopBar>`. `trailing`: a ordem de uma moldura própria
   * (`actions · org · help · apps · account`).
   */
  organize?: 'bar' | 'trailing'
  /** Renderiza os painéis em fluxo (vitrine, sem portal). */
  inlinePanels?: boolean
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="ntb-actions">{children}</div>
}

/**
 * Conteúdo das peças padrão da barra a partir do `model`: seletor de empresa,
 * sino (se `notifications` vier), ajuda (se `helpLinks` vier), grade de apps e
 * menu da conta. Usar diretamente quando o app monta a própria moldura; pelo
 * `TopBar` é o caminho normal.
 */
export function TopBarModelBar({
  model,
  currentAppSlug,
  onSwitchOrg,
  onSignOut,
  signOutLabel = 'Sair',
  actions,
  search,
  leading,
  showNotifications = true,
  onNotificationsClick,
  theme: themeProp,
  onThemeChange,
  labels,
  widths,
  openInNewTab = true,
  organize = 'bar',
  inlinePanels = false,
}: TopBarModelBarProps) {
  // `theme`/`onThemeChange` explícitos mandam; senão o store do pacote.
  const storeTheme = useThemeStore((s) => s.theme)
  const storeSetTheme = useThemeStore((s) => s.setTheme)
  const theme = themeProp === undefined ? storeTheme : themeProp
  const setTheme = onThemeChange ?? storeSetTheme

  // "Trocar de empresa" fecha a conta e abre o seletor; controlado aqui porque
  // as duas peças são irmãs dentro da mesma barra.
  const [orgOpen, setOrgOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const orgs = model.organizations
  const createOrgLabel = model.createOrgLabel ?? labels?.createOrg ?? 'Criar empresa'
  const manageLabel = labels?.manageAccount ?? 'Gerenciar sua Conta Nommand'
  const accountLabel = labels?.account ?? 'Sua conta'
  const helpLabel = labels?.help ?? 'Ajuda'
  const appsLabel = labels?.applications ?? 'Aplicativos'

  const createOrgItem: MenuItemSpec[] = model.createOrgUrl
    ? [
        {
          key: CREATE_ORG_ID,
          label: createOrgLabel,
          onSelect: () => {
            if (typeof window !== 'undefined' && model.createOrgUrl) {
              window.open(model.createOrgUrl, '_blank', 'noopener')
            }
          },
        },
      ]
    : []

  const accountLinks = menuItems(model.accountLinks)
  // A "Referência" da conta (Conta Nommand) mostra o estado atual do tema no
  // próprio item: "Tema · Escuro". `labels.themeItem` (ReactNode) sobrescreve
  // o rótulo inteiro; `labels.theme` troca só a parte do estado (padrão
  // "Tema"). Quem não tem tema na conta passa `theme: undefined`.
  const themeItem: MenuItemSpec[] =
    theme === undefined
      ? []
      : [
          {
            key: THEME_ITEM_ID,
            label: labels?.themeItem ?? `${labels?.theme ?? 'Tema'} · ${themeLabel(theme)}`,
            icon: <ThemeIcon />,
            onSelect: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
          },
        ]
  // "Gerenciar" primeiro (decisão do contrato); depois os links da Conta, o
  // tema e "Trocar de empresa"; "Sair" sempre por último.
  const accountExtra: MenuItemSpec[] = [
    { key: ACCOUNT_LINK_ID, label: manageLabel, href: model.account.manageAccountHref },
    ...accountLinks.filter((l) => l.key !== ACCOUNT_LINK_ID),
    ...themeItem,
  ]

  const launcherTiles: AppTile[] = (model.launcherLinks ?? []).map((l) => ({
    key: l.id,
    label: l.label,
    icon: (l.icon as ReactNode) ?? <LinkGlyph />,
    href: l.href,
    newTab: l.newTab,
  }))

  const helpLinks = model.helpLinks ?? []

  const org = (
    <OrgSwitcher
      organizations={orgs}
      currentOrgId={model.organization.id}
      onSwitch={onSwitchOrg ?? (() => {})}
      extraItems={createOrgItem}
      label={labels?.org ?? 'Trocar de empresa'}
      width={widths?.org ?? 320}
      open={orgOpen}
      onOpenChange={setOrgOpen}
      inlinePanel={inlinePanels}
    />
  )

  const right = (
    <Actions>
      {actions}
      {showNotifications && model.notifications ? (
        <NotificationsButton notifications={model.notifications} onSelect={onNotificationsClick} />
      ) : null}
      {helpLinks.length > 0 ? (
        <Popover
          kind="menu"
          label={helpLabel}
          width={widths?.help ?? 260}
          align="end"
          open={helpOpen}
          onOpenChange={setHelpOpen}
          inlinePanel={inlinePanels}
          trigger={(p) => (
            <button type="button" className="ntb-btn ntb-icon-btn" aria-label={helpLabel} {...p}>
              <HelpIcon />
            </button>
          )}
        >
          {/* O painel já é `role="menu"`: os itens `menuitem` entram direto
              (uma `div role="menu"` dentro do menu quebra aria-required-children). */}
          <div>
            {helpLinks.map((l) => (
              <MenuItem key={l.id} icon={l.icon as ReactNode} href={l.href} newTab={l.newTab}>
                {l.label}
              </MenuItem>
            ))}
          </div>
        </Popover>
      ) : null}
      <AppSwitcher
        apps={model.apps}
        orgId={model.organization.id}
        currentAppSlug={currentAppSlug}
        openInNewTab={openInNewTab}
        extraTiles={launcherTiles.length > 0 ? launcherTiles : undefined}
        accountUrl={model.account.manageAccountHref}
        accountLabel={manageLabel}
        label={appsLabel}
        triggerLabel={appsLabel === 'Aplicativos' ? 'Aplicativos Nommand' : appsLabel}
        width={widths?.apps ?? 336}
        inlinePanel={inlinePanels}
      />
      <AccountMenu
        user={model.account.profile}
        organization={{ name: model.organization.name, role: model.account.role ?? model.organization.role }}
        manageAccountHref={model.account.manageAccountHref}
        manageAccountLabel={manageLabel}
        extraItems={accountExtra}
        onSwitchOrganization={
          orgs.length > 1
            ? () => {
                setAccountOpen(false)
                setOrgOpen(true)
              }
            : undefined
        }
        onSignOut={onSignOut}
        signOutLabel={signOutLabel}
        label={accountLabel}
        width={widths?.account ?? 300}
        open={accountOpen}
        onOpenChange={setAccountOpen}
        inlinePanel={inlinePanels}
      />
    </Actions>
  )

  if (organize === 'trailing') {
    return (
      <>
        {leading}
        {actions}
        {org}
        {right}
      </>
    )
  }
  return (
    <>
      {leading}
      {org}
      <span className="ntb-vsep" aria-hidden="true" />
      {search ? <div className="ntb-search">{search}</div> : null}
      {right}
    </>
  )
}

/** Glifo padrão dos links do launcher sem ícone (seta para fora). */
function LinkGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ntb-ico"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}