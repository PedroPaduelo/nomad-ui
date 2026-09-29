// ── Modal — Componente centralizado de dialog modal ─────────────────────
//
// Encapsula:
//   • Portalização (ModalPortal) → fora do stacking context do app shell
//   • Backdrop com bg-black/50 + backdrop-blur-xs
//   • z-100 consistente (acima de qualquer header)
//   • Click-outside para fechar (configurável)
//   • ESC para fechar (configurável)
//   • Body scroll lock enquanto aberto
//   • Focus trap WAI-ARIA (Tab/Shift+Tab wraps, ESC fecha, focus restore)
//   • Suporte a header/footer/body padronizados
//
// Tamanhos pré-definidos (size) cobrem 90% dos casos de uso.
// Para casos exóticos, use `width` customizado.

import { type CSSProperties, createContext, useContext, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { uniqueId } from '../../lib/accessibility'

// ── Internal context so ModalHeader / DrawerHeader can read the dialog's
//    generated aria ids and stamp them on the title / description
//    elements, so the dialog's `aria-labelledby` / `aria-describedby`
//    references stay in sync without the consumer having to plumb ids. ─
interface DialogAriaContextValue {
  titleId: string
  descriptionId: string
}
const ModalDialogContext = createContext<DialogAriaContextValue | null>(null)

/**
 * Ids de título/descrição do diálogo aberto, para conteúdo que monta o próprio
 * cabeçalho sem `ModalHeader` (ex.: `ConfirmDialog`) ligar o nome acessível.
 * `null` fora de um Modal.
 */
export function useDialogAriaIds(): DialogAriaContextValue | null {
  return useContext(ModalDialogContext)
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

const SIZE_TO_WIDTH: Record<ModalSize, string> = {
  sm: '24rem', // 384px
  md: '32rem', // 512px (default)
  lg: '42rem', // 672px
  xl: '56rem', // 896px
  '2xl': '72rem', // 1152px
  '3xl': '84rem', // 1348px
  full: '95vw',
}

const SIZE_TO_MAX_HEIGHT: Record<ModalSize, string> = {
  sm: '85dvh',
  md: '85dvh',
  lg: '90dvh',
  xl: '90dvh',
  '2xl': '92dvh',
  '3xl': '92dvh',
  full: '95dvh',
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Tamanho pré-definido (default: 'md'). Ignorado se `width` for passado. */
  size?: ModalSize
  /** Largura custom (CSS). Sobrescreve `size`. */
  width?: string
  /** Altura máxima custom (CSS). Sobrescreve o default do `size`. */
  maxHeight?: string
  /** Variante fullscreen (cobre quase toda a viewport). */
  fullscreen?: boolean
  /** Permite fechar ao clicar fora do modal (default: true). */
  closeOnBackdropClick?: boolean
  /** Permite fechar com ESC (default: true). */
  closeOnEscape?: boolean
  /** Remove o padding interno (útil quando o body tem seu próprio padding). */
  noPadding?: boolean
  /**
   * Seletor (dentro do diálogo) do elemento que recebe o foco ao abrir.
   * Sem ele, o foco vai para o primeiro elemento focável (em geral o X do
   * cabeçalho). Formulários passam o primeiro campo, ex. `[data-autofocus]`.
   */
  initialFocusSelector?: string
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  width,
  maxHeight,
  fullscreen = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  noPadding = false,
  initialFocusSelector,
}: ModalProps) {
  // Ids estáveis durante toda a vida do componente (useId), para o
  // `aria-labelledby` / `aria-describedby` não mudarem a cada render.
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-desc`

  // Focus trap + scroll lock (handled by the hook).
  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
    lockScroll: true,
    autoFocus: true,
    initialFocusSelector,
  })

  if (!isOpen) return null

  const resolvedWidth = width ?? SIZE_TO_WIDTH[size]
  const resolvedMaxHeight = maxHeight ?? SIZE_TO_MAX_HEIGHT[size]

  const panelStyle: CSSProperties = {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--surface-raised)',
    ...(fullscreen
      ? {
          inset: '1rem',
          position: 'fixed' as const,
          maxWidth: 'none',
          width: 'calc(100% - 2rem)',
          height: 'calc(100% - 2rem)',
          maxHeight: 'calc(100% - 2rem)',
        }
      : {
          width: resolvedWidth,
          maxWidth: '95vw',
          maxHeight: resolvedMaxHeight,
        }),
  }

  return (
    <ModalPortal>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- clique no backdrop fecha; o Esc do focus trap cobre o teclado */}
      <div
        className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-xs"
        style={{ backgroundColor: 'var(--backdrop-bg)' }}
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) onClose()
        }}
      >
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={
            'relative flex flex-col rounded-lg border shadow-lg ' +
            (noPadding ? '' : 'overflow-hidden')
          }
          style={panelStyle}
        >
          <ModalDialogContext.Provider value={{ titleId, descriptionId }}>
            {children}
          </ModalDialogContext.Provider>
        </div>
      </div>
    </ModalPortal>
  )
}

// ── Modal.Header — cabeçalho padronizado (ícone + título + subtítulo + X) ──

export interface ModalHeaderProps {
  title: string
  /** Subtítulo/descrição abaixo do título. */
  description?: string
  onClose: () => void
  /** Ícone/badge à esquerda do título (opcional). */
  icon?: ReactNode
}

export function ModalHeader({ title, description, onClose, icon }: ModalHeaderProps) {
  const ctx = useContext(ModalDialogContext)
  // Fall back to local ids if the header is rendered outside a <Modal>.
  // This keeps the component usable in isolation (tests, storybook, etc.)
  // without breaking the aria-labelledby / aria-describedby reference.
  const titleId = ctx?.titleId ?? uniqueId('modal-title')
  const descriptionId = ctx?.descriptionId ?? uniqueId('modal-desc')

  return (
    <div
      className="flex items-start justify-between gap-4 border-b px-6 py-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: 'var(--color-accent-muted)',
              color: 'var(--color-accent)',
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-base font-semibold text-text-primary">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-xs text-text-secondary">
              {description}
            </p>
          )}
        </div>
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

// ── Modal.Body — área scrollável (default: padding 24px) ──

export interface ModalBodyProps {
  children: ReactNode
  /** Padding custom (default: 6 = 24px). Passe 0 pra sem padding. */
  padding?: 0 | 4 | 5 | 6 | 8
  /** Permite scroll vertical (default: true). */
  scrollable?: boolean
  className?: string
}

export function ModalBody({
  children,
  padding = 6,
  scrollable = true,
  className = '',
}: ModalBodyProps) {
  const paddingClass = padding === 0 ? '' : `p-${padding}`
  return (
    <div
      className={`flex-1 min-h-0 ${scrollable ? 'overflow-y-auto' : ''} ${paddingClass} ${className}`}
    >
      {children}
    </div>
  )
}

// ── Modal.Footer — rodapé com ações (default: alinhado à direita) ──

export interface ModalFooterProps {
  children: ReactNode
  /** Conteúdo à esquerda (ex: shortcut hint). */
  left?: ReactNode
  className?: string
}

export function ModalFooter({ children, left, className = '' }: ModalFooterProps) {
  return (
    <div
      className={
        'flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-body px-6 py-3 ' +
        className
      }
    >
      <div className="text-xs text-text-secondary">{left}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
