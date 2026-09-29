import { Fragment } from 'react'
import { cn } from '../../lib/utils'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/** Desfaz o escape do servidor (`&#38;`, `&amp;`…) sem interpretar HTML. */
function unescapeHtml(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] !== '#') return ENTITIES[body.toLowerCase()] ?? entity
    const code =
      body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : entity
  })
}

export interface SnippetSegment {
  text: string
  highlighted: boolean
}

/**
 * Quebra o snippet da busca global (HTML escapado, termos em `<mark>`) em
 * trechos de texto puro. Nada vira HTML: o texto é renderizado pelo React.
 */
export function parseSnippet(snippet: string): SnippetSegment[] {
  const segments: SnippetSegment[] = []
  const pattern = /<mark>([\s\S]*?)<\/mark>/g
  let last = 0
  for (let match = pattern.exec(snippet); match; match = pattern.exec(snippet)) {
    if (match.index > last)
      segments.push({ text: unescapeHtml(snippet.slice(last, match.index)), highlighted: false })
    segments.push({ text: unescapeHtml(match[1]), highlighted: true })
    last = match.index + match[0].length
  }
  if (last < snippet.length)
    segments.push({ text: unescapeHtml(snippet.slice(last)), highlighted: false })
  return segments
}

export interface SearchSnippetProps {
  snippet: string
  className?: string
}

/** Trecho de um resultado da busca com os termos destacados. */
export function SearchSnippet({ snippet, className }: SearchSnippetProps) {
  return (
    <p className={cn('line-clamp-2 text-caption text-text-tertiary', className)}>
      {parseSnippet(snippet).map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className="rounded-sm bg-accent-muted px-0.5 text-text-primary">
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </p>
  )
}
