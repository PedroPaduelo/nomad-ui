// ── ModalPortal — Renderiza children fora da árvore React (em document.body) ──
//
// Por que isso existe: modais com `position: fixed` podem ter problemas de
// stacking/blur quando renderizados DENTRO de layouts que têm elementos
// com `backdrop-blur-sm`, `transform`, ou `overflow-hidden`. Portalizar
// garante que o modal fica em uma camada completamente separada,
// sempre ancorado na viewport, sem interagir com o stacking context do app shell.
//
// Uso interno do kit (Modal, Drawer). Fora de components/ui, use <Modal>/<Drawer>.
//
// O portal é criado no MESMO commit que monta o diálogo. Adiá-lo para depois
// de um efeito (o antigo `mounted` "SSR-safe" — o app é só SPA) deixava o
// contêiner fora do DOM quando o focus trap tentava pôr o foco inicial: no
// Chromium o diálogo abria com o foco ainda no botão que o abriu (FE-04).

import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ModalPortalProps {
  children: ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  return createPortal(children, document.body)
}
