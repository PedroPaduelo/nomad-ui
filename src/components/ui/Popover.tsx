import { useState, type MouseEvent, type ReactNode } from 'react'
import { Popover as BasePopover } from '@base-ui/react/popover'

// ── Popover — painel flutuante com conteúdo livre ─────────────────
// Para o que NÃO é lista de ações: sumário, preferências, filtros. Mesmo
// visual do painel do `Menu` (Spec 02 §9), sobre o Popover headless do Base
// UI: o gatilho tem aria-expanded/aria-controls, o painel é um diálogo não
// modal com a ordem de Tab natural, Esc e clique fora fecham e o foco volta
// para o gatilho. O painel vai para o `body` (portal), com detecção de colisão.
//
// Uso: <Popover button={<...>} ariaLabel="..."><conteúdo/></Popover>.
// Lista de ações com ↑/↓ é `Menu`.

export interface PopoverProps {
  /** Conteúdo do botão-gatilho. */
  button: ReactNode
  buttonClassName?: string
  /** Nome acessível do gatilho e do painel. */
  ariaLabel: string
  align?: 'left' | 'right'
  children: ReactNode
  className?: string
  /** Classes extras no painel. */
  panelClassName?: string
  /**
   * Fecha o painel quando um elemento clicável dentro dele é acionado
   * (ex.: sumário que leva a uma seção). Padrão: continua aberto.
   */
  closeOnClick?: boolean
}

export function Popover({
  button,
  buttonClassName = '',
  ariaLabel,
  align = 'left',
  children,
  className = '',
  panelClassName = '',
  closeOnClick = false,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const onPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnClick && (event.target as HTMLElement).closest('button, a[href]')) setOpen(false)
  }
  return (
    <div className={'relative ' + className}>
      <BasePopover.Root open={open} onOpenChange={setOpen}>
        <BasePopover.Trigger aria-label={ariaLabel} className={buttonClassName}>
          {button}
        </BasePopover.Trigger>
        <BasePopover.Portal>
          <BasePopover.Positioner
            side="bottom"
            align={align === 'right' ? 'end' : 'start'}
            sideOffset={4}
            collisionPadding={8}
            className="z-110 outline-hidden"
            // Camada flutuante do kit: o focus trap de Modal/Drawer deixa o
            // foco entrar aqui (o painel está no body, fora do diálogo).
            data-floating-layer=""
          >
            <BasePopover.Popup
              aria-label={ariaLabel}
              onClick={onPanelClick}
              className={
                'max-w-[360px] rounded-md border border-border bg-surface-raised shadow-lg outline-hidden' +
                (panelClassName ? ' ' + panelClassName : '')
              }
            >
              {children}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    </div>
  )
}
