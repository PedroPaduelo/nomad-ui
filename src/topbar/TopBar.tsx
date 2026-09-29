import type { MouseEvent, ReactNode } from 'react'
import { isPlainClick } from './shared'

export type TopBarProps = {
  /** Antes da marca (ex.: botão ☰ da navegação lateral no celular). */
  leading?: ReactNode
  /** Logo + nome do produto (`TopBarBrand`). */
  brand?: ReactNode
  /** Seletor de empresa (`OrgSwitcher`). */
  org?: ReactNode
  /** Busca do próprio app (centro; some abaixo de 900 px). */
  search?: ReactNode
  /** Ações próprias do app (ajuda, tema, sino…), antes da grade de apps. */
  actions?: ReactNode
  /** Grade de apps (`AppSwitcher`). */
  apps?: ReactNode
  /** Menu da conta (`AccountMenu`). */
  account?: ReactNode
  /** Fica grudada no topo ao rolar (padrão: sim). */
  sticky?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Moldura da barra superior padrão Nomad (§10): 56 px, ordem fixa
 * `leading · brand | org · search · actions · apps · account`. Abaixo de 900 px a busca e o separador somem, o
 * espaçamento aperta e o nome do produto encolhe (em 480 px só o logo fica). Ações que devem sumir no celular
 * podem usar a classe `ntb-hide-sm`.
 */
export function TopBar({
  leading,
  brand,
  org,
  search,
  actions,
  apps,
  account,
  sticky = true,
  className,
  ...rest
}: TopBarProps) {
  return (
    <header
      className={`ntb ntb-bar${sticky ? ' ntb-bar--sticky' : ''}${className ? ` ${className}` : ''}`}
      aria-label={rest['aria-label']}
    >
      {leading}
      {brand}
      {org && (
        <>
          <span className="ntb-vsep" aria-hidden="true" />
          {org}
        </>
      )}
      {search ? <div className="ntb-search">{search}</div> : null}
      <div className="ntb-actions">
        {actions}
        {apps}
        {account}
      </div>
    </header>
  )
}

export type TopBarBrandProps = {
  /** Logo (SVG ou img, ~28 px). */
  logo: ReactNode
  /** Nome da marca (ex.: "Nommand"). */
  name: string
  /** Nome do produto, mais claro (ex.: "Loadbalance"); some abaixo de 900 px. */
  product?: string
  /** Destino do clique (padrão `/`). */
  href?: string
  /** Clique normal: chamado no lugar de seguir o `href` (navegação SPA). */
  onNavigate?: () => void
  /** Nome acessível do link (padrão: "<name> <product>, início"). */
  label?: string
}

/** Marca da barra: logo + "Nommand <Produto>", como na Conta Nommand. */
export function TopBarBrand({
  logo,
  name,
  product,
  href = '/',
  onNavigate,
  label,
}: TopBarBrandProps) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (onNavigate && isPlainClick(e)) {
      e.preventDefault()
      onNavigate()
    }
  }
  return (
    <a
      className="ntb-brand"
      href={href}
      onClick={onClick}
      aria-label={label ?? `${name}${product ? ` ${product}` : ''}, início`}
    >
      <span className="ntb-brand__logo">{logo}</span>
      <span className="ntb-brand__name">
        {name}
        {product && <span className="ntb-brand__product"> {product}</span>}
      </span>
    </a>
  )
}
