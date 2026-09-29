import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// ── Chip — filtro toggleável ──────────────────────────────────
// Spec 02 §4: h28 px10 rounded6 border text-caption gap6; base text-2
// transparente; hover border-hover text-1; selecionado accent-muted +
// border-accent + text-accent; contador mono micro. Variantes com `cva`.

export const chipVariants = cva(
  'inline-flex h-7 items-center gap-1.5 rounded-chip border px-2.5 text-caption font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'border-border-accent bg-accent-muted text-accent',
        false:
          'border-border bg-transparent text-text-secondary hover:border-border-hover hover:text-text-primary',
      },
    },
    defaultVariants: { active: false },
  },
)

const chipCountVariants = cva('font-mono text-micro', {
  variants: { active: { true: 'text-accent', false: 'text-text-tertiary' } },
  defaultVariants: { active: false },
})

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  count?: number
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active = false, leadingIcon, trailingIcon, count, children, className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-active={active}
      aria-pressed={active}
      className={cn(chipVariants({ active }), className)}
      {...props}
    >
      {leadingIcon ? (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{leadingIcon}</span>
      ) : null}
      {children}
      {typeof count === 'number' ? (
        <span className={chipCountVariants({ active })}>{count}</span>
      ) : null}
      {trailingIcon ? (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{trailingIcon}</span>
      ) : null}
    </button>
  )
})
