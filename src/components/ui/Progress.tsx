// ── Progress — barra de progresso ─────────────────────────────
// Spec 02 §10: trilha h6 / radius3 / bg surface-overlay; fill cor
// --ok (success). ARIA progressbar.
//
// `tone` (PKG-FIXES #5, reportado pela [LB] NUI-MIG-02): pinta o fill com
// `bg-status-{success,warning,error,info}` ou `bg-accent`, conforme o tom.
// Antes, o `className` ia só na trilha e apps pintavam o fill via override;
// agora `tone` resolve isso de primeira, e `fillClassName` cobre extras
// (ex.: `opacity-50` durante polling) sem brigar com o tom.

export type ProgressTone = 'success' | 'accent' | 'warning' | 'error' | 'info'

const TONE_FILL: Record<ProgressTone, string> = {
  success: 'bg-status-success',
  accent: 'bg-accent',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  info: 'bg-status-info',
}

export interface ProgressProps {
  /** Percentual preenchido, 0–100. */
  value: number
  /** Tom do preenchimento (mapeado para tokens do tema). Padrão: `success`. */
  tone?: ProgressTone
  /** Classes extras no `className` da trilha (ex.: `h-3` para deixar mais alta). */
  className?: string
  /** Classes extras no preenchimento (ex.: `opacity-50` durante polling). */
  fillClassName?: string
  'aria-label'?: string
}

export function Progress({
  value,
  tone = 'success',
  className = '',
  fillClassName = '',
  'aria-label': ariaLabel,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-tone={tone}
      className={'h-1.5 w-full overflow-hidden rounded-[3px] bg-surface-overlay ' + className}
    >
      <div
        className={
          'h-full rounded-[3px] transition-[width] duration-(--transition-normal) ' +
          TONE_FILL[tone] +
          (fillClassName ? ' ' + fillClassName : '')
        }
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
