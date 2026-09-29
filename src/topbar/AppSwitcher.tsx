import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Popover, usePopoverClose } from './Popover'
import { GridIcon } from './icons'
import { launchHref } from './launchHref'
import { isPlainClick } from './shared'

/** Um aplicativo do launcher (formato de `GET /api/apps/launcher` e de `apps` em `GET /api/oidc/topbar`). */
export type LauncherApp = {
  id: string
  slug: string
  name: string
  iconUrl?: string | null
  launchUrl: string
  description?: string | null
}

/** Bloco extra na grade (ex.: atalhos do próprio app, app bloqueado com "Solicitar acesso"). */
export type AppTile = {
  key: string
  label: ReactNode
  icon: ReactNode
  /** Segunda linha, menor (ex.: "Solicitar acesso"). */
  caption?: ReactNode
  href?: string
  /** Clique normal: chamado no lugar de seguir o `href` (navegação SPA). */
  onSelect?: () => void
  newTab?: boolean
  /** Visual esmaecido (ícone em cinza), ainda clicável. */
  disabled?: boolean
  title?: string
  ariaLabel?: string
}

export type RenderAppIcon = (
  app: Pick<LauncherApp, 'slug' | 'name' | 'iconUrl'>,
  opts: { size: number; disabled?: boolean },
) => ReactNode

export type AppSwitcherProps = {
  /** `null`/`undefined` = carregando. */
  apps: LauncherApp[] | null | undefined
  /** Mensagem de erro ao carregar (mostra "Tentar de novo" se `onRetry` vier). */
  error?: string | null
  onRetry?: () => void
  /** Chamado ao abrir o painel pela primeira vez (bom momento para buscar os apps). */
  onOpen?: () => void
  onOpenChange?: (open: boolean) => void
  /** Slug do app em que a pessoa está: o bloco fica marcado como atual (`aria-current`). */
  currentAppSlug?: string
  /**
   * Empresa ativa (`org_id`): o link vira `launchUrl?org=<orgId>&next=/` (Padrão SSO Nomad) e o app abre logado
   * nessa empresa. Sem ela, o link é o `launchUrl` puro.
   */
  orgId?: string | null
  /** Abre os apps numa aba nova (padrão: sim, Padrão SSO Nomad §10). */
  openInNewTab?: boolean
  /** Blocos depois dos apps (atalhos, apps bloqueados). */
  extraTiles?: AppTile[]
  /** Link do rodapé para a Conta Nommand. Ignorado quando `footer` vem. */
  accountUrl?: string
  accountLabel?: string
  /** Rodapé próprio (substitui o "Gerenciar sua Conta Nommand"). Links dentro dele fecham o painel ao clicar. */
  footer?: ReactNode
  /** Troca o ícone de cada app (padrão: `iconUrl` ou monograma). */
  renderIcon?: RenderAppIcon
  /** Nome acessível do painel. */
  label?: string
  /** Nome acessível do botão. */
  triggerLabel?: string
  /** Texto quando não há nenhum app (fica abaixo dos blocos extras). `null` esconde. */
  empty?: ReactNode
  /** Largura do painel (px). */
  width?: number
  align?: 'start' | 'end'
  /** Conteúdo do botão (padrão: grade 3×3). */
  buttonContent?: ReactNode
}

