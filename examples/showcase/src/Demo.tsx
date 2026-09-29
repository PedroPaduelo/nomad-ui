import type { ReactNode } from 'react'

/** Um exemplo dentro de uma seção: rótulo e a peça numa superfície. */
export function Demo({
  title,
  children,
  className = '',
}: {
  title: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-body font-semibold text-text-primary">{title}</h3>
      <div
        className={
          'flex min-w-0 items-start gap-3 rounded-lg border border-border bg-surface-base p-4 ' +
          className
        }
      >
        {children}
      </div>
    </div>
  )
}

/** Grade responsiva de exemplos (ocupa a largura toda). */
export function DemoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">{children}</div>
}
