// ── ErrorState — feedback de erro com retry opcional ─────────────
//
// Padrão de erro consistente para qualquer página que use useQuery.
// Use quando isError do useQuery é ignorado. O usuário recebe:
//   - ícone de alerta em cor error
//   - título
//   - descrição opcional
//   - botão "Tentar de novo" opcional (variant secondary)
//   - código para suporte opcional (x-request-id da API ou id do relato de erro)

import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title: string
  description?: string
  /** Quando fornecido, renderiza o botão "Tentar de novo". */
  onRetry?: () => void
  /** Texto customizado do botão de retry. */
  retryText?: string
  /** Elemento opcional (link, botão custom) abaixo do retry. */
  action?: ReactNode
  /**
   * Código para suporte: o `x-request-id` da requisição que falhou ou o id do
   * relato de erro (ver `lib/errorReporter.ts`). É o id da linha no log do
   * backend.
   */
  code?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryText = 'Tentar de novo',
  action,
  code,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-linear-to-b from-surface-base to-surface-raised p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-error-muted)">
        <CircleAlert className="h-6 w-6 text-status-error" aria-hidden />
      </div>
      <div>
        <h3 className="text-subtitle font-semibold text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
        ) : null}
        {code ? (
          <p className="mt-2 text-caption text-text-tertiary">
            Código para suporte: <code className="select-all font-mono">{code}</code>
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryText}
        </Button>
      ) : null}
      {action}
    </div>
  )
}
