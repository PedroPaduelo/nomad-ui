import { type HTMLAttributes } from 'react'

// ── Kbd — cápsula mono para teclas (⌘K, Esc) ──────────────────
// Spec 02 §13 + PLANO §2.1: papel `micro` (mono), pad 1px 6px, border 1px, radius 4px,
// bg surface-body, cor text-tertiary.

export function Kbd({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={
        'inline-flex items-center rounded-sm border border-border bg-surface-body px-1.5 py-px ' +
        'font-mono text-micro leading-none text-text-tertiary ' +
        className
      }
      {...props}
    >
      {children}
    </kbd>
  )
}
