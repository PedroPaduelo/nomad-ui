// ── StatusDot — ponto de estado (ao vivo, ativo, código HTTP) ─────────────
//
// Lacuna do kit (README mapeia StatusDot → StatusBadge, mas o StatusBadge é
// uma etiqueta com texto; em célula de tabela e em indicador "ao vivo" o
// ponto sozinho, ao lado de um texto que já existe, é o que cabe). Criado na
// UI-STD-03. Com `label` vira `role="img"` com nome; sem, é decorativo.
// `pulse` anima um halo (desligado com prefers-reduced-motion).

import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export type StatusDotTone = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'

export const statusDotVariants = cva('relative inline-flex shrink-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      error: 'bg-status-error',
      info: 'bg-status-info',
      accent: 'bg-accent',
      neutral: 'bg-text-tertiary',
    },
    size: { sm: 'h-1.5 w-1.5', md: 'h-2 w-2' },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
})

export interface StatusDotProps {
  tone?: StatusDotTone
  size?: 'sm' | 'md'
  /** Halo pulsando (ex.: stream ao vivo). */
  pulse?: boolean
  /** Nome acessível; sem ele o ponto é decorativo. */
  label?: string
  /** Dica nativa ao passar o mouse. */
  title?: string
  className?: string
}

export function StatusDot({ tone = 'neutral', size = 'md', pulse = false, label, title, className }: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={title}
      className={cn('relative inline-flex shrink-0', className)}
    >
      {pulse ? (
        <span
          aria-hidden="true"
          className={cn(
            statusDotVariants({ tone, size }),
            'absolute inset-0 animate-ping opacity-60 motion-reduce:hidden',
          )}
        />
      ) : null}
      <span className={statusDotVariants({ tone, size })} />
    </span>
  )
}
