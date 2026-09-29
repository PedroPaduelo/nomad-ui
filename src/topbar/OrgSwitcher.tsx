import type { ReactNode } from 'react'
import { Popover } from './Popover'
import { BuildingIcon, ChevronDownIcon } from './icons'
import {
  MenuDivider,
  MenuItem,
  MenuItems,
  initials,
  roleLabel,
  toneOf,
  type MenuItemSpec,
} from './shared'

/** Uma empresa da pessoa (formato de `organizations` em `GET /api/oidc/topbar`). */
export type TopbarOrganization = {
  id: string
  name: string
  slug?: string
  /** `owner` | `admin` | `member` (maiúsculas também valem). */
  role?: string | null
  /** `false` = este app não abre nessa empresa: o item fica desabilitado. */
  canOpenApp?: boolean
}

/** Marca quadrada da empresa (inicial na cor de avatar estável pelo nome). */
export function OrgMark({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className={`ntb-org-mark ntb-tone-${toneOf(name)}`}
      style={size === 24 ? undefined : { width: size, height: size }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export type OrgSwitcherProps = {
  organizations: TopbarOrganization[]
  /** Empresa ativa. */
  currentOrgId?: string | null
  /** Troca de empresa (no app: `/auth/sso?org=<id>`; na Conta: o switch-org). Não é chamado para a atual. */
  onSwitch: (orgId: string, org: TopbarOrganization) => void
  /** Itens depois da lista (ex.: "Criar empresa" na Conta). */
  extraItems?: MenuItemSpec[]
  /** Título do menu e nome acessível. */
  label?: string
  /** Texto do chip sem empresa. */
  emptyLabel?: string
  /** Legenda de empresa em que este app não abre. */
  unavailableLabel?: string
  /** Papel em texto (padrão: Proprietário, Administrador, Membro). */
  formatRole?: (role: string | null | undefined) => ReactNode
  /** Controle externo (ex.: "Trocar de empresa" no menu da conta abre este menu). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  width?: number
  /** Renderiza o painel em fluxo (sem absolute) — usado pela vitrine; apps reais não passam. */
  inlinePanel?: boolean
}

/**
 * Seletor de empresa da barra (Padrão SSO Nomad §10): chip com a marca e o nome da empresa ativa; o menu lista as
 * empresas da pessoa com o papel, marca a atual e desabilita as que não abrem este app.
 */
export function OrgSwitcher({
  organizations,
  currentOrgId,
  onSwitch,
  extraItems,
  label = 'Trocar de empresa',
  emptyLabel = 'Sem empresa',
  unavailableLabel = 'Sem acesso a este app',
  formatRole = roleLabel,
  open,
  onOpenChange,
  width = 320,
  inlinePanel = false,
}: OrgSwitcherProps) {
  const current = organizations.find((o) => o.id === currentOrgId) ?? null
  return (
    <Popover
      kind="menu"
      label={label}
      width={width}
      align="start"
      open={open}
      onOpenChange={onOpenChange}
      inlinePanel={inlinePanel}
      trigger={(p) => (
        <button
          type="button"
          className="ntb-btn ntb-org-btn"
          aria-label={current ? `Empresa: ${current.name}. ${label}` : 'Escolher empresa'}
          {...p}
        >
          {current ? <OrgMark name={current.name} /> : <BuildingIcon />}
          <span className="ntb-org-btn__name">{current?.name ?? emptyLabel}</span>
          <ChevronDownIcon />
        </button>
      )}
    >
      <div className="ntb-label" aria-hidden="true">
        {label}
      </div>
      {organizations.map((o) => {
        const unavailable = o.canOpenApp === false
        const role = formatRole(o.role)
        return (
          <MenuItem
            key={o.id}
            checked={o.id === current?.id}
            disabled={unavailable}
            leading={<OrgMark name={o.name} />}
            meta={
              unavailable ? (
                <>
                  {role}
                  {role ? ' · ' : ''}
                  {unavailableLabel}
                </>
              ) : (
                role || undefined
              )
            }
            onSelect={() => {
              if (o.id !== current?.id) onSwitch(o.id, o)
            }}
          >
            {o.name}
          </MenuItem>
        )
      })}
      {extraItems && extraItems.length > 0 && (
        <>
          <MenuDivider />
          <MenuItems items={extraItems} />
        </>
      )}
    </Popover>
  )
}
