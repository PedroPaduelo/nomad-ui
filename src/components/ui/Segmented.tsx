import { type ReactNode } from 'react'

// ── Segmented — controle segmentado (radiogroup) ──────────────
// Spec 02 §5: container border radius8 bg-base p2; item h28 px10
// radius6; selecionado = pílula elevada (bg-raised + shadow-sm).

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
  /**
   * Ocupa toda a largura disponível, com os itens dividindo o espaço em
   * partes iguais. Sem isto o controle fica do tamanho do texto e sobra
   * espaço vazio ao lado dentro de um painel estreito.
   */
  fullWidth?: boolean
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
  fullWidth = false,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={
        (fullWidth ? 'flex w-full ' : 'inline-flex ') +
        'gap-0.5 rounded-md border border-border bg-surface-base p-0.5 ' +
        className
      }
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={
              (fullWidth ? 'flex-1 justify-center ' : '') +
              'inline-flex h-7 items-center gap-1.5 rounded-chip px-2.5 text-caption font-medium transition-colors ' +
              (active
                ? 'bg-surface-raised text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary')
            }
          >
            {opt.icon ? (
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                {opt.icon}
              </span>
            ) : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
