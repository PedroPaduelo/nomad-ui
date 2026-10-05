import type { ThemeStorageOptions } from '@nomad/ui/theme-boot'

/** Chaves do localStorage da vitrine: as mesmas no ThemeProvider e no script de boot. */
export const SHOWCASE_STORAGE = {
  storageKey: 'nomad-showcase:ui-preferences',
  paletteStorageKey: 'nomad-showcase:palette-vars',
} satisfies ThemeStorageOptions