function monogram(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Ícone do app: `iconUrl` (imagem) ou monograma na cor de destaque do tema. */
export function AppIcon({
  app,
  size = 40,
}: {
  app: Pick<LauncherApp, 'slug' | 'name' | 'iconUrl'>
  size?: number
}) {
  const [broken, setBroken] = useState<string | null>(null)
  const src = app.iconUrl && broken !== app.iconUrl ? app.iconUrl : null
  return (
    <span
      className={`ntb-app-icon${src ? '' : ' ntb-app-icon--mono'}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" width={size} height={size} onError={() => setBroken(src)} />
      ) : (
        monogram(app.name)
      )}
    </span>
  )
}

function Tile({
  href,
  onSelect,
  newTab,
  className,
  children,
  ...rest
}: {
  href?: string
  onSelect?: () => void
  newTab?: boolean
  className: string
  children: ReactNode
  title?: string
  'aria-label'?: string
  'aria-current'?: 'page'
}) {
  const close = usePopoverClose()
  function onClick(e: MouseEvent<HTMLElement>) {
    if (onSelect && (!href || (!newTab && isPlainClick(e)))) {
      e.preventDefault()
      onSelect()
    }
    close()
  }
  if (href) {
    return (
      <a
        className={className}
        href={href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        data-ntb-item="grid"
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={className} data-ntb-item="grid" onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

/**
 * Grade de apps (sem o botão). Setas navegam em 2D (3 colunas), Home/End vão ao primeiro e ao último.
 * Útil também para uma página "Todos os apps".
 */
export function AppGrid({
  apps,
  extraTiles = [],
  currentAppSlug,
  openInNewTab = true,
  orgId,
  renderIcon,
}: {
  apps: LauncherApp[]
  extraTiles?: AppTile[]
  currentAppSlug?: string
  openInNewTab?: boolean
  orgId?: string | null
  renderIcon?: RenderAppIcon
}) {
  const ref = useRef<HTMLUListElement>(null)
  function onKey(e: KeyboardEvent<HTMLUListElement>) {
    const tiles = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[data-ntb-item="grid"]') ?? [],
    )
    const i = tiles.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    const cols = 3
    let next = -1
    if (e.key === 'ArrowRight') next = Math.min(i + 1, tiles.length - 1)
    else if (e.key === 'ArrowLeft') next = Math.max(i - 1, 0)
    else if (e.key === 'ArrowDown') next = Math.min(i + cols, tiles.length - 1)
    else if (e.key === 'ArrowUp') next = Math.max(i - cols, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tiles.length - 1
    if (next < 0) return
    e.preventDefault()
    e.stopPropagation()
    tiles[next].focus()
  }
  const icon = (app: Pick<LauncherApp, 'slug' | 'name' | 'iconUrl'>, disabled?: boolean) =>
    renderIcon ? renderIcon(app, { size: 40, disabled }) : <AppIcon app={app} size={40} />
  return (
    // As setas são tratadas na lista (delegação) e movem o foco entre os links da grade.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <ul className="ntb-grid" ref={ref} onKeyDown={onKey}>
      {apps.map((app) => (
        <li key={app.id}>
          <Tile
            className="ntb-tile"
            href={orgId ? launchHref(app.launchUrl, { org: orgId, next: '/' }) : app.launchUrl}
            newTab={openInNewTab}
            title={app.description ?? undefined}
            aria-current={app.slug === currentAppSlug ? 'page' : undefined}
          >
            {icon(app)}
            <span className="ntb-tile__text">{app.name}</span>
          </Tile>
        </li>
      ))}
      {extraTiles.map((t) => (
        <li key={t.key}>
          <Tile
            className={`ntb-tile${t.disabled ? ' ntb-tile--disabled' : ''}`}
            href={t.href}
            onSelect={t.onSelect}
            newTab={t.newTab}
            title={t.title}
            aria-label={t.ariaLabel}
          >
            {t.icon}
            <span className="ntb-tile__text">
              {t.label}
              {t.caption && <small className="ntb-tile__caption">{t.caption}</small>}
            </span>
          </Tile>
        </li>
      ))}
    </ul>
  )
}

/** Rodapé com links: fecha o painel quando um link é clicado. */
function FooterArea({ children, center }: { children: ReactNode; center?: boolean }) {
  const close = usePopoverClose()
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={`ntb-foot${center ? ' ntb-foot--center' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a,button')) close()
      }}
    >
      {children}
    </div>
  )
}

function Body({
  apps,
  error,
  onRetry,
  empty,
  extraTiles,
  ...grid
}: Pick<
  AppSwitcherProps,
  | 'apps'
  | 'error'
  | 'onRetry'
  | 'empty'
  | 'extraTiles'
  | 'currentAppSlug'
  | 'orgId'
  | 'openInNewTab'
  | 'renderIcon'
>) {
  if (!apps && !error) {
    return (
      <div className="ntb-loading" role="status" aria-live="polite">
        <span className="ntb-spinner" aria-hidden="true" />
        <span>Carregando aplicativos…</span>
      </div>
    )
  }
  const list = apps ?? []
  return (
    <>
      {error && (
        <p className="ntb-alert" role="alert">
          {error}{' '}
          {onRetry && (
            <button type="button" className="ntb-btn ntb-link" onClick={onRetry}>
              Tentar de novo
            </button>
          )}
        </p>
      )}
      {(list.length > 0 || (extraTiles?.length ?? 0) > 0) && (
        <AppGrid apps={list} extraTiles={extraTiles} {...grid} />
      )}
      {!error && list.length === 0 && empty !== null && (
        <p className="ntb-caption">
          {empty ?? 'Nenhum aplicativo liberado para você. Peça ao administrador da sua empresa.'}
        </p>
      )}
    </>
  )
}

/**
 * Botão de grade + painel de aplicativos, igual ao launcher do Google (Padrão SSO Nomad §10).
 * Não busca dados: o app passa `apps` (ver README do pacote).
 */
export function AppSwitcher({
  apps,
  error,
  onRetry,
  onOpen,
  onOpenChange,
  currentAppSlug,
  orgId,
  openInNewTab = true,
  extraTiles,
  accountUrl,
  accountLabel = 'Gerenciar sua Conta Nommand',
  footer,
  renderIcon,
  label = 'Aplicativos',
  triggerLabel = 'Aplicativos Nommand',
  empty,
  width = 336,
  align = 'end',
  buttonContent,
}: AppSwitcherProps) {
  const [open, setOpen] = useState(false)
  const opened = useRef(false)
  function changeOpen(value: boolean) {
    setOpen(value)
    if (value && !opened.current) {
      opened.current = true
      onOpen?.()
    }
    onOpenChange?.(value)
  }

  return (
    <Popover
      kind="dialog"
      label={label}
      width={width}
      align={align}
      open={open}
      onOpenChange={changeOpen}
      trigger={(p) => (
        <button type="button" className="ntb-btn ntb-icon-btn" aria-label={triggerLabel} {...p}>
          {buttonContent ?? <GridIcon />}
        </button>
      )}
    >
      <Body
        apps={apps}
        error={error}
        onRetry={onRetry}
        empty={empty}
        extraTiles={extraTiles}
        currentAppSlug={currentAppSlug}
        orgId={orgId}
        openInNewTab={openInNewTab}
        renderIcon={renderIcon}
      />
      {footer ? (
        <FooterArea>{footer}</FooterArea>
      ) : accountUrl ? (
        <FooterArea center>
          <a className="ntb-link" href={accountUrl}>
            {accountLabel}
          </a>
        </FooterArea>
      ) : null}
    </Popover>
  )
}
