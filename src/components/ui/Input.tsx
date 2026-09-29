import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// ── Input — campo de texto com ícone opcional ─────────────────
// Spec 02 §7: wrapper flex items-center gap8 h36 px10 radius8 border
// bg-base; focus-within border-accent + halo 3px accent-muted; sm h32.
// Variantes do wrapper com `cva`; `wrapperClassName` e `className` passam
// pelo `cn`, então sobrescrevem a variante (ex.: `wrapperClassName="h-7"`).

export const inputWrapperVariants = cva(
  'flex items-center gap-2 rounded-md border bg-surface-base px-2.5 transition-[border-color,box-shadow] ' +
    'focus-within:border-border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-muted)]',
  {
    variants: {
      size: { sm: 'h-8', md: 'h-9' },
      error: { true: 'border-status-error', false: 'border-border' },
    },
    defaultVariants: { size: 'md', error: false },
  },
)

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** Altura reduzida (32px) para toolbars. */
  sm?: boolean
  error?: boolean
  /** Classe aplicada ao wrapper (largura, etc). */
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, trailingIcon, sm = false, error = false, className, wrapperClassName, ...props },
  ref,
) {
  return (
    <label
      data-slot="input"
      className={cn(inputWrapperVariants({ size: sm ? 'sm' : 'md', error }), wrapperClassName)}
    >
      {leadingIcon ? (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-text-tertiary">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={error || props['aria-invalid'] || undefined}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-body text-text-primary outline-hidden placeholder:text-text-tertiary',
          className,
        )}
        {...props}
      />
      {trailingIcon ? (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-text-tertiary">
          {trailingIcon}
        </span>
      ) : null}
    </label>
  )
})
