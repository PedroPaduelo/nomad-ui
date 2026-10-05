import { type ReactNode, type ComponentType, type CSSProperties } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>
  /**
   * Optional illustration rendered above the icon. When provided, the icon
   * is hidden (the illustration is the visual anchor). Use for full-bleed
   * empty states (e.g. <EmptyProjects size="full" />).
   */
  children?: ReactNode
}

export function EmptyState({ title, description, action, icon: Icon, children }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-linear-to-b from-surface-base to-surface-raised p-8 text-center">
      {children ? (
        children
      ) : Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
          <Icon className="h-6 w-6 text-accent" />
        </div>
      ) : null}
      <div>
        <h3 className="text-subtitle font-semibold text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-md text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
