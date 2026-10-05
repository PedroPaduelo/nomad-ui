import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

// ── Field — wrapper de campo (label + help/erro) ──────────────
// Spec 02 §7: grid gap6; label 13/500 text-1; obrigatório (*) text-err;
// help 12 text-3; erro 12 text-err com ícone.

export interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  required?: boolean
  help?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

/** Id do texto de erro de um campo, para o `aria-describedby` do controle. */
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`
}

export function Field({ label, htmlFor, required, help, error, children, className }: FieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-body font-medium text-text-primary">
          {label}
          {required ? <span className="ml-0.5 text-status-error">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span
          id={htmlFor ? fieldErrorId(htmlFor) : undefined}
          className="flex items-center gap-1.5 text-xs text-status-error"
        >
          {error}
        </span>
      ) : help ? (
        <span className="text-xs text-text-tertiary">{help}</span>
      ) : null}
    </div>
  )
}
