/**
 * Header — barra do app shell (redesign protótipo).
 *
 * Trazido do agent-package (frontend/src/components/layout/Header.tsx) com
 * a mesma UX visual (h-12, border-b, hambúrguer no mobile que abre o drawer
 * da sidebar, command bar no desktop com atalho, paleta/tema e menu de
 * usuário à direita) mas desacoplado do produto: brand, command bar,
 * theme switcher, organization switcher e user menu são passados por slot.
 *
 * O hambúrguer é interno (controla o drawer da sidebar) e usa
 * `aria-controls={SIDEBAR_MOBILE_ID}` do pacote — pareando com o
 * `<aside id={SIDEBAR_MOBILE_ID}>` da `Sidebar`.
 *
 * Fonte da verdade visual: agent-package. Nada de cores hardcoded — só
 * tokens do tema.
 */
import { Menu as MenuIcon, Package, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { SIDEBAR_MOBILE_ID } from './Sidebar'

export interface HeaderProps {
  /**
   * Marca exibida no mobile (desktop: a marca mora na sidebar). Pode ser
   * qualquer nó — por exemplo `<TopBarBrand logo={...} name="..." />` do
   * `@nomad/ui/topbar`. Se omitido, mostra "AgentPack" como fallback.
   */
  brand?: ReactNode
  /** Texto exibido no fallback de brand (padrão: "AgentPack"). */
  brandFallbackLabel?: string
  /**
   * Command bar do desktop (botão que abre a paleta de comandos). Se
   * omitido, renderiza um botão genérico "Buscar ou ir para…" com `⌘K`.
   */
  commandBar?: ReactNode
  /** Callback do command bar (desktop) quando o caller fornece um custom. */
  onOpenCommandPalette?: () => void
  /** Rótulo do atalho (exibido no kbd do command bar). Padrão: "⌘K". */
  commandShortcutLabel?: string
  /** Botão de busca do mobile (lupa). Se omitido, usa um botão genérico. */
  mobileSearch?: ReactNode
  /** Callback do botão de busca mobile. */
  onOpenMobileSearch?: () => void
  /** Slot à direita do header (ex.: OrganizationSwitcher, ThemeSwitcher, HeaderUserMenu). */
  actions?: ReactNode
  /**
   * Estado aberto/fechado da sidebar (controla `aria-expanded` do
   * hambúrguer). Padrão: `false`.
   */
  sidebarOpen?: boolean
  /** Callback do hambúrguer — alterna o drawer da sidebar. */
  onToggleSidebar?: () => void
  /**
   * Rótulo do `aria-label` do hambúrguer (padrão: "Abrir navegação") e
   * do botão de busca mobile (padrão: "Buscar").
   */
  ariaLabelHamburger?: string
  ariaLabelSearch?: string
}

const DEFAULT_SHORTCUT_LABEL = '⌘K'

export function Header({
  brand,
  brandFallbackLabel = 'AgentPack',
  commandBar,
  onOpenCommandPalette,
  commandShortcutLabel = DEFAULT_SHORTCUT_LABEL,
  mobileSearch,
  onOpenMobileSearch,
  actions,
  sidebarOpen = false,
  onToggleSidebar,
  ariaLabelHamburger = 'Abrir navegação',
  ariaLabelSearch = 'Buscar',
}: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface-body px-4">
      {/* Hambúrguer — mobile, abre o drawer da sidebar */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={ariaLabelHamburger}
        aria-controls={SIDEBAR_MOBILE_ID}
        aria-expanded={sidebarOpen}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary lg:hidden"
      >
        <MenuIcon className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {/* Marca — mobile (no desktop a marca mora na sidebar) */}
      {brand ?? (
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary lg:hidden">
          <span className="grid h-6 w-6 place-items-center rounded-chip bg-accent text-text-onAccent">
            <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          {brandFallbackLabel}
        </div>
      )}

      {/* Command bar — desktop */}
      {commandBar ?? (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label={`Buscar ou ir para (${commandShortcutLabel})`}
          aria-keyshortcuts="Meta+K Control+K"
          className="hidden h-8 max-w-[520px] flex-1 items-center gap-2 rounded-md border border-border bg-surface-base px-2.5 text-body text-text-tertiary transition-colors hover:border-border-hover hover:text-text-secondary lg:flex"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Buscar ou ir para…
          <kbd className="ml-auto rounded-sm border border-border bg-surface-body px-1.5 py-px font-mono text-micro text-text-tertiary">
            {commandShortcutLabel}
          </kbd>
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* Lupa — mobile */}
        {mobileSearch ?? (
          <button
            type="button"
            onClick={onOpenMobileSearch}
            aria-label={ariaLabelSearch}
            aria-keyshortcuts="Meta+K Control+K"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary lg:hidden"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}
        {actions}
      </div>
    </header>
  )
}