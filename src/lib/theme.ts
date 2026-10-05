import type { ResolvedTheme } from '../hooks/useResolvedTheme'

/**
 * Dono único do tema no `<html>`.
 *
 * É o ÚNICO lugar do app que escreve a classe de tema em
 * `document.documentElement`. O `ThemeProvider` (montado em `main.tsx`) chama
 * esta função; ninguém mais muta a classe por conta própria. Antes havia quatro
 * donos, e o leitor de knowledge conseguia deixar o app inteiro claro ao ser
 * fechado. A exceção é o script bloqueante do `index.html`, que escreve a
 * mesma classe e o mesmo `color-scheme` antes de o bundle carregar
 * (lib/themeBoot).
 */
export function applyResolvedThemeToDOM(mode: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(mode)
  root.style.colorScheme = mode
}
