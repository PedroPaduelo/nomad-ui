import { type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'accent'
  | 'agent'
  | 'outline'
  | 'neutral'

/**
 * Variantes em classes ligadas aos tokens de globals.css (`cva`, FE-S1): as
 * cores seguem tema e paleta sozinhas. `text-accent`/`text-amber` são os
 * tokens LEGÍVEIS de texto (FE-A2); `bg-*-muted` é o fundo suave.
 *
 * Forma (Spec 02 §3): retângulo arredondado (radius 6 = chip), h22, gap5,
 * não pílula. `mono` aplica a fonte mono (ids, contagens).
 */
export const badgeVariants = cva(
  'inline-flex h-[22px] items-center gap-1.5 rounded-chip px-2 text-caption font-medium',
  {
    variants: {
      variant: {
        default: 'bg-accent-muted text-accent',
        secondary: 'bg-(--color-neutral-muted) text-text-secondary',
        success: 'bg-status-success-muted text-status-success',
        warning: 'bg-status-warning-muted text-status-warning',
        error: 'bg-status-error-muted text-status-error',
        info: 'bg-status-info-muted text-status-info',
        accent: 'bg-accent-muted text-accent',
        agent: 'bg-amber-muted text-amber',
        neutral: 'bg-(--color-neutral-muted) text-text-secondary',
        outline: 'border border-border bg-transparent text-text-secondary',
      },
      mono: { true: 'font-mono', false: '' },
    },
    defaultVariants: { variant: 'default', mono: false },
  },
)

export function Badge({
  children,
  variant = 'default',
  mono = false,
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  /** Fonte mono (ids, contagens, caminhos). */
  mono?: boolean
  className?: string
}) {
  return (
    <span data-variant={variant} className={cn(badgeVariants({ variant, mono }), className)}>
      {children}
    </span>
  )
}
