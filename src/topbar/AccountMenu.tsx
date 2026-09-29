import { useState, type ReactNode } from 'react'
import { Popover } from './Popover'
import { LogoutIcon, SwitchIcon, UserIcon } from './icons'
import {
  MenuDivider,
  MenuItem,
  MenuItems,
  initials,
  roleLabel,
  toneOf,
  type MenuItemSpec,
} from './shared'

/** Avatar redondo: foto (`src`) ou iniciais na cor estável pelo nome. */
export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string | null
  size?: 'md' | 'lg'
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const photo = src && failed !== src ? src : null
  return (
    <span
      className={`ntb-avatar ntb-tone-${toneOf(name)}${photo ? ' ntb-avatar--photo' : ''}${size === 'lg' ? ' ntb-avatar--lg' : ''}`}
      aria-hidden="true"
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(photo)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}

export type AccountMenuProps = {
  /** Pessoa logada (`profile` de `GET /api/oidc/topbar`). */
  user: { name: string; email?: string | null; picture?: string | null }
  /** Empresa ativa e papel (vão no cartão). */
  organization?: { name: string; role?: string | null } | null
  /** "Gerenciar sua Conta Nommand": link (`accountUrl`) e/ou callback. */
  manageAccountHref?: string
  onManageAccount?: () => void
  manageAccountLabel?: string
  /** Itens depois de "Gerenciar sua Conta Nommand" (ex.: Preferências, Segurança). */
  extraItems?: MenuItemSpec[]
  /** "Trocar de empresa" (aparece quando vem): normalmente abre o `OrgSwitcher`. */
  onSwitchOrganization?: () => void
  switchOrganizationLabel?: string
  onSignOut: () => void
  signOutLabel?: string
  /** Nome acessível do painel. */
  label?: string
  formatRole?: (role: string | null | undefined) => ReactNode
  width?: number
}

/**
 * Menu da conta (Padrão SSO Nomad §10): avatar com foto no canto; o painel traz o cartão (nome, e-mail, empresa e
 * papel), "Gerenciar sua Conta Nommand", os itens do app, "Trocar de empresa" e "Sair".
 */
export function AccountMenu({
  user,
  organization,
  manageAccountHref,
  onManageAccount,
  manageAccountLabel = 'Gerenciar sua Conta Nommand',
  extraItems = [],
  onSwitchOrganization,
  switchOrganizationLabel = 'Trocar de empresa',
  onSignOut,
  signOutLabel = 'Sair',
  label = 'Sua conta',
  formatRole = roleLabel,
  width = 300,
}: AccountMenuProps) {
  const role = organization ? formatRole(organization.role) : null
  return (
    <Popover
      kind="dialog"
      label={label}
      width={width}
      align="end"
      trigger={(p) => (
        <button
          type="button"
          className="ntb-btn ntb-avatar-btn"
          aria-label={`Conta de ${user.name}`}
          {...p}
        >
          <Avatar name={user.name} src={user.picture} />
        </button>
      )}
    >
      <div className="ntb-account-card">
        <Avatar name={user.name} src={user.picture} size="lg" />
        <div className="ntb-account-card__text">
          <b className="ntb-account-card__name">{user.name}</b>
          {user.email && <span className="ntb-account-card__email">{user.email}</span>}
          {organization && (
            <span className="ntb-account-card__org">
              {organization.name}
              {role ? ` · ${role}` : ''}
            </span>
          )}
        </div>
      </div>
      <MenuDivider />
      <div role="menu" aria-label={label}>
        {(manageAccountHref || onManageAccount) && (
          <MenuItem icon={<UserIcon />} href={manageAccountHref} onSelect={onManageAccount}>
            {manageAccountLabel}
          </MenuItem>
        )}
        <MenuItems items={extraItems} />
        {onSwitchOrganization && (
          <MenuItem icon={<SwitchIcon />} onSelect={onSwitchOrganization}>
            {switchOrganizationLabel}
          </MenuItem>
        )}
        <MenuDivider />
        <MenuItem icon={<LogoutIcon />} onSelect={onSignOut}>
          {signOutLabel}
        </MenuItem>
      </div>
    </Popover>
  )
}
