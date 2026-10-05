// ── HeaderIcon — quadrado de ícone dos cabeçalhos (modal, drawer, seção) ──
//
// Padroniza o bloco "ícone 40px em bg-accent-muted" que estava duplicado em
// 8 modais. Forma = radius de card (12px), tinta = token do tone.
//
// Ver PLANO §3.2 L3 item 1.

import type { CSSProperties, ReactNode } from 'react'

export type HeaderIconSize = 32 | 40
export type HeaderIconTone = 'accent' | 'amber' | 'success' | 'error'

export interface HeaderIconProps {
  children: ReactNode
  /** 40px (default) para modal/drawer; 32px para linha de lista. */
  size?: HeaderIconSize
  /** `accent` = entidade · `amber` = agente · `success`/`error` = estado. */
  tone?: HeaderIconTone
  className?: string
}

/** bg + fg por tone, sempre derivados de tokens (zero hardcode). */
const toneMap: Record<HeaderIconTone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--color-accent-muted)', fg: 'var(--color-text-accent)' },
  amber: { bg: 'var(--color-amber-muted)', fg: 'var(--color-text-amber)' },
  success: {
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    fg: 'var(--color-success)',
  },
  error: {
    bg: 'color-mix(in srgb, var(--color-error) 16%, transparent)',
    fg: 'var(--color-error)',
  },
}

/**
 * Quadrado de ícone para cabeçalhos.
 *
 * @example
 * <HeaderIcon><Sparkles className="h-5 w-5" /></HeaderIcon>
 * <HeaderIcon size={32} tone="amber"><Bot className="h-4 w-4" /></HeaderIcon>
 */
export function HeaderIcon({
  children,
  size = 40,
  tone = 'accent',
  className = '',
}: HeaderIconProps) {
  const t = toneMap[tone]
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: t.bg,
    color: t.fg,
  }

  return (
    <div
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
