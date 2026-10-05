import { forwardRef, type InputHTMLAttributes, useCallback } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, onSearch, onChange, value, ...props },
  ref,
) {
  const handleClear = useCallback(() => {
    if (onSearch) {
      onSearch('')
    } else if (onChange) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
    }
  }, [onSearch, onChange])

  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
      <input
        ref={ref}
        className={
          'peer w-full rounded-lg border border-border bg-surface-base py-2 pl-10 pr-10 text-sm text-text-primary transition-colors focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent ' +
          (className ?? '')
        }
        value={value}
        onChange={onChange}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary transition-colors duration-150 hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
})
