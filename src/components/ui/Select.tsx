import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

// ── Select — select nativo estilizado ─────────────────────────
// Spec 02 §8: h36 pl10 pr32 radius8 border bg-base 13.5; chevron
// text-3 ancorado à direita. Altura sm=32.
//
// `ghost` (TASK-PAGE-01): o valor aparece como texto, sem caixa; a borda e o
// fundo só surgem no hover/foco. É o "valor editável no lugar" das laterais de
// propriedades (Linear/Plane), sem cara de formulário. O chevron só aparece
// junto com a caixa.

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  sm?: boolean
  ghost?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { sm = false, ghost = false, className = '', children, ...props },
  ref,
) {
  return (
    <div className={'group/select relative inline-flex' + (ghost ? ' w-full' : '')}>
      <select
        ref={ref}
        data-variant={ghost ? 'ghost' : 'default'}
        className={
          'appearance-none rounded-md border pl-2.5 pr-8 text-body text-text-primary ' +
          'outline-hidden transition-[border-color,box-shadow,background-color] ' +
          'focus:border-border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)] ' +
          (ghost
            ? 'cursor-pointer border-transparent bg-transparent -ml-2.5 w-[calc(100%+0.625rem)] hover:border-border hover:bg-surface-raised disabled:cursor-not-allowed '
            : 'border-border bg-surface-base ') +
          (sm ? 'h-8 ' : 'h-9 ') +
          className
        }
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={
          'pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary' +
          (ghost
            ? ' opacity-0 transition-opacity group-hover/select:opacity-100 group-focus-within/select:opacity-100'
            : '')
        }
        strokeWidth={1.75}
      />
    </div>
  )
})
