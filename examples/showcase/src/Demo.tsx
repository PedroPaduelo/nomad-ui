import type { ReactNode } from 'react'
import { Label } from '@nomad/ui'

/** Um exemplo dentro de uma seção: rótulo em caixa alta e a peça numa superfície. */
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
      <Label as="h3">{title}</Label>
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
