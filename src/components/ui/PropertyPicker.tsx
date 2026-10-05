// ── PropertyPicker — valor de propriedade editável no lugar, com busca ──
//
// O "valor clicável" das laterais de propriedades (Linear/Plane): em repouso
// é só ícone + rótulo, sem caixa; ao ativar abre um popup com campo de busca
// e a lista de opções (Base UI Combobox, padrão "input inside popup").
// Teclado: Enter/Espaço/↓ abrem, digitar filtra, ↑/↓ navegam, Enter escolhe,
// Esc fecha e o foco volta ao gatilho. Opção `disabled` aparece com o motivo
// (`hint`) e não pode ser escolhida (ex.: portão HITL do status).
//
// O painel vai para o `body` com `data-floating-layer`, como Menu/Popover:
// funciona dentro de Modal/Drawer (ver README do kit).

import type { ReactNode } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface PropertyOption<V extends string = string> {
  value: V
  label: string
  icon?: ReactNode
  disabled?: boolean
  /** Por que está desabilitada (aparece na linha). */
  hint?: string
}

export interface PropertyPickerProps<V extends string = string> {
  /** Nome da propriedade ("Status"): nome acessível do gatilho e do popup. */
  label: string
  value: V
  options: PropertyOption<V>[]
  onChange: (value: V) => void
  id?: string
  className?: string
  /** Texto do campo de busca (padrão: "Buscar…"). */
  searchPlaceholder?: string
  disabled?: boolean
  'aria-describedby'?: string
}

export function PropertyPicker<V extends string = string>({
  label,
  value,
  options,
  onChange,
  id,
  className,
  searchPlaceholder = 'Buscar…',
  disabled = false,
  'aria-describedby': describedBy,
}: PropertyPickerProps<V>) {
  const selected = options.find((o) => o.value === value) ?? null

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(next) => {
        const option = next as PropertyOption<V> | null
        if (option && !option.disabled && option.value !== value) onChange(option.value)
      }}
      isItemEqualToValue={(a, b) =>
        (a as PropertyOption<V>).value === (b as PropertyOption<V>).value
      }
      itemToStringLabel={(o) => (o as PropertyOption<V>).label}
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        aria-label={`${label}: ${selected?.label ?? 'nenhum'}`}
        aria-describedby={describedBy}
        className={cn(
          'group/picker -ml-2 flex h-8 w-[calc(100%+0.5rem)] min-w-0 items-center gap-2 rounded-md px-2 text-left text-body text-text-primary',
          'outline-hidden transition-colors hover:bg-surface-raised data-popup-open:bg-surface-raised',
          'focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        {selected?.icon ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">{selected.icon}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/picker:opacity-100 group-focus-visible/picker:opacity-100 group-data-popup-open/picker:opacity-100"
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-110 outline-hidden"
          data-floating-layer=""
        >
          <Combobox.Popup
            aria-label={label}
            className="w-64 max-w-[var(--available-width)] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg outline-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border px-2.5">
              <Search aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <Combobox.Input
                aria-label={`Buscar ${label.toLowerCase()}`}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-body text-text-primary outline-hidden placeholder:text-text-tertiary"
              />
            </div>
            <Combobox.Empty>
              <p className="px-3 py-3 text-caption text-text-tertiary">Nada encontrado.</p>
            </Combobox.Empty>
            <Combobox.List className="max-h-72 overflow-auto p-1 empty:p-0">
              {(option: PropertyOption<V>) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className={cn(
                    'grid cursor-default grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-md px-2 py-1.5 text-body text-text-primary outline-hidden select-none',
                    'data-highlighted:bg-surface-overlay data-disabled:cursor-not-allowed data-disabled:opacity-50',
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center">{option.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="block truncate text-micro text-text-tertiary">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                  <Combobox.ItemIndicator>
                    <Check aria-hidden className="h-3.5 w-3.5 text-accent" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
