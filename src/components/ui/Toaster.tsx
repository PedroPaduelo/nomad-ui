import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner'

import { useResolvedTheme } from '../../hooks/useResolvedTheme'

type Tone = 'success' | 'error' | 'warning' | 'info'

/**
 * Cores do toast por estado: fundo do tom a 12% misturado com a superfície
 * elevada (não fica transparente sobre o conteúdo), borda do tom a 30% e texto
 * na cor cheia do tom. Mesma fórmula do Sonner + tokens da paleta ativa.
 */
function tone(t: Tone): Record<string, string> {
  return {
    [`--${t}-bg`]: `color-mix(in srgb, var(--color-${t}) 12%, var(--surface-raised))`,
    [`--${t}-border`]: `color-mix(in srgb, var(--color-${t}) 30%, transparent)`,
    [`--${t}-text`]: `var(--color-${t})`,
  }
}

/** Variáveis do Sonner apontadas para os tokens da paleta ativa. */
const paletteVars = {
  '--normal-bg': 'var(--surface-raised)',
  '--normal-border': 'var(--color-border)',
  '--normal-text': 'var(--color-text-primary)',
  '--border-radius': 'var(--radius-control)',
  ...tone('success'),
  ...tone('error'),
  ...tone('warning'),
  ...tone('info'),
} as CSSProperties

/**
 * `Toaster` global do `@nomad/ui` (wrapper Sonner 2.x com os tokens do tema).
 *
 * Monte uma vez, no topo da app (ex.: `QueryProvider`/`App`). Os toasts saem
 * de `useToast()`. Tema e posição vêm do seletor de aparência — o `Toaster`
 * lê o `useResolvedTheme()` automaticamente, sem precisar passar `theme` por
 * prop.
 *
 * ```tsx
 * <QueryProvider>
 *   <App />
 *   <Toaster />
 * </QueryProvider>
 * ```
 */
export function Toaster({
  position = 'bottom-right',
  offset,
}: {
  /** Posição do toast (Sonner). Padrão: `bottom-right`. */
  position?: ToasterProps['position']
  /** Offset CSS (top/right/bottom/left) — útil quando há algo no canto. */
  offset?: string
}) {
  const theme = useResolvedTheme()
  return (
    <SonnerToaster
      theme={theme}
      position={position}
      richColors
      closeButton
      offset={offset}
      style={paletteVars}
      toastOptions={{
        style: { fontFamily: 'var(--font-body)', fontSize: '0.875rem' },
      }}
    />
  )
}

export type { Tone }