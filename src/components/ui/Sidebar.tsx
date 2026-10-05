/**
 * Sidebar — app shell lateral (esquerda).
 *
 * Trazido do agent-package (frontend/src/components/layout/Sidebar.tsx) com a
 * mesma UX visual (larguras `--sidebar-width` / `--sidebar-collapsed-width`,
 * drawer em mobile, focus trap, `inert` quando fechado) mas desacoplado do
 * produto: nav, brand e workspace switcher são passados por prop.
 *
 * Desktop (≥lg): coluna in-flow full-height à esquerda. Mobile (<lg): drawer
 * overlay 84% / máx 320px com backdrop.
 *
 * Drawer móvel fechado fica `inert` (fora da ordem de Tab e da árvore de
 * acessibilidade). Aberto, prende o foco (`useFocusTrap`): o foco entra no
 * drawer, Esc fecha e o foco volta ao hambúrguer do Header.
 *
 * Fonte da verdade visual: agent-package. Nada de cores hardcoded — só
 * tokens do tema.
 */
import type { ReactNode } from 'react'
import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useMediaQuery } from '../../hooks/useMediaQuery'

/** Mesmo corte do `lg:` do Tailwind: abaixo dele a sidebar é drawer. */
export const SIDEBAR_MOBILE_QUERY = '(max-width: 1023px)'

/** id do drawer móvel, alvo do `aria-controls` do hambúrguer do Header. */
export const SIDEBAR_MOBILE_ID = 'mobile-sidebar'

// ── Tipos públicos ────────────────────────────────────────

export interface SidebarItem {
  /** Identificador único (estável para keys e testes). */
  key: string
  /** Texto exibido. */
  label: string
  /** Ícone do lucide-react (ou SVG). */
  icon: ReactNode
  /**
   * `href` renderiza um `<a>`. Para integrar com React Router basta passar
   * `onClick` que chame `navigate(href)` e `preventDefault`. Mantemos o pacote
   * sem dependência de router.
   */
  href?: string
  /** Callback ao clicar. Recebe o evento para `preventDefault` quando usa `href`. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
  /** Item ativo (estilo accent). */
  current?: boolean
  /** Contador exibido à direita (mono, caption). */
  count?: number
  /** Item "agente" (dourado, `text-amber`). */
  agent?: boolean
}

/** Seção da nav: rótulo em cima (opcional) + itens. */
export interface SidebarSection {
  /** Rótulo exibido acima dos itens (ex.: "Catálogo"). Omitir para a primeira seção. */
  label?: string
  /** Ícone do rótulo (opcional). */
  labelIcon?: ReactNode
  items: SidebarItem[]
}

export interface SidebarBrand {
  /** Iniciais/avatar (um único caractere já basta). */
  initial: string
  /** Nome do workspace/projeto. */
  name: string
  /** Subtítulo (ex.: "Empresa · 3 projetos"). */
  subtitle?: string
  /** Callback ao clicar (abre menu, navega, etc). */
  onClick?: () => void
}

export interface SidebarProps {
  /** Seções da nav principal, em ordem. */
  sections: SidebarSection[]
  /** Itens do rodapé (ex.: "Conectar agente", "Configurações"). */
  footerItems?: SidebarItem[]
  /** Brand no topo da sidebar. Se omitido, o topo fica vazio. */
  brand?: SidebarBrand
  /** Workspace switcher customizado (substitui o brand). */
  workspaceSwitcher?: ReactNode
  /** Recolhida (desktop) ou fechada (mobile drawer). */
  collapsed: boolean
  /** Alterna expandido ↔ colapsado/fechado. */
  onToggleCollapse: () => void
  /** Callback ao navegar em um item (usado para fechar o drawer no mobile). */
  onNavigate?: () => void
  /**
   * Rótulo do `aria-label` dos `<aside>`. Padrão: "Navegação principal".
   * Use algo mais específico em apps que combinem várias barras.
   */
  ariaLabel?: string
}

// ── Item da nav (interno) ─────────────────────────────────

const iconCls = 'h-[18px] w-[18px]'

function NavItem({
  item,
  onNavigate,
}: {
  item: SidebarItem
  onNavigate?: () => void
}) {
  const cls =
    'group/nav flex h-8 items-center gap-2.5 rounded-md text-body font-medium transition-colors px-2.5 ' +
    (item.agent
      ? 'text-amber hover:bg-surface-raised'
      : item.current
        ? 'bg-accent-muted text-accent'
        : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary')
  const iconColor = item.agent
    ? 'text-amber'
    : item.current
      ? 'text-accent'
      : 'text-text-tertiary group-hover/nav:text-text-primary'

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (item.onClick) {
      item.onClick(event)
    }
    if (!event.defaultPrevented && onNavigate) onNavigate()
  }

  return (
    <a
      href={item.href ?? '#'}
      onClick={handleClick}
      aria-current={item.current ? 'page' : undefined}
      title={item.label}
      className={cls}
    >
      <span className={'flex shrink-0 items-center justify-center ' + iconCls + ' ' + iconColor}>
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
      {typeof item.count === 'number' && (
        <span className="ml-auto font-mono text-caption text-text-tertiary">{item.count}</span>
      )}
    </a>
  )
}

