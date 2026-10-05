import { useMemo, useRef, type ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import { MenuLayer } from './Menu'

// ── ContextMenu — menu de botão direito, ancorado no cursor ──────────
// Mesmo visual e o mesmo teclado do `Menu` (Base UI: foco no primeiro item
// ao abrir, ↑/↓/Home/End, digitar a inicial, Esc fecha e devolve o foco).
// Controlado pelo chamador e posicionado no ponto do clique, reposicionado
// para não vazar da janela. Fecha em Escape, clique fora e ao escolher um
// item. Use com `MenuItem`/`MenuSeparator`/`MenuLabel`.
//
// Uso:
//   const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)
//   <div onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }) }} />
//   <ContextMenu position={ctx} onClose={() => setCtx(null)}>…</ContextMenu>

export interface ContextMenuProps {
  /** Ponto (viewport) onde abrir; null = fechado. */
  position: { x: number; y: number } | null
  onClose: () => void
  children: ReactNode
  ariaLabel?: string
}

export function ContextMenu({ position, onClose, children, ariaLabel }: ContextMenuProps) {
  const popupRef = useRef<HTMLDivElement>(null)
  const x = position?.x
  const y = position?.y
  // Âncora virtual de tamanho zero no ponto do clique.
  const anchor = useMemo(
    () =>
      x === undefined || y === undefined
        ? null
        : {
            getBoundingClientRect: () => ({
              x,
              y,
              top: y,
              left: x,
              right: x,
              bottom: y,
              width: 0,
              height: 0,
            }),
          },
    [x, y],
  )

  return (
    <BaseMenu.Root
      open={position !== null}
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <MenuLayer
        popupRef={popupRef}
        ariaLabel={ariaLabel}
        positioner={{ anchor, side: 'bottom', align: 'start', sideOffset: 0 }}
      >
        {children}
      </MenuLayer>
    </BaseMenu.Root>
  )
}
