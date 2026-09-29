import {
  createContext,
  useLayoutEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { configureThemeStorage, useThemeStore, type Theme } from './store'
import type { ThemeStorageOptions } from '../lib/themeBoot'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useResolvedTheme } from '../hooks/useResolvedTheme'
import { applyResolvedThemeToDOM } from '../lib/theme'

export type ThemeMode = Exclude<Theme, 'system'>

export interface ThemeContextValue {
  /** Modo efetivo resolvido ('light' ou 'dark'). Se store='system', resolve via SO. */
  mode: ThemeMode
  /** Modo raw do store (inclui 'system'). */
  rawTheme: Theme
  /** Define tema (aceita 'light', 'dark' ou 'system'). */
  setTheme: (theme: Theme) => void
  /** Alterna entre light e dark (se 'system', vai para 'dark'). */
  toggleMode: () => void
  /** Se o usuário prefere reduced motion. */
  prefersReducedMotion: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Provider de tema do @nomad/ui (o do AgentPack, com as chaves como parâmetro).
 *
 * Integra com o store de tema do pacote (zustand, `theme/store.ts`) e sincroniza a classe CSS no <html>
 * para que as variáveis de tema (light/dark) e o Tailwind darkMode:'class'
 * funcionem corretamente.
 *
 * Fluxo:
 *   uiStore.theme ('system'|'light'|'dark')
 *   → useResolvedTheme() → modo efetivo ('light'|'dark'), dark-first
 *   → applyResolvedThemeToDOM() (dono único) escreve .light/.dark no <html>
 *
 * @example
 *   // no main.tsx (chaves iguais às do themeBootPlugin/themeBootScript):
 *   <ThemeProvider storageKey="meuapp:ui-preferences" paletteStorageKey="meuapp:palette-vars">
 *     <PaletteProvider>
 *       <App />
 *     </PaletteProvider>
 *   </ThemeProvider>
 */
export interface ThemeProviderProps extends ThemeStorageOptions {
  children: ReactNode
  /** Força o modo efetivo, independente do store (ex.: tela sempre clara). */
  defaultMode?: ThemeMode
}

export function ThemeProvider({
  children,
  defaultMode,
  storageKey,
  paletteStorageKey,
}: ThemeProviderProps) {
  // Antes do primeiro render dos filhos: aponta o store para as chaves do app
  // (as mesmas do `themeBootScript`) e lê as preferências salvas. O
  // localStorage é síncrono, então o primeiro render já sai com o tema salvo.
  useState(() => configureThemeStorage({ storageKey, paletteStorageKey }))
  const storeTheme = useThemeStore((s) => s.theme)
  const setStoreTheme = useThemeStore((s) => s.setTheme)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // Resolução do tema vem do hook único (dark-first): 'system' só fica claro
  // se o SO pedir claro explicitamente.
  const resolved = useResolvedTheme()

  const mode = defaultMode ?? resolved

  // Sincroniza <html> classes + color-scheme ANTES do paint (useLayoutEffect)
  // quando o tema muda na sessão. O primeiro paint de um F5 já sai certo
  // pelo script bloqueante do index.html (lib/themeBoot), que resolve o tema
  // do mesmo jeito. A mutação em si mora no dono único
  // (lib/theme.applyResolvedThemeToDOM).
  useLayoutEffect(() => {
    applyResolvedThemeToDOM(mode)
  }, [mode])

  const setTheme = useCallback(
    (t: Theme) => {
      setStoreTheme(t)
    },
    [setStoreTheme],
  )

  const toggleMode = useCallback(() => {
    // Se está em system, pega o resolved atual e alterna
    const next = storeTheme === 'dark' ? 'light' : 'dark'
    setStoreTheme(next)
  }, [storeTheme, setStoreTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, rawTheme: storeTheme, setTheme, toggleMode, prefersReducedMotion }),
    [mode, storeTheme, setTheme, toggleMode, prefersReducedMotion],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
