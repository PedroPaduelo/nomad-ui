import { Badge } from './Badge'

export interface FilterChip {
  key: string
  label: string
  count?: number
}

interface FilterChipsProps {
  filters: FilterChip[]
  activeKeys: string[]
  onToggle: (key: string) => void
}

export function FilterChips({ filters, activeKeys, onToggle }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = activeKeys.includes(filter.key)
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onToggle(filter.key)}
            aria-pressed={isActive}
            className="cursor-pointer rounded-full transition-transform active:scale-95"
          >
            <Badge variant={isActive ? 'accent' : 'neutral'}>
              {filter.count !== undefined ? `${filter.label} (${filter.count})` : filter.label}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
