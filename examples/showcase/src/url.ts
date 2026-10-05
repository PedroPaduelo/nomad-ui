import type { PaletteId, Theme } from '@nomad/ui'
import { PALETTES } from '@nomad/ui'

/**
 * Parâmetros da URL (para link direto, captura e o harness de comparação):
 * `?palette=<id>&theme=light|dark|system&section=<id>&bare=1`.
 */
export interface ShowcaseParams {
  palette?: PaletteId
  theme?: Theme
  section?: string
  /** Sem cabeçalho nem menu: só a(s) seção(ões). */
  bare: boolean
}

export function readParams(search = window.location.search): ShowcaseParams {
  const q = new URLSearchParams(search)
  const palette = q.get('palette')
  const theme = q.get('theme')
  return {
    palette: PALETTES.some((p) => p.id === palette) ? (palette as PaletteId) : undefined,
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : undefined,
    section: q.get('section') ?? undefined,
    bare: q.get('bare') === '1',
  }
}
