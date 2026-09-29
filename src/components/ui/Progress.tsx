// ── Progress — barra de progresso ─────────────────────────────
// Spec 02 §10: trilha h6 / radius3 / bg surface-overlay; fill cor
// --ok (success). ARIA progressbar.

export interface ProgressProps {
  /** Percentual preenchido, 0–100. */
  value: number
  className?: string
  'aria-label'?: string
}

export function Progress({ value, className = '', 'aria-label': ariaLabel }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={'h-1.5 overflow-hidden rounded-[3px] bg-surface-overlay ' + className}
    >
      <div
        className="h-full rounded-[3px] bg-status-success transition-[width] duration-(--transition-normal)"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
