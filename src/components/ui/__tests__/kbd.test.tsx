/**
 * Kbd: fonte de texto quando o conteúdo é símbolo Unicode (⌘, ⇧, ⌥, ↻) — a fonte
 * de mono do tema não tem o glifo e o navegador desenha a caixa vazia (▯).
 * Gap reportado pela [MOTOR] UI-FIX-MIG03 `cd8ec6e4` (PKG-FIXES 679ca2d8).
 */
import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { Header, Kbd } from '../index'

describe('Kbd', () => {
  it('mono por padrão (letra de tecla: Esc, F2, "K")', () => {
    render(<Kbd>Esc</Kbd>)
    const kbd = screen.getByText('Esc')
    expect(kbd.tagName).toBe('KBD')
    expect(kbd).toHaveClass('font-mono')
    expect(kbd).not.toHaveClass('font-sans')
    expect(kbd).not.toHaveAttribute('data-kbd-symbol')
  })

  it('symbol: fonte de texto + data-kbd-symbol (a regra base kbd{font-family:mono} perde para o seletor de atributo)', () => {
    render(<Kbd symbol>⌘K</Kbd>)
    const kbd = screen.getByText('⌘K')
    expect(kbd).toHaveClass('font-sans')
    expect(kbd).not.toHaveClass('font-mono')
    expect(kbd).toHaveAttribute('data-kbd-symbol')
  })

  it('cada símbolo modificador isolado também sai do mono', () => {
    for (const glyph of ['⌘', '⇧', '⌥', '⌃', '↻', '⏎', '⌫']) {
      const { unmount } = render(<Kbd symbol>{glyph}</Kbd>)
      expect(screen.getByText(glyph)).toHaveAttribute('data-kbd-symbol')
      unmount()
    }
  })

  it('mono?: nunca reverte symbol', () => {
    render(
      <Kbd symbol mono>
        ⌘K
      </Kbd>,
    )
    const kbd = screen.getByText('⌘K')
    expect(kbd).toHaveClass('font-mono')
    expect(kbd).not.toHaveAttribute('data-kbd-symbol')
  })

  it('mono sem symbol é igual ao padrão', () => {
    render(<Kbd mono>⌘K</Kbd>)
    expect(screen.getByText('⌘K')).toHaveClass('font-mono')
  })

  it('className do app continua entrando por último', () => {
    render(
      <Kbd symbol className="text-text-primary">
        ⌥
      </Kbd>,
    )
    expect(screen.getByText('⌥')).toHaveClass('text-text-primary', 'font-sans')
  })

  it('o Header do pacote usa Kbd symbol no atalho (não um kbd cru com mono)', () => {
    render(<Header commandShortcutLabel="⌘K" onOpenCommandPalette={() => {}} />)
    const kbd = screen.getByText('⌘K')
    expect(kbd.tagName).toBe('KBD')
    expect(kbd).toHaveAttribute('data-kbd-symbol')
  })

  it('axe sem violações', async () => {
    render(
      <div className="flex items-center gap-2">
        <Kbd>Esc</Kbd>
        <Kbd symbol>⌘</Kbd>
        <Kbd symbol>K</Kbd>
        <Kbd symbol>↻</Kbd>
      </div>,
    )
    const r = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    })
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([])
  })
})
