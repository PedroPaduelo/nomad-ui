/**
 * MainLayout — composição do app shell (sidebar lateral + header + main).
 *
 * Trazido do agent-package (frontend/src/layouts/MainLayout.tsx) com a
 * mesma UX visual (flex h-screen, sidebar full-height à esquerda, header
 * sobre a coluna de conteúdo, conteúdo em --content-max) mas desacoplado
 * do produto: `Sidebar`, `Header`, `Breadcrumb` são passados por prop.
 *
 * O caller é dono do estado da sidebar (passa `sidebarCollapsed` +
 * `onToggleSidebar`) e dos atalhos globais (passa `useGlobalShortcuts`).
 * Toasts, banner de conexão e command palette são responsabilidade do app
 * — ficam de fora desta peça de pacote.
 *
 * Fonte da verdade visual: agent-package. Nada de cores hardcoded — só
 * tokens do tema.
 */
import type { ReactNode } from 'react'
import type { SidebarProps } from './Sidebar'
import type { HeaderProps } from './Header'
import type { BreadcrumbProps } from './Breadcrumb'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'

export interface MainLayoutProps {
  /**
   * A sidebar já montada com suas props específicas. O `MainLayout` é dono
   * do estado da sidebar (`sidebarCollapsed`, `onToggleSidebar`) e do
   * `onNavigate` (para fechar o drawer mobile ao clicar em um item) — não
   * passe esses campos aqui.
   */
  sidebar: Omit<SidebarProps, 'collapsed' | 'onToggleCollapse' | 'onNavigate'>
  /** Estado de sidebar (controla `aria-expanded` do hambúrguer). */
  sidebarCollapsed: boolean
  /** Alterna estado de sidebar. */
  onToggleSidebar: () => void

  /** Props adicionais do Header (ações, brand, command bar, etc). */
  header?: Omit<HeaderProps, 'sidebarOpen' | 'onToggleSidebar'>

  /**
   * Itens da breadcrumb (opcional). Se omitido, não renderiza trilha.
   * Para personalizar a home da trilha, passe `breadcrumbHome` e
   * `breadcrumbAriaLabel`.
   */
  breadcrumb?: BreadcrumbProps['items']
  /** Home customizada da trilha (padrão: ícone Home apontando para "/"). */
  breadcrumbHome?: BreadcrumbProps['home']
  /** aria-label da `<nav>` da trilha. */
  breadcrumbAriaLabel?: BreadcrumbProps['ariaLabel']

  /**
   * Padding lateral do conteúdo principal. Padrão: `p-6`. Use `false` para
   * conteúdo full-bleed (ex.: Studio de leitura, previews de tela).
   */
  contentPadding?: 'p-6' | 'p-4' | 'p-0' | false

  /**
   * Largura máxima do conteúdo centralizado. Padrão: `--content-max`
   * (1760px). Para desativar o teto, passe `false` (full-bleed dentro do
   * padding).
   */
  contentMax?: 'max-w-(--content-max)' | false

  /** Conteúdo da página. */
  children: ReactNode

  /** Slot opcional acima do header (ex.: banner de conectividade). */
  beforeHeader?: ReactNode
  /** Slot opcional acima do conteúdo (ex.: barra de filtro sticky). */
  beforeMain?: ReactNode

  /** Rótulo do `aria-label` da `<main>`. Padrão: "Conteúdo principal". */
  mainAriaLabel?: string
}

export function MainLayout({
  sidebar,
  sidebarCollapsed,
  onToggleSidebar,
  header,
  breadcrumb,
  breadcrumbHome,
  breadcrumbAriaLabel,
  contentPadding = 'p-6',
  contentMax = 'max-w-(--content-max)',
  children,
  beforeHeader,
  beforeMain,
  mainAriaLabel = 'Conteúdo principal',
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-body">
      <Sidebar
        {...sidebar}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        onNavigate={onToggleSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {beforeHeader}
        <Header
          {...header}
          sidebarOpen={!sidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
        />
        <main
          aria-label={mainAriaLabel}
          className={`min-h-0 flex-1 overflow-auto ${contentPadding === false ? '' : contentPadding}`}
        >
          {contentMax === false ? (
            children
          ) : (
            <div className={`mx-auto flex h-full min-h-0 w-full flex-col ${contentMax}`}>
              {breadcrumb && breadcrumb.length > 0 ? (
                <div className={contentPadding === false ? '' : 'mb-4 shrink-0'}>
                  <Breadcrumb
                    items={breadcrumb}
                    home={breadcrumbHome}
                    ariaLabel={breadcrumbAriaLabel}
                  />
                </div>
              ) : null}
              {beforeMain}
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}