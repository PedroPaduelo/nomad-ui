// ── useResolvedTheme — tema efetivo do app (dark | light) ───────────────
//
// FONTE DA VERDADE ÚNICA da resolução de tema do AgentPack.
//
// A UI store guarda 'light' | 'dark' | 'system'. Todo consumidor que precisa
// saber "o app está claro ou escuro agora?" — chrome, ThemeSwitcher, leitor,
// iframe de knowledge — passa por aqui. Ninguém mais deve chamar
// `window.matchMedia` para tema: sete resoluções paralelas produziam estado
// divergente (app claro com o ThemeSwitcher exibindo a lua).

import { useEffect, useState } from 'react'
import { useThemeStore, type Theme } from '../theme/store'

export type ResolvedTheme = 'dark' | 'light'

// AgentPack é dark-first: `:root` define os tokens escuros e `html.light` é o
// override; `html { color-scheme: dark }`. Portanto 'system' só vira claro
// quando o SO pede claro EXPLICITAMENTE — "sem preferência" continua escuro.
// Consultar `(prefers-color-scheme: dark)` inverteria isso e deixaria o app
// claro com o ThemeSwitcher exibindo a lua (estados divergentes).
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return !window.matchMedia('(prefers-color-scheme: light)').matches
}

/**
 * Resolve um `Theme` bruto do store para o modo efetivo, sem hooks.
 * Use em código imperativo (efeitos, listeners). Em render, use o hook.
 */
export function resolveTheme(theme: Theme, prefersDark = systemPrefersDark()): ResolvedTheme {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  return prefersDark ? 'dark' : 'light'
}

/** Assina mudanças de preferência do SO. Devolve o unsubscribe. */
export function subscribeSystemTheme(cb: (prefersDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = (e: MediaQueryListEvent) => cb(!e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

export function useResolvedTheme(): ResolvedTheme {
  const theme = useThemeStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark())

  useEffect(() => {
    if (theme !== 'system') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- relê o SO ao entrar em system; o resto chega pelo listener
    setSystemDark(systemPrefersDark())
    return subscribeSystemTheme(setSystemDark)
  }, [theme])

  return resolveTheme(theme, systemDark)
}
