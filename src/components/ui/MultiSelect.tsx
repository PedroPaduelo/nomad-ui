// ── MultiSelect — escolha de vários valores numa lista (com busca) ────────
//
// Lacuna do kit (README: "MultiSelector → TagInput"; o TagInput é texto
// livre, não serve para escolher de uma lista fechada como chaves, modelos
// ou pessoas). Criada na UI-STD-03 sobre o `Popover` do kit: gatilho com o
// resumo ("3 selected"), painel com busca opcional e caixas de seleção
// nativas (`role="group"` com nome), "Clear" no rodapé.
//
// Teclado: o gatilho é um <button>; no painel, Tab percorre busca → opções
// → Clear, Espaço marca, Esc fecha e devolve o foco (Popover).

import { useId, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Popover } from './Popover'
import { inputWrapperVariants } from './Input'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  /** Nome do campo (rótulo do gatilho e do painel). */
  label: string
  placeholder?: string
  /** Mostra a busca dentro do painel. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Altura 32px (toolbars e filtros). */
  sm?: boolean
  disabled?: boolean
  /** Textos (padrão em inglês). */
  labels?: { selected?: (n: number) => string; clear?: string; empty?: string }
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Qualquer',
  searchable = false,
  searchPlaceholder = 'Buscar…',
  sm = false,
  disabled = false,
  labels,
  className,
}: MultiSelectProps) {
  const baseId = useId()
  const [query, setQuery] = useState('')
  const selectedText = labels?.selected ?? ((n: number) => `${n} selecionados`)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, query])

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : selectedText(value.length)

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className={cn(inputWrapperVariants({ size: sm ? 'sm' : 'md' }), 'w-full opacity-50', className)}
      >
        <span className="min-w-0 flex-1 truncate text-body text-text-tertiary">{summary}</span>
      </div>
    )
  }

  return (
    <Popover
      ariaLabel={`${label}: ${summary}`}
      className={cn('w-full', className)}
      buttonClassName={cn(
        inputWrapperVariants({ size: sm ? 'sm' : 'md' }),
        'w-full cursor-pointer text-left outline-hidden',
      )}
      panelClassName="w-[min(320px,calc(100vw-2rem))]"
      button={
        <>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-body',
              value.length === 0 ? 'text-text-tertiary' : 'text-text-primary',
            )}
          >
            {summary}
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-tertiary" strokeWidth={1.75} />
        </>
      }
    >
      <div className="flex max-h-[340px] flex-col">
        {searchable ? (
          <div className="border-b border-border p-2">
            <label className={cn(inputWrapperVariants({ size: 'sm' }))}>
              <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Buscar ${label}`}
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent text-body text-text-primary outline-hidden placeholder:text-text-tertiary"
              />
            </label>
          </div>
        ) : null}
        <div role="group" aria-label={label} className="min-h-0 flex-1 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="px-2.5 py-3 text-caption text-text-tertiary">{labels?.empty ?? 'Nenhuma opção'}</p>
          ) : (
            visible.map((o) => {
              const id = `${baseId}-${o.value}`
              const checked = value.includes(o.value)
              return (
                <label
                  key={o.value}
                  htmlFor={id}
                  className={cn(
                    'flex h-8 cursor-pointer items-center gap-2.5 rounded-chip px-2.5 text-body transition-colors',
                    'hover:bg-surface-overlay',
                    checked ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-(--color-accent)"
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </label>
              )
            })
          )}
        </div>
        {value.length > 0 ? (
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <span className="text-caption tabular-nums text-text-tertiary">{selectedText(value.length)}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-sm text-caption font-medium text-text-accent outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              {labels?.clear ?? 'Limpar'}
            </button>
          </div>
        ) : null}
      </div>
    </Popover>
  )
}
