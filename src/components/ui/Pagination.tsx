// ── Pagination — paginação de lista/tabela ───────────────────────────────
//
// Lacuna do kit (README: "Pagination → TBD"), criada na UI-STD-03. Mostra a
// faixa ("26–50 de 1.234") e Anterior/Próxima; a página é de quem usa
// (server-side ou client-side). `nav` com nome acessível, botões com nome e
// `disabled` nas pontas.

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { IconButton } from './Button'

export interface PaginationProps {
  /** Página atual, começando em 1. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Nome do `nav` (ex.: "Paginação dos requests"). */
  'aria-label'?: string
  /** Formata números (padrão: `toLocaleString('pt-BR')`). */
  formatNumber?: (n: number) => string
  /** Textos (padrão em português brasileiro). */
  labels?: { of?: string; previous?: string; next?: string; page?: string }
  className?: string
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  'aria-label': ariaLabel = 'Paginação',
  formatNumber = (n) => n.toLocaleString('pt-BR'),
  labels,
  className,
}: PaginationProps) {
  const of = labels?.of ?? 'de'
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const current = Math.min(Math.max(1, page), pages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(total, current * pageSize)

  return (
    <nav aria-label={ariaLabel} className={cn('flex items-center justify-end gap-3', className)}>
      <span className="text-caption tabular-nums text-text-secondary" aria-live="polite">
        {formatNumber(from)}–{formatNumber(to)} {of} {formatNumber(total)}
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          variant="secondary"
          size="sm"
          aria-label={labels?.previous ?? 'Página anterior'}
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft />
        </IconButton>
        <span className="min-w-[4.5rem] text-center text-caption tabular-nums text-text-tertiary">
          {labels?.page ?? 'Página'} {current} / {pages}
        </span>
        <IconButton
          variant="secondary"
          size="sm"
          aria-label={labels?.next ?? 'Próxima página'}
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight />
        </IconButton>
      </div>
    </nav>
  )
}
