// ── Banner — aviso em linha (info/sucesso/atenção/erro) ──────────────────
//
// Lacuna do kit (README: "Banner → TBD; ErrorState cobre erro"), criada na
// UI-STD-03. `ErrorState` é o bloco grande que SUBSTITUI um conteúdo que
// falhou; `Banner` é a faixa que convive com o conteúdo (erro de um request,
// "sua URL foi criada", falha ao carregar com botão de tentar de novo).
//
// Erro e atenção usam `role="alert"`; info e sucesso, `role="status"`.
// Ícone, fundo e borda só por token de status.

import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export type BannerTone = 'info' | 'success' | 'warning' | 'error'

export const bannerVariants = cva('flex w-full items-start gap-3 rounded-lg border px-4 py-3', {
  variants: {
    tone: {
      info: 'border-border bg-status-info-muted',
      success: 'border-border bg-status-success-muted',
      warning: 'border-border bg-status-warning-muted',
      error: 'border-border bg-status-error-muted',
    },
  },
  defaultVariants: { tone: 'info' },
})

const ICON_TONE: Record<BannerTone, string> = {
  info: 'text-status-info',
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: CircleAlert } as const

export interface BannerProps {
  tone?: BannerTone
  title: ReactNode
  description?: ReactNode
  /** Ação à direita (ex.: botão "Retry"). */
  action?: ReactNode
  /** Mostra o X de dispensar. */
  onDismiss?: () => void
  dismissLabel?: string
  className?: string
}

export function Banner({
  tone = 'info',
  title,
  description,
  action,
  onDismiss,
  dismissLabel = 'Dispensar',
  className,
}: BannerProps) {
  const Icon = ICONS[tone]
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn(bannerVariants({ tone }), className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_TONE[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-text-primary">{title}</p>
        {description ? (
          <div className="mt-0.5 break-words text-caption text-text-secondary">{description}</div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2 self-center">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-overlay hover:text-text-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
