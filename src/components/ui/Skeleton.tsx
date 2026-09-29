interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Forma do placeholder. `text` arredonda menos e combina com linhas de
   * texto; `rect` (padrao) usa o raio md; `circle` vira um circulo.
   */
  variant?: 'text' | 'rect' | 'circle'
}

const SKELETON_RADIUS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'rounded',
  rect: 'rounded-md',
  circle: 'rounded-full',
}

export function Skeleton({ className, style, variant = 'rect', ...props }: SkeletonProps) {
  // A cor default fica em `style` só quando o consumidor não passa uma classe
  // `bg-*`; assim `<Skeleton className="bg-surface-raised" />` funciona sem ser
  // sobrescrito pelo inline style.
  const hasCustomBg = /(^|\s)bg-/.test(className ?? '')

  return (
    <div
      className={'animate-pulse ' + SKELETON_RADIUS[variant] + ' ' + (className ?? '')}
      style={hasCustomBg ? style : { backgroundColor: 'var(--color-border)', ...style }}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={'space-y-1.5 ' + (className ?? '')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={'h-3 ' + (i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
