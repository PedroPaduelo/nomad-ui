// ── usePaletteVars — resolve the active palette CSS vars (source of truth) ─
//
// Returns a memoized object of `{ '--color-accent': '#2dd4bf', ... }` that
// the HtmlSandbox bakes into the iframe srcDoc (first paint) AND pushes via
// postMessage on change. This keeps the iframe's prose in sync with the
// host's palette (accent, surfaces, text, borders, amber).
//
// IMPORTANT: it derives the values directly from the palette definition
// (getPaletteById + resolved theme) instead of reading `getComputedStyle`
// off :root. Reading the DOM was racy — on first render the CSS vars still
// held the globals.css defaults (slate-blue-gold) because PaletteProvider's
// effect had not run yet, which made the reader flash the wrong palette on
// mount / F5 / navigation. Deriving from the source is correct synchronously.

import { useMemo } from 'react'
import { useThemeStore } from '../theme/store'
import { getPaletteById, DEFAULT_STATUS } from '../theme/palettes'
import { useResolvedTheme } from './useResolvedTheme'

/** Build the `{ '--var': value }` map for a palette + mode. */
function paletteToVars(paletteId: string, mode: 'dark' | 'light'): Record<string, string> {
  const c = getPaletteById(paletteId as never)[mode]
  const fallback = DEFAULT_STATUS[mode]
  return {
    // Surfaces
    '--surface-body': c.surfaces.body,
    '--surface-base': c.surfaces.base,
    '--surface-raised': c.surfaces.raised,
    '--surface-overlay': c.surfaces.overlay,
    // Accent
    '--color-accent': c.accent.main,
    '--color-accent-hover': c.accent.hover,
    '--color-accent-muted': c.accent.muted,
    '--color-accent-muted-strong': strongerAlpha(c.accent.muted),
    '--color-accent-strong': c.accent.strong,
    // Amber
    '--color-amber': c.amber.main,
    '--color-amber-hover': c.amber.hover,
    '--color-amber-muted': c.amber.muted,
    '--color-amber-strong': c.amber.strong,
    // Text
    '--color-text-primary': c.text.primary,
    '--color-text-secondary': c.text.secondary,
    '--color-text-tertiary': c.text.tertiary,
    '--color-text-disabled': c.text.disabled,
    '--color-text-accent': c.text.accent,
    '--color-text-inverse': c.text.inverse,
    '--color-text-amber': c.text.amber,
    '--color-text-on-accent': c.text.onAccent,
    '--color-text-on-amber': c.text.onAmber,
    // Borders
    '--color-border': c.borders.default,
    '--color-border-hover': c.borders.hover,
    '--color-border-accent': c.borders.accent,
    // Shadows
    '--shadow-sm': c.shadows.sm,
    '--shadow-md': c.shadows.md,
    '--shadow-lg': c.shadows.lg,
    '--shadow-accent-glow': c.shadows.accentGlow,
    // Backdrop
    '--backdrop-bg': c.backdrop,
    // Status semânticos (PLANO §2.4, L1) — sempre presentes, com fallback,
    // para o iframe (HtmlSandbox) bater com o host mesmo em paleta sem `status`.
    '--color-success': c.status?.success ?? fallback.success,
    '--color-warning': c.status?.warning ?? fallback.warning,
    '--color-error': c.status?.error ?? fallback.error,
    '--color-info': c.status?.info ?? fallback.info,
    '--color-neutral-muted': fallback.neutralMuted,
  }
}

/** Espelha `strongerAlpha` de palettes.ts — o iframe precisa da mesma derivação
 *  para que sublinhado de link e hover sigam a paleta ativa. */
function strongerAlpha(rgba: string, factor = 2.1, max = 0.45): string {
  const m = rgba.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/)
  if (!m) return rgba
  const a = Math.min(max, Number(m[4]) * factor)
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`
}

export function usePaletteVars(): Record<string, string> {
  const paletteId = useThemeStore((s) => s.palette)
  const mode = useResolvedTheme()

  return useMemo(() => paletteToVars(paletteId, mode), [paletteId, mode])
}
