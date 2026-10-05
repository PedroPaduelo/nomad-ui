// ── PaletteProvider — applies the active palette CSS variables ──────────
//
// Listens to the theme store palette + theme state and calls applyPalette()
// on every change. This replaces the hardcoded CSS tokens in globals.css
// at runtime, making all colors fully componentized and switchable.
// It also saves the palette snapshot that the blocking script in
// index.html applies on the next load, before the bundle (lib/themeBoot).
//
// Must be rendered INSIDE the ThemeProvider (which handles <html> class
// toggling for light/dark). This provider handles the CSS variable
// values.

import { useEffect, useLayoutEffect } from 'react'
import { getThemeStorage, useThemeStore } from './store'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { getPaletteById, applyPalette } from './palettes'
import { rememberPaletteForBoot } from '../lib/themeBoot'

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const paletteId = useThemeStore((s) => s.palette)
  // Fonte única do modo efetivo. Resolver 'system' aqui dentro (matchMedia
  // lido uma vez no effect) deixava o app preso no modo inicial: trocar
  // o tema do SO com 'system' ativo não re-injetava as vars. O hook assina
  // o matchMedia e re-renderiza, então o effect abaixo roda de novo.
  const mode = useResolvedTheme()

  // useLayoutEffect: a troca de paleta ou de tema na sessão já pinta com as
  // vars novas. O primeiro paint de um F5 é do script do index.html, que
  // aplica o retrato gravado abaixo.
  useLayoutEffect(() => {
    applyPalette(getPaletteById(paletteId), mode)
  }, [paletteId, mode])

  // O retrato tem os dois modos: só precisa ser regravado quando a paleta
  // muda (e a cada carga, para refletir paletas alteradas num deploy).
  useEffect(() => {
    rememberPaletteForBoot(getPaletteById(paletteId), getThemeStorage().paletteStorageKey)
  }, [paletteId])

  return <>{children}</>
}
