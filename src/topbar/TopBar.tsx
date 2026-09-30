import type { MouseEvent, ReactNode } from 'react'
import { TopBarModelBar, type TopBarModelBarProps } from './TopBarModelBar'
import { isPlainClick } from './shared'
import type { TopBarModel } from './topBarModel'

export type TopBarProps = {
  /**
   * Contrato canônico da barra (Padrão SSO §10, v1.6.0): com `model`, o
   * `TopBar` monta as 3 peças padrão (empresa, apps, conta), o menu de ajuda
   * e o sino de notificações a partir do objeto — sem item hard-coded. Os
   * slots abaixo continuam valendo para marca, busca e ações do app; `org`,
   * `apps` e `account` são ignorados quando `model` vem.
   */
  model?: TopBarModel
  /** Callback de troca de empresa do `model` (nomes = `TopBarModelBar`). */
  onSwitchOrg?: TopBarModelBarProps['onSwitchOrg']
  /** Logout do `model`. */
  onSignOut?: TopBarModelBarProps['onSignOut']
  /** Slug do app atual (marca o bloco na grade). */
  currentAppSlug?: string
  /** Antes da marca (ex.: botão ☰ da navegação lateral no celular). */
  leading?: ReactNode
  /** Logo + nome do produto (`TopBarBrand`). */
  brand?: ReactNode
  /** Seletor de empresa (`OrgSwitcher`) — ignorado quando `model` vem. */
  org?: ReactNode
  /** Busca do próprio app (centro; some abaixo de 900 px). */
  search?: ReactNode
  /** Ações próprias do app (ajuda, tema, sino…), antes da grade de apps. */
  actions?: ReactNode
  /** Grade de apps (`AppSwitcher`) — ignorada quando `model` vem. */
  apps?: ReactNode
  /** Menu da conta (`AccountMenu`) — ignorado quando `model` vem. */
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
 *
 * Com `model` (v1.6.0) o conteúdo das peças padrão vem do contrato canônico
 * (ver `TopBarModelBar`); a marca, a busca e as ações do app seguem nos slots.
 */
export function TopBar({
  model,
  onSwitchOrg,
  onSignOut,
  currentAppSlug,
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
  const pieces = model ? (
    <>
      {leading}
      {brand}
      <TopBarModelBar
        model={model}
        currentAppSlug={currentAppSlug}
        onSwitchOrg={onSwitchOrg}
        onSignOut={onSignOut}
        search={search}
        actions={actions}
        organize="bar"
      />
    </>
  ) : (
    <>
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
    </>
  )
  return (
    <header
      className={`ntb ntb-bar${sticky ? ' ntb-bar--sticky' : ''}${className ? ` ${className}` : ''}`}
      aria-label={rest['aria-label']}
    >
      {pieces}
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
  /** Só o logo, sem o nome (padrão: mostra). */
  showName?: boolean
  className?: string
}

/** Marca da barra: logo + "Nommand <Produto>", como na Conta Nommand. */
export function TopBarBrand({
  logo,
  name,
  product,
  href = '/',
  onNavigate,
  label,
  showName = true,
  className,
}: TopBarBrandProps) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (onNavigate && isPlainClick(e)) {
      e.preventDefault()
      onNavigate()
    }
  }
  return (
    <a
      className={`ntb-brand${className ? ` ${className}` : ''}`}
      href={href}
      onClick={onClick}
      aria-label={label ?? `${name}${product ? ` ${product}` : ''}, início`}
    >
      <span className="ntb-brand__logo">{logo}</span>
      {showName ? (
        <span className="ntb-brand__name">
          {name}
          {product && <span className="ntb-brand__product"> {product}</span>}
        </span>
      ) : null}
    </a>
  )
}

/** SVG de exemplo da marca Nommand (mesmo da Conta), com os tokens `--mark-bg`/`--mark-on`. */
export function NommandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--mark-bg, #0f172a)" />
      <g
        fill="none"
        stroke="var(--mark-on, #fff)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.5 22.5V9.5l11 13v-13" />
      </g>
    </svg>
  )
}

export type TopBarModelBrandProps = {
  /** Nome do produto (ex.: "Loadbalance"). A marca vem do pacote. */
  product: string
  /** Mostra a marca em texto ("Nommand Loadbalance"); padrão: só o logo. */
  showName?: boolean
  href?: string
  onNavigate?: () => void
  label?: string
  className?: string
}

/**
 * Marca da barra com o logo padrão do pacote (`NommandMark`), para quem não
 * quer manter o SVG no app: `<TopBarModelBrand product="Loadbalance" />`.
 */
export function TopBarModelBrand({
  product,
  showName = false,
  href = '/',
  onNavigate,
  label,
  className,
}: TopBarModelBrandProps) {
  return (
    <TopBarBrand
      logo={<NommandMark />}
      name="Nommand"
      product={product}
      showName={showName}
      href={href}
      onNavigate={onNavigate}
      label={label ?? `Nommand ${product}, início`}
      className={className}
    />
  )
}