// ── Workspace switcher interno (se brand.onClick existir) ─

function DefaultSwitcher({
  brand,
  collapsed,
}: {
  brand: SidebarBrand
  collapsed: boolean
}) {
  const interactive = typeof brand.onClick === 'function'
  const Tag: 'button' | 'div' = interactive ? 'button' : 'div'
  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={brand.onClick}
      className={
        'flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-surface-raised ' +
        (collapsed ? 'justify-center' : '')
      }
      aria-label={interactive ? `Trocar: ${brand.name}` : undefined}
    >
      <span
        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-accent-muted text-caption font-bold text-text-accent"
        aria-hidden
      >
        {brand.initial}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-semibold text-text-primary">
              {brand.name}
            </span>
            {brand.subtitle ? (
              <span className="block truncate text-caption text-text-tertiary">
                {brand.subtitle}
              </span>
            ) : null}
          </span>
          {interactive ? (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-tertiary" strokeWidth={1.75} />
          ) : null}
        </>
      )}
    </Tag>
  )
}

// ── SidebarBody (compartilhado desktop/drawer) ────────────

function SidebarBody({
  collapsed,
  sections,
  footerItems,
  brand,
  workspaceSwitcher,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean
  sections: SidebarSection[]
  footerItems?: SidebarItem[]
  brand?: SidebarBrand
  workspaceSwitcher?: ReactNode
  onNavigate?: () => void
  onToggleCollapse: () => void
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden">
      {workspaceSwitcher ?? (brand ? <DefaultSwitcher brand={brand} collapsed={collapsed} /> : null)}

      <nav className="mt-2 flex flex-col gap-0.5" aria-label="Navegação do projeto">
        {sections.map((section, idx) => (
          <div
            key={section.label ?? `section-${idx}`}
            className={idx === 0 ? 'flex flex-col gap-0.5' : 'mt-4 flex flex-col gap-0.5'}
          >
            {!collapsed && section.label ? (
              <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-caption font-medium text-text-tertiary">
                {section.labelIcon ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center" aria-hidden>
                    {section.labelIcon}
                  </span>
                ) : null}
                {section.label}
              </div>
            ) : null}
            {section.items.map((item) => (
              <NavItem key={item.key} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {footerItems && footerItems.length > 0 ? (
        <div className="mt-auto flex flex-col gap-0.5 pt-2">
          {footerItems.map((item) => (
            <NavItem key={item.key} item={item} onNavigate={onNavigate} />
          ))}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className={
              'hidden h-8 items-center gap-2.5 rounded-md text-body font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary lg:flex ' +
              (collapsed ? 'justify-center px-0' : 'px-2.5')
            }
          >
            <span
              className="flex shrink-0 items-center justify-center text-text-tertiary"
              style={{ width: 18, height: 18 }}
            >
              {collapsed ? (
                <PanelLeftOpen className={iconCls} strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className={iconCls} strokeWidth={1.75} />
              )}
            </span>
            {!collapsed && 'Recolher'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ── Sidebar (público) ─────────────────────────────────────

export function Sidebar({
  sections,
  footerItems,
  brand,
  workspaceSwitcher,
  collapsed,
  onToggleCollapse,
  onNavigate,
  ariaLabel = 'Navegação principal',
}: SidebarProps) {
  const isMobile = useMediaQuery(SIDEBAR_MOBILE_QUERY)
  const drawerOpen = isMobile && !collapsed
  const { containerRef } = useFocusTrap({
    isActive: drawerOpen,
    onEscape: onToggleCollapse,
  })

  return (
    <>
      {/* Desktop — coluna in-flow (full-height à esquerda) */}
      <aside
        className="hidden shrink-0 flex-col border-r border-border bg-surface-base p-2 pb-3 transition-[width] duration-200 ease-in-out lg:flex"
        style={{ width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
        aria-label={ariaLabel}
      >
        <SidebarBody
          collapsed={collapsed}
          sections={sections}
          footerItems={footerItems}
          brand={brand}
          workspaceSwitcher={workspaceSwitcher}
          onNavigate={onNavigate}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* Mobile — drawer overlay + backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-(--backdrop-bg) lg:hidden"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}
      <aside
        ref={containerRef}
        id={SIDEBAR_MOBILE_ID}
        className={
          'fixed inset-y-0 left-0 z-50 flex w-[84%] max-w-[320px] flex-col border-r border-border bg-surface-base p-2 pb-3 shadow-lg transition-transform duration-200 ease-in-out lg:hidden ' +
          (collapsed ? '-translate-x-full' : 'translate-x-0')
        }
        aria-label={ariaLabel}
        inert={collapsed}
      >
        <SidebarBody
          collapsed={false}
          sections={sections}
          footerItems={footerItems}
          brand={brand}
          workspaceSwitcher={workspaceSwitcher}
          onNavigate={onNavigate ?? onToggleCollapse}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>
    </>
  )
}