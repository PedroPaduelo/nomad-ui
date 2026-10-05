import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from '../theme/ThemeProvider'

/**
 * Hook principal para acessar e controlar o tema (light/dark mode).
 *
 * Retorna do ThemeProvider:
 * - `mode` — modo efetivo resolvido ('light' | 'dark')
 * - `rawTheme` — valor raw do store ('light' | 'dark' | 'system')
 * - `setTheme(theme)` — define ('light', 'dark' ou 'system')
 * - `toggleMode()` — alterna light ↔ dark
 * - `prefersReducedMotion` — respeita SO
 *
 * @example
 *   function ThemeButton() {
 *     const { mode, toggleMode } = useTheme();
 *     return (
 *       <button onClick={toggleMode}>
 *         {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
 *       </button>
 *     );
 *   }
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error(
      'useTheme() must be used within a <ThemeProvider>. ' +
        'Adicione o ThemeProvider na árvore de componentes.',
    )
  }

  return context
}

/**
 * Hook de conveniência: retorna só o modo efetivo (sem controls).
 */
export function useThemeMode(): ThemeContextValue['mode'] {
  const { mode } = useTheme()
  return mode
}

/**
 * Hook de conveniência: retorna só o toggle.
 */
export function useThemeToggle(): () => void {
  const { toggleMode } = useTheme()
  return toggleMode
}
