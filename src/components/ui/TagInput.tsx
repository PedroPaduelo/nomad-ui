// ── TagInput — campo de tags com chips e sugestões ───────────
//
// Componente único de tags do app (antes havia o TagInput do kit, usado no
// editor de skill, e o TagsField + useFormTags dos forms de memória, tarefa
// e MCP; FA-11). Controlado: o form dono guarda o `string[]` e recebe a
// lista nova em `onChange`; o texto em digitação fica aqui dentro.
//
// Regras:
//  - Enter e vírgula confirmam; o texto é dividido por vírgula, aparado e
//    deduplicado (e passado para minúsculas, salvo `preserveCase`)
//  - blur confirma o que estiver digitado (não perde texto)
//  - Backspace com o campo vazio remove a última tag
//  - `suggestions` aparecem como chips "Sugestões:" (as já usadas somem)
//
// Foco e borda seguem a convenção do kit (halo de 3px em accent-muted).

import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  /** Pool de sugestões; as já usadas são filtradas. */
  suggestions?: string[]
  /** Quantas sugestões exibir. */
  maxSuggestions?: number
  /** Mantém maiúsculas/minúsculas do que foi digitado (padrão: minúsculas). */
  preserveCase?: boolean
  id?: string
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  maxSuggestions = 6,
  preserveCase = false,
  id,
  placeholder = 'Digite e aperte Enter…',
  disabled = false,
  'aria-label': ariaLabel,
}: TagInputProps) {
  const [text, setText] = useState('')

  const add = (incoming: string[]) => {
    const next = Array.from(new Set([...value, ...incoming]))
    if (next.length !== value.length) onChange(next)
  }

  const commit = () => {
    const typed = text
      .split(',')
      .map((t) => (preserveCase ? t.trim() : t.trim().toLowerCase()))
      .filter(Boolean)
    setText('')
    if (typed.length > 0) add(typed)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const available = suggestions.filter((s) => !value.includes(s)).slice(0, maxSuggestions)

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-base p-2
                   transition-[border-color,box-shadow]
                   focus-within:border-border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-muted)]"
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-accent-muted px-2 py-0.5 text-caption font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              disabled={disabled}
              className="rounded p-0.5 hover:bg-accent/20"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="min-w-[120px] flex-1 bg-transparent text-body text-text-primary outline-hidden placeholder:text-text-tertiary"
        />
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-micro uppercase text-text-tertiary">Sugestões:</span>
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add([s])}
              disabled={disabled}
              aria-label={`Adicionar tag ${s}`}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-micro text-text-tertiary transition-colors hover:border-accent hover:text-accent"
            >
              <Plus className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
