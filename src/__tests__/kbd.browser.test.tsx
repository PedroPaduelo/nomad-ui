/**
 * Kbd com símbolo Unicode (⌘, ⇧, ⌥, ↻) — Chromium com o globals.css do pacote
 * (PKG-FIXES 679ca2d8, reportado pela [MOTOR] UI-FIX-MIG03): a fonte computada
 * do `kbd[data-kbd-symbol]` não pode ser a de mono (que não tem o glifo e
 * desenha a caixa vazia ▯), e o contraste da cápsula passa no axe em todas as
 * paletas × claro/escuro.
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '../index'
import { PALETTES } from '../theme/palettes'
import { Kbd } from '../components/ui/Kbd'
import '../theme/globals.css'

function Setup({
  paletteId,
  mode,
  children,
}: {
  paletteId: string
  mode: 'light' | 'dark'
  children: React.ReactNode
}) {
  useEffect(() => {
    useThemeStore.setState({ palette: paletteId as never, theme: mode })
    const pal = PALETTES.find((p) => p.id === paletteId)
    if (pal) applyPalette(pal, mode)
  }, [paletteId, mode])
  return (
    <ThemeProvider storageKey="kbd-a11y:ui-preferences" paletteStorageKey="kbd-a11y:palette-vars">
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

function Keys() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <Kbd>Esc</Kbd>
      <Kbd>F2</Kbd>
      <Kbd symbol>⌘</Kbd>
      <Kbd symbol>K</Kbd>
      <Kbd symbol>⇧</Kbd>
      <Kbd symbol>⌥</Kbd>
      <Kbd symbol>↻</Kbd>
    </div>
  )
}

const MONO_VARS = ['JetBrains Mono', 'Fira Code', 'monospace']

describe('Kbd symbol: fonte computada no Chromium + axe por paleta × modo', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`kbd symbol (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Keys />
          </Setup>,
        )
        const symbols = Array.from(container.querySelectorAll<HTMLElement>('kbd[data-kbd-symbol]'))
        expect(symbols.length).toBe(5)
        for (const el of symbols) {
          const family = getComputedStyle(el).fontFamily
          expect(
            MONO_VARS.some((f) => family.includes(f)),
            `${p.id} ${mode}: ${el.textContent} saiu como ${family}`,
          ).toBe(false)
        }
        // kbd sem symbol continua mono
        const letter = container.querySelector<HTMLElement>('kbd:not([data-kbd-symbol])')
        expect(getComputedStyle(letter!).fontFamily).toContain('JetBrains Mono')
        const r = await axe.run(container, {
          rules: { 'color-contrast': { enabled: true }, region: { enabled: false } },
        })
        unmount()
        const problems = r.violations.flatMap((v) =>
          v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`),
        )
        expect(problems, `${p.id} ${mode}: ${problems.join('; ')}`).toEqual([])
      })
    }
  }
})
