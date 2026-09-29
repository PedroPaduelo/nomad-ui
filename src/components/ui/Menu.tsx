import { useRef, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'

// ── Menu — dropdown de ações (padrão APG "Menu Button") ───────────
// Spec 02 §9: popover min-w220 pad6 bg-raised border radius8 shadow-lg;
// item h32 pad10 gap10 radius6 13 text-1, destaque bg-overlay; separador
// 1px; label 11.5 text-3; item ativo accent.
//
// Implementado sobre o Menu headless do Base UI (FE-08): o gatilho tem
// aria-haspopup/aria-expanded, Enter/Espaço/↓ abrem com o foco no primeiro
// item, ↑ abre no último, ↑/↓ circulam, Home/End vão às pontas, digitar a
// inicial salta para o item, Esc e clique fora fecham e o foco volta para o
// gatilho. O painel vai para o `body` (portal) e é posicionado com detecção
// de colisão: não é recortado por contêiner com overflow nem vaza da janela.
//
// Uso: <Menu button={<...>} ariaLabel="..."><MenuItem/>...</Menu>.
// Só `MenuItem`, `MenuSeparator` e `MenuLabel` entram no painel. Conteúdo
// interativo livre (botões, formulários) não é menu: use um popover.

const POPUP_CLASS =
  'max-w-[320px] min-w-[220px] rounded-md border border-border bg-surface-raised p-1.5 shadow-lg outline-hidden'

export interface MenuProps {
  /** Conteúdo do botão-gatilho. */
  button: ReactNode
  buttonClassName?: string
  ariaLabel?: string
  align?: 'left' | 'right'
  children: ReactNode
  className?: string
  /** Classes extras no painel do dropdown (ex. max-h + scroll). */
  menuClassName?: string
  /**
   * @deprecated O painel sempre vai para o `body` e é reposicionado para
   * caber na janela; o valor é ignorado. Mantido para não quebrar quem passa.
   */
  portal?: boolean
}

export function Menu({
  button,
  buttonClassName = '',
  ariaLabel,
  align = 'left',
  children,
  className = '',
  menuClassName = '',
}: MenuProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  return (
    <div className={'relative ' + className}>
      <BaseMenu.Root modal={false}>
        <BaseMenu.Trigger aria-label={ariaLabel} className={buttonClassName}>
          {button}
        </BaseMenu.Trigger>
        <MenuLayer
          popupRef={popupRef}
          className={menuClassName}
          positioner={{ side: 'bottom', align: align === 'right' ? 'end' : 'start', sideOffset: 4 }}
        >
          {children}
        </MenuLayer>
      </BaseMenu.Root>
    </div>
  )
}

// ── Camada do painel (compartilhada com o ContextMenu) ─────────────

interface MenuLayerProps {
  children: ReactNode
  className?: string
  ariaLabel?: string
  popupRef: RefObject<HTMLDivElement | null>
  positioner: ComponentProps<typeof BaseMenu.Positioner>
}

export function MenuLayer({
  children,
  className = '',
  ariaLabel,
  popupRef,
  positioner,
}: MenuLayerProps) {
  // Ao fechar, o foco volta para o gatilho, exceto quando a ação do item já
  // levou o foco para outro lugar (um campo de renomear, um diálogo): aí
  // devolvê-lo ao gatilho roubaria o foco de quem acabou de recebê-lo.
  const finalFocus = () => {
    const active = document.activeElement
    return !active || active === document.body || !!popupRef.current?.contains(active)
  }
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        collisionPadding={8}
        className="z-110 outline-hidden"
        // Camada flutuante do kit: o focus trap de Modal/Drawer deixa o foco
        // entrar aqui (o painel está no body, fora do diálogo que o abriu).
        data-floating-layer=""
        {...positioner}
      >
        <BaseMenu.Popup
          ref={popupRef}
          aria-label={ariaLabel}
          finalFocus={finalFocus}
          className={POPUP_CLASS + (className ? ' ' + className : '')}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

export interface MenuItemProps {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  href?: string
  current?: boolean
  /**
   * `false` mantém o menu aberto depois do clique (ex.: "carregar mais" numa
   * lista paginada dentro do menu). Padrão: fecha.
   */
  closeOnClick?: boolean
}

export function MenuItem({
  children,
  icon,
  onClick,
  href,
  current = false,
  closeOnClick = true,
}: MenuItemProps) {
  const cls =
    'flex h-8 w-full cursor-pointer select-none items-center gap-2.5 rounded-chip px-2.5 text-left text-body outline-hidden transition-colors ' +
    (current
      ? 'bg-accent-muted text-accent'
      : 'text-text-secondary data-highlighted:bg-surface-overlay data-highlighted:text-text-primary')
  const iconEl = icon ? (
    <span
      aria-hidden="true"
      className={
        'inline-flex h-4 w-4 shrink-0 items-center justify-center ' +
        (current ? 'text-accent' : 'text-text-tertiary')
      }
    >
      {icon}
    </span>
  ) : null

  if (href) {
    return (
      <BaseMenu.LinkItem href={href} aria-current={current ? 'true' : undefined} className={cls}>
        {iconEl}
        {children}
      </BaseMenu.LinkItem>
    )
  }
  return (
    <BaseMenu.Item
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
      closeOnClick={closeOnClick}
      className={cls}
    >
      {iconEl}
      {children}
    </BaseMenu.Item>
  )
}

/** Rótulo de seção. Fica fora da navegação por setas (não é item). */
export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-1.5 text-caption font-medium text-text-tertiary">{children}</div>
  )
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="my-1.5 h-px bg-border" />
}
