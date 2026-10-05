// ── CodeBlock — bloco de código/JSON com copiar ──────────────────────────
//
// Lacuna do kit (README: "CodeBlock → TBD"), criada na UI-STD-03 para os
// payloads do log de requests. <pre> rolável com botão de copiar e realce
// leve de JSON feito com <span> (sem innerHTML, sem dependência): chave em
// `text-accent`, string em `status-success`, número em `status-info`,
// true/false/null em `amber`. Cores só por token.

import { useMemo, type ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { cn } from '../../lib/utils'
import { IconButton } from './Button'

export interface CodeBlockProps {
  code: string
  /** `json` liga o realce; `text` mostra como está. */
  language?: 'json' | 'text'
  /** Nome acessível do bloco (região). */
  'aria-label': string
  /** Quebra as linhas longas (padrão) ou rola na horizontal. */
  wrap?: boolean
  /** Altura máxima antes de rolar (CSS). */
  maxHeight?: string
  /** Mostra o botão de copiar (padrão: sim). */
  copyable?: boolean
  /** Chamado depois de copiar com sucesso (ex.: toast). */
  onCopy?: () => void
  onCopyError?: () => void
  copyLabel?: string
  className?: string
}

const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g

/** Realce de JSON em nós React (seguro: o texto nunca vira HTML). */
export function highlightJson(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of code.matchAll(JSON_TOKEN)) {
    const start = m.index ?? 0
    if (start > last) out.push(code.slice(last, start))
    const [whole, str, colon, literal] = m
    if (str !== undefined && colon !== undefined) {
      out.push(
        <span key={i++} className="text-text-accent">
          {str}
        </span>,
        colon,
      )
    } else if (str !== undefined) {
      out.push(
        <span key={i++} className="text-status-success">
          {str}
        </span>,
      )
    } else if (literal !== undefined) {
      out.push(
        <span key={i++} className="text-amber">
          {whole}
        </span>,
      )
    } else {
      out.push(
        <span key={i++} className="text-status-info">
          {whole}
        </span>,
      )
    }
    last = start + whole.length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

export function CodeBlock({
  code,
  language = 'text',
  'aria-label': ariaLabel,
  wrap = true,
  maxHeight = '480px',
  copyable = true,
  onCopy,
  onCopyError,
  copyLabel,
  className,
}: CodeBlockProps) {
  const content = useMemo(() => (language === 'json' ? highlightJson(code) : code), [code, language])
  const copy = () => {
    const p = navigator.clipboard?.writeText(code)
    if (!p) return onCopyError?.()
    p.then(
      () => onCopy?.(),
      () => onCopyError?.(),
    )
  }
  return (
    <div data-slot="code-block" className={cn('group/code relative w-full min-w-0', className)}>
      <pre
        role="region"
        aria-label={ariaLabel}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável precisa de foco (axe scrollable-region-focusable, WCAG 2.1.1)
        tabIndex={0}
        style={{ maxHeight }}
        className={cn(
          'overflow-auto rounded-md border border-border bg-(--surface-code) px-4 py-3 font-mono text-caption leading-relaxed text-text-primary outline-hidden',
          'focus-visible:ring-2 focus-visible:ring-accent',
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
          copyable ? 'pr-11' : undefined,
        )}
      >
        <code>{content}</code>
      </pre>
      {copyable ? (
        <IconButton
          variant="secondary"
          size="sm"
          aria-label={copyLabel ? `Copiar ${copyLabel}` : 'Copiar'}
          title={copyLabel ? `Copiar ${copyLabel}` : 'Copiar'}
          onClick={copy}
          className="absolute right-2 top-2 opacity-80 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        >
          <Copy />
        </IconButton>
      ) : null}
    </div>
  )
}
