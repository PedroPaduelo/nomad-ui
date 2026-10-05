import { Skeleton } from './Skeleton'

/** Linha de tabela em skeleton */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4" style={{ padding: '12px 0' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={`${i === 0 ? 'w-[40%]' : 'w-[20%]'} h-4`} />
      ))}
    </div>
  )
}

/** Tabela inteira em skeleton */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col">
      <TableRowSkeleton columns={columns} />
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

/** Card em skeleton para grids */
export function CardSkeleton() {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-[120px]" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[90%]" />
        <Skeleton className="h-3.5 w-[60%]" />
      </div>
    </div>
  )
}

/** Grid de cards em skeleton */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
