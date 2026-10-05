import type { ReactNode } from 'react'
import { Label } from './Label'

export type StatVariant = 'memory' | 'task' | 'skill' | 'mcp' | 'knowledge' | 'default'

/**
 * Subtle accent tint per category — all derived from the design tokens.
 * The "tint" is layered via a small left-edge accent rather than the full
 * background, so the card keeps its surface and the variant reads at a glance.
 *
 * Dourado (amber) é exclusivo do agente; entidades usam color-accent.
 */
const variantTint: Record<StatVariant, string> = {
  memory: 'var(--color-accent)',
  task: 'var(--color-accent)',
  skill: 'var(--color-accent)',
  mcp: 'var(--color-accent)',
  knowledge: 'var(--color-accent)',
  default: 'var(--color-border)',
}

interface StatCardProps {
  count: number
  label: string
  icon?: ReactNode
  variant?: StatVariant
  className?: string
  onClick?: () => void
}

export function StatCard({
  count,
  label,
  icon,
  variant = 'default',
  className,
  onClick,
}: StatCardProps) {
  // Hover declarativo (border + surface). O estado em JS foi removido: ele
  // remexia `style` inline e ficava "grudado" quando o card remontava.
  return (
    <div
      className={
        'relative flex items-center gap-4 overflow-hidden rounded-lg border ' +
        'border-border bg-surface-raised p-4 transition-colors duration-150 ' +
        'hover:border-border-hover hover:bg-surface-overlay ' +
        (onClick ? 'cursor-pointer ' : '') +
        (className ?? '')
      }
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: variantTint[variant] }}
      />
      {icon ? (
        <div
          className="ml-1 flex h-8 w-8 items-center justify-center"
          style={{ color: variantTint[variant] }}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <div className="text-title font-semibold text-text-primary">{count}</div>
        <Label as="div" tone="default">
          {label}
        </Label>
      </div>
    </div>
  )
}
