import { forwardRef, type TextareaHTMLAttributes } from 'react'

// ── Textarea — campo multilinha ───────────────────────────────
// Spec 02 §7: min-h84 pad 8/10 radius8 border bg-base resize-y 13.5;
// focus border-accent + halo 3px accent-muted.

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error = false, className = '', ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={
        'min-h-[84px] w-full resize-y rounded-md border bg-surface-base px-2.5 py-2 text-body text-text-primary ' +
        'outline-hidden transition-[border-color,box-shadow] placeholder:text-text-tertiary ' +
        'focus:border-border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)] ' +
        (error ? 'border-status-error ' : 'border-border ') +
        className
      }
      {...props}
    />
  )
})
