import { type ReactNode } from 'react'

// ── Avatar — iniciais/ícone em bloco ──────────────────────────
// Spec 02 §11: quadrado radius 6–8 (círculo opcional), tamanhos
// 24/26/28/32, fundo sólido accent OU accent-muted, iniciais 700.

export interface AvatarProps {
  children: ReactNode
  size?: 24 | 26 | 28 | 32
  shape?: 'rounded' | 'circle'
  /** solid = accent forte + on-accent; muted = accent-muted + accent. */
  tone?: 'solid' | 'muted'
  className?: string
}

export function Avatar({
  children,
  size = 32,
  shape = 'rounded',
  tone = 'muted',
  className = '',
}: AvatarProps) {
  const borderRadius = shape === 'circle' ? '9999px' : size <= 26 ? '7px' : '8px'
  const backgroundColor = tone === 'solid' ? 'var(--color-accent)' : 'var(--color-accent-muted)'
  const color = tone === 'solid' ? 'var(--color-text-on-accent)' : 'var(--color-text-accent)'

  return (
    <span
      aria-hidden
      className={'inline-grid shrink-0 place-items-center font-bold ' + className}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor,
        color,
        fontSize: size <= 26 ? 12 : 13,
      }}
    >
      {children}
    </span>
  )
}
