// ── Table — tabela de dados com os tokens do kit ─────────────────────────
//
// Lacuna do kit (README: "Table/DataTable → TBD"), criada na UI-STD-03.
// Marcação semântica de verdade (<table>/<thead>/<th scope>) em vez de grid
// de <div>: leitor de tela anuncia linha/coluna, e o cabeçalho ordenável
// expõe `aria-sort` no <th> com um <button> dentro (padrão APG *Sortable
// Table*).
//
//   <Table aria-label="URL configs">
//     <TableHeader>
//       <TableRow>
//         <TableHeaderCell sort={{ active, direction, onSort }}>Config</TableHeaderCell>
//         <TableHeaderCell align="end">Tokens</TableHeaderCell>
//       </TableRow>
//     </TableHeader>
//     <TableBody>
//       <TableRow tone="selected">…<TableCell align="end">…</TableCell></TableRow>
//     </TableBody>
//   </Table>
//
// Visual igual ao das tabelas do agent-package (AgentKeysTable): moldura
// `rounded-lg border`, cabeçalho `bg-surface-raised text-caption
// text-text-tertiary`, linhas separadas por `border-b`. A tabela ocupa a
// largura toda do container e rola na horizontal dentro dele quando não cabe
// (390 px). Cor só por token.

import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

type Density = 'compact' | 'comfortable'
const DensityContext = createContext<Density>('compact')

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** `compact` (padrão, listas densas/logs) ou `comfortable`. */
  density?: Density
  /** Moldura `rounded-lg border` (padrão). `false` quando já está num Card. */
  bordered?: boolean
  /** Legenda só para leitor de tela (`<caption class="sr-only">`). */
  caption?: string
  /** Classe do wrapper que rola na horizontal. */
  wrapperClassName?: string
  children: ReactNode
}

export function Table({
  density = 'compact',
  bordered = true,
  caption,
  wrapperClassName,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <DensityContext.Provider value={density}>
      <div
        data-slot="table"
        className={cn(
          // `relative`: os `sr-only` (position: absolute) do cabeçalho ficam
          // presos à rolagem do wrapper em vez de alargar a página (UI-STD-07).
          'relative w-full min-w-0 overflow-x-auto',
          bordered ? 'rounded-lg border border-border' : undefined,
          wrapperClassName,
        )}
      >
        <table className={cn('w-full border-collapse text-left text-body text-text-primary', className)} {...props}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {children}
        </table>
      </div>
    </DensityContext.Provider>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b border-border bg-surface-raised text-caption text-text-tertiary', className)}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-b-0', className)} {...props} />
}

export type TableRowTone = 'default' | 'selected' | 'highlight' | 'danger'

export const tableRowVariants = cva('transition-colors duration-(--transition-fast)', {
  variants: {
    tone: {
      default: '',
      // Superfície com contraste AA para todos os tokens de texto. O estado
      // fica na faixa lateral; tingir a linha inteira reduzia o contraste.
      selected: 'bg-surface-overlay shadow-[inset_2px_0_0_var(--color-accent)]',
      highlight: 'bg-surface-overlay shadow-[inset_2px_0_0_var(--color-info)]',
      danger: 'bg-surface-overlay shadow-[inset_2px_0_0_var(--color-error)]',
    },
    interactive: {
      true:
        'cursor-pointer hover:bg-surface-overlay outline-hidden ' +
        'focus-visible:bg-surface-overlay focus-visible:shadow-[inset_2px_0_0_var(--color-accent)]',
      false: '',
    },
  },
  defaultVariants: { tone: 'default', interactive: false },
})

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  tone?: TableRowTone
  /** Linha clicável (hover e foco visível). O `onClick`/teclado é de quem usa. */
  interactive?: boolean
}

export function TableRow({ tone = 'default', interactive = false, className, ...props }: TableRowProps) {
  return (
    <tr
      data-tone={tone === 'default' ? undefined : tone}
      className={cn(tableRowVariants({ tone, interactive }), className)}
      {...props}
    />
  )
}

type Align = 'start' | 'center' | 'end'
const ALIGN: Record<Align, string> = { start: 'text-left', center: 'text-center', end: 'text-right' }
const JUSTIFY: Record<Align, string> = { start: 'justify-start', center: 'justify-center', end: 'justify-end' }
const CELL_PADDING: Record<Density, string> = { compact: 'px-3 py-2.5', comfortable: 'px-4 py-3' }
const HEAD_PADDING: Record<Density, string> = { compact: 'px-3 py-2', comfortable: 'px-4 py-2.5' }

export interface TableSort {
  active: boolean
  direction: 'asc' | 'desc'
  onSort: () => void
}

export interface TableHeaderCellProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: Align
  /** Largura fixa da coluna (CSS). */
  width?: string | number
  /** Torna a coluna ordenável: botão no cabeçalho + `aria-sort`. */
  sort?: TableSort
}

export function TableHeaderCell({
  align = 'start',
  width,
  sort,
  className,
  children,
  style,
  ...props
}: TableHeaderCellProps) {
  const density = useContext(DensityContext)
  const ariaSort = sort ? (sort.active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined
  const SortIcon = !sort || !sort.active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(
        HEAD_PADDING[density],
        ALIGN[align],
        'whitespace-nowrap text-caption font-medium text-text-tertiary',
        className,
      )}
      style={width !== undefined ? { width, ...style } : style}
      {...props}
    >
      {sort ? (
        <button
          type="button"
          onClick={sort.onSort}
          className={cn(
            'group/sort inline-flex w-full items-center gap-1 rounded-sm outline-hidden transition-colors',
            'hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent',
            JUSTIFY[align],
            sort.active ? 'text-text-primary' : undefined,
          )}
        >
          {children}
          <SortIcon
            aria-hidden="true"
            className={cn('h-3 w-3 shrink-0', sort.active ? 'opacity-100' : 'opacity-40 group-hover/sort:opacity-80')}
          />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: Align
}

export function TableCell({ align = 'start', className, ...props }: TableCellProps) {
  const density = useContext(DensityContext)
  return <td className={cn(CELL_PADDING[density], ALIGN[align], 'align-middle', className)} {...props} />
}
