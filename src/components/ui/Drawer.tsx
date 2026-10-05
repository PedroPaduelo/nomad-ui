// ── Drawer — Painel lateral (slide-from-right) centralizado ──────────────
//
// Substitui os padrões de drawer espalhados pelo projeto. Encapsula:
//   • Portalização (ModalPortal) → fora do stacking context do app shell
//   • Backdrop com bg-black/50 + backdrop-blur-xs
//   • z-100 consistente
//   • Click-outside para fechar (configurável)
//   • ESC para fechar (configurável)
//   • Body scroll lock enquanto aberto
//   • Header com título + botão de fechar
//   • Nome acessível só com título presente (ver abaixo)
//   • Focus trap (WAI-ARIA) enquanto aberto
//
// Nome acessível: o `role="dialog"` só recebe `aria-labelledby` quando um
// título foi montado dentro dele (DrawerHeader ou DrawerTitle); sem título,
// passe `aria-label` ou `aria-labelledby`. Assim o diálogo nunca aponta para
// um id que não existe (axe: aria-valid-attr-value / aria-dialog-name).
//
// Uso:
//   <Drawer isOpen={open} onClose={close}>
//     <DrawerHeader title="Detalhes" onClose={close} />
//     <DrawerBody>...conteúdo...</DrawerBody>
//   </Drawer>
//
// Header próprio: use <DrawerTitle> (e <DrawerDescription>) no lugar do <h2>.

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { useFocusTrap } from '../../hooks/useFocusTrap'

// ── Internal context: DrawerTitle / DrawerDescription stamp the dialog's
//    ids on their elements and register themselves while mounted, so the
//    dialog only references ids that exist in the DOM. ─────────────────
interface DrawerDialogContextValue {
  titleId: string
  descriptionId: string
  registerTitle: () => () => void
  registerDescription: () => () => void
}
const DrawerDialogContext = createContext<DrawerDialogContextValue | null>(null)

/** Conta quantos elementos de um tipo estão montados (title/description). */
function useMountedCount(): [number, () => () => void] {
  const [count, setCount] = useState(0)
  const register = useCallback(() => {
    setCount((n) => n + 1)
    return () => setCount((n) => n - 1)
  }, [])
  return [count, register]
}

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

const DRAWER_WIDTH: Record<DrawerSize, string> = {
  sm: '24rem', // 384px
  md: '32rem', // 512px (default)
  lg: '42rem', // 672px
  xl: '56rem', // 896px
}

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Largura do painel (default: 'md' = 512px). */
  size?: DrawerSize
  /** Largura custom (CSS). Sobrescreve `size`. */
  width?: string
  /** Permite fechar ao clicar no backdrop (default: true). */
  closeOnBackdropClick?: boolean
  /** Permite fechar com ESC (default: true). */
  closeOnEscape?: boolean
  /** Nome acessível quando o drawer não tem DrawerHeader/DrawerTitle. */
  'aria-label'?: string
  /** Id de um título próprio; tem precedência sobre o DrawerTitle. */
  'aria-labelledby'?: string
}

export function Drawer({
  isOpen,
  onClose,
  children,
  size = 'md',
  width,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: DrawerProps) {
  // Stable per mount, so the references survive re-renders.
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-desc`
  const [titleCount, registerTitle] = useMountedCount()
  const [descriptionCount, registerDescription] = useMountedCount()
  const context = useMemo(
    () => ({ titleId, descriptionId, registerTitle, registerDescription }),
    [titleId, descriptionId, registerTitle, registerDescription],
  )

  // Focus trap + scroll lock (handled by the hook).
  // The hook consumes `closeOnEscape` indirectly via onEscape; we still
  // honor it by only forwarding the ESC handler when enabled.
  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
    lockScroll: true,
    autoFocus: true,
  })

  if (!isOpen) return null

  const resolvedWidth = width ?? DRAWER_WIDTH[size]

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-100 flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (titleCount > 0 ? titleId : undefined)}
        aria-describedby={descriptionCount > 0 ? descriptionId : undefined}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-xs"
          style={{ backgroundColor: 'var(--backdrop-bg)' }}
          onClick={() => {
            if (closeOnBackdropClick) onClose()
          }}
          aria-hidden
        />

        {/* Painel */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative flex w-full max-w-full flex-col border-l shadow-lg"
          style={{
            width: resolvedWidth,
            maxWidth: '95vw',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--surface-raised)',
          }}
        >
          <DrawerDialogContext.Provider value={context}>{children}</DrawerDialogContext.Provider>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Drawer.Title / Drawer.Description — nomeiam e descrevem o diálogo ──
//
// Fora de um <Drawer> (testes isolados) usam um id local e não registram nada.

export interface DrawerTitleProps {
  children: ReactNode
  className?: string
}

export function DrawerTitle({
  children,
  className = 'truncate text-subtitle font-semibold text-text-primary',
}: DrawerTitleProps) {
  const ctx = useContext(DrawerDialogContext)
  const localId = useId()
  const register = ctx?.registerTitle
  useLayoutEffect(() => register?.(), [register])
  return (
    <h2 id={ctx?.titleId ?? localId} className={className}>
      {children}
    </h2>
  )
}

export interface DrawerDescriptionProps {
  children: ReactNode
  className?: string
}

export function DrawerDescription({
  children,
  className = 'mt-0.5 text-xs text-text-secondary',
}: DrawerDescriptionProps) {
  const ctx = useContext(DrawerDialogContext)
  const localId = useId()
  const register = ctx?.registerDescription
  useLayoutEffect(() => register?.(), [register])
  return (
    <p id={ctx?.descriptionId ?? localId} className={className}>
      {children}
    </p>
  )
}

// ── Drawer.Header — cabeçalho padronizado ──

export interface DrawerHeaderProps {
  title: string
  /** Subtítulo/descrição abaixo do título. */
  description?: string
  onClose: () => void
}

export function DrawerHeader({ title, description, onClose }: DrawerHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface-raised px-6 py-4 backdrop-blur-sm">
      <div className="min-w-0">
        <DrawerTitle>{title}</DrawerTitle>
        {description && <DrawerDescription>{description}</DrawerDescription>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="shrink-0 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-overlay hover:text-text-primary"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

// ── Drawer.Body — área scrollável (default: padding 24px) ──

export interface DrawerBodyProps {
  children: ReactNode
  /** Padding custom (default: 6 = 24px). */
  padding?: 0 | 4 | 5 | 6 | 8
  className?: string
}

export function DrawerBody({ children, padding = 6, className = '' }: DrawerBodyProps) {
  const paddingClass = padding === 0 ? '' : `p-${padding}`
  return <div className={`flex-1 overflow-y-auto ${paddingClass} ${className}`}>{children}</div>
}

// ── Drawer.Footer — rodapé com ações ──

export interface DrawerFooterProps {
  children: ReactNode
  className?: string
}

export function DrawerFooter({ children, className = '' }: DrawerFooterProps) {
  return (
    <div
      className={
        'flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 ' + className
      }
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--surface-body)',
      }}
    >
      {children}
    </div>
  )
}
