// Entrada principal do @nomad/ui: o kit (components/ui do agent-package) e o
// tema (paletas, store, providers, hooks e seletor de aparência).
//
// Outras entradas: `@nomad/ui/theme.css` (tema Tailwind 4), `@nomad/ui/markdown`
// (Markdown, com react-markdown como peer opcional), `@nomad/ui/theme-boot`
// (script sem flash, sem React), `@nomad/ui/topbar` e `@nomad/ui/data`.

// ── Kit ──
export * from './components/ui'

// ── Tema ──
export { ThemeProvider, ThemeContext } from './theme/ThemeProvider'
export type { ThemeContextValue, ThemeMode, ThemeProviderProps } from './theme/ThemeProvider'
export { PaletteProvider } from './theme/PaletteProvider'
export {
  useThemeStore,
  configureThemeStorage,
  getThemeStorage,
  DEFAULT_THEME,
  DEFAULT_PALETTE,
} from './theme/store'
export type { Theme, ThemeState, ThemeActions } from './theme/store'
export {
  PALETTES,
  DEFAULT_STATUS,
  applyPalette,
  getPaletteById,
  paletteCssVars,
} from './theme/palettes'
export type { Palette, PaletteColors, PaletteId, PaletteStatusColors } from './theme/palettes'
export {
  DEFAULT_THEME_STORAGE_KEY,
  DEFAULT_PALETTE_BOOT_STORAGE_KEY,
  paletteBootSnapshot,
  rememberPaletteForBoot,
  themeBootScript,
  themeBootCspHash,
  themeBootPlugin,
} from './lib/themeBoot'
export type { PaletteBootSnapshot, ThemeStorageOptions, ThemeBootVitePlugin } from './lib/themeBoot'
export { applyResolvedThemeToDOM } from './lib/theme'

// ── Hooks ──
export { useTheme, useThemeMode, useThemeToggle } from './hooks/useTheme'
export {
  useResolvedTheme,
  resolveTheme,
  systemPrefersDark,
  subscribeSystemTheme,
} from './hooks/useResolvedTheme'
export type { ResolvedTheme } from './hooks/useResolvedTheme'
export { usePaletteVars } from './hooks/usePaletteVars'
export { useMediaQuery } from './hooks/useMediaQuery'
export { useFocusTrap } from './hooks/useFocusTrap'

// ── Utilitários ──
export { cn } from './lib/utils'
export {
  uniqueId,
  announce,
  getFocusableElements,
  focusFirstElement,
  restoreFocus,
} from './lib/accessibility'
