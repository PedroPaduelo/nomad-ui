// Teclado nativo no Chromium, com os providers e a persistência reais.
// `vitest/browser` usa page.keyboard do Playwright (não eventos DOM sintéticos).
// O controle pode ser listbox/option ou menu/menuitemradio: o contrato é o
// comportamento anunciado, não manter o listbox artesanal da revisão antiga.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher'
import { ThemeProvider } from '../theme/ThemeProvider'
import { PaletteProvider } from '../theme/PaletteProvider'
import { PALETTES } from '../theme/palettes'
import '../theme/theme.css'

let fixtureId = 0
let storageKey: string
let paletteStorageKey: string

function paletteItems(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="option"], [role="menuitemradio"]')]
}

function activeIndex(): number {
  return paletteItems().indexOf(document.activeElement as HTMLElement)
}

function mount(mode: 'light' | 'dark') {
  storageKey = `themeswitcher-browser:${++fixtureId}`
  paletteStorageKey = `${storageKey}:palette-vars`
  localStorage.setItem(
    storageKey,
    JSON.stringify({ state: { theme: mode, palette: PALETTES[0].id }, version: 0 }),
  )
  render(
    <ThemeProvider storageKey={storageKey} paletteStorageKey={paletteStorageKey}>
      <PaletteProvider>
        <main style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: 24 }}>
          <button type="button">Antes do seletor</button>
          <ThemeSwitcher />
          <button type="button">Fora do seletor</button>
        </main>
      </PaletteProvider>
    </ThemeProvider>,
  )
  return screen.getByRole('button', { name: 'Escolher paleta de cores' })
}

async function openWithKeyboard(trigger: HTMLElement) {
  // Ancorar o início com clique nativo; a abertura e toda navegação são teclado.
  await userEvent.click(screen.getByRole('button', { name: 'Antes do seletor' }))
  await userEvent.tab()
  expect(document.activeElement).toBe(trigger)
  await userEvent.keyboard('{Enter}')
  await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true')
  await expect.poll(() => paletteItems().length).toBe(PALETTES.length)
}

async function reachFirstItem() {
  // A revisão antiga mantém o foco no trigger e tem o toggle antes das opções.
  // Uma primitiva de menu move o foco para o primeiro item já na abertura.
  for (let attempts = 0; attempts < PALETTES.length + 3 && activeIndex() < 0; attempts++) {
    await userEvent.tab()
  }
  expect(activeIndex()).toBe(0)
}

async function reachSecondItem() {
  await reachFirstItem()
  // Listbox antigo tem todos os botões na ordem de Tab; menu APG usa setas.
  if (document.activeElement?.getAttribute('role') === 'option') await userEvent.tab()
  else await userEvent.keyboard('{ArrowDown}')
  expect(activeIndex()).toBe(1)
}

afterEach(() => {
  cleanup()
  localStorage.removeItem(storageKey)
  localStorage.removeItem(paletteStorageKey)
})

for (const width of [1440, 390]) {
  for (const mode of ['light', 'dark'] as const) {
    describe(`ThemeSwitcher real — ${mode}, ${width}px`, () => {
      beforeEach(async () => {
        await page.viewport(width, width === 390 ? 844 : 900)
      })

      it('Enter abre pelo teclado e as opções têm a semântica anunciada', async () => {
        const trigger = mount(mode)
        await openWithKeyboard(trigger)
        const popupRole = trigger.getAttribute('aria-haspopup')
        expect(['listbox', 'menu']).toContain(popupRole)
        expect(screen.getByRole(popupRole!)).toBeTruthy()
        const selectedAttribute = popupRole === 'listbox' ? 'aria-selected' : 'aria-checked'
        expect(paletteItems()[0].getAttribute(selectedAttribute)).toBe('true')
        await reachFirstItem()
      })

      it('Enter seleciona, aplica e persiste a paleta e devolve foco ao acionador', async () => {
        const trigger = mount(mode)
        await openWithKeyboard(trigger)
        await reachSecondItem()
        await userEvent.keyboard('{Enter}')
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false')
        expect(JSON.parse(localStorage.getItem(storageKey)!).state.palette).toBe(PALETTES[1].id)
        expect(localStorage.getItem(paletteStorageKey)).toBeTruthy()
        expect(
          getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
        ).toBe(PALETTES[1][mode].accent.main)
        await expect.poll(() => document.activeElement === trigger).toBe(true)
      })

      it('Escape de uma opção fecha sem mudar paleta e devolve foco ao acionador', async () => {
        const trigger = mount(mode)
        await openWithKeyboard(trigger)
        await reachFirstItem()
        await userEvent.keyboard('{Escape}')
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false')
        expect(JSON.parse(localStorage.getItem(storageKey)!).state.palette).toBe(PALETTES[0].id)
        await expect.poll(() => document.activeElement === trigger).toBe(true)
      })

      it.each([
        { key: 'ArrowDown', fromSecond: false, expected: 1 },
        { key: 'ArrowUp', fromSecond: true, expected: 0 },
        { key: 'End', fromSecond: false, expected: PALETTES.length - 1 },
        { key: 'Home', fromSecond: true, expected: 0 },
      ])('$key move o foco sem selecionar a paleta', async ({ key, fromSecond, expected }) => {
        const trigger = mount(mode)
        await openWithKeyboard(trigger)
        if (fromSecond) await reachSecondItem()
        else await reachFirstItem()
        await userEvent.keyboard(`{${key}}`)
        await expect.poll(activeIndex).toBe(expected)
        expect(JSON.parse(localStorage.getItem(storageKey)!).state.palette).toBe(PALETTES[0].id)
      })

      it('clique externo fecha e conserva o foco no botão externo', async () => {
        const trigger = mount(mode)
        await openWithKeyboard(trigger)
        await reachFirstItem()
        const outside = screen.getByRole('button', { name: 'Fora do seletor' })
        await userEvent.click(outside)
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false')
        await expect.poll(() => document.activeElement === outside).toBe(true)
        expect(JSON.parse(localStorage.getItem(storageKey)!).state.palette).toBe(PALETTES[0].id)
      })

      it('toggle continua aplicando e persistindo o modo oposto', async () => {
        mount(mode)
        const opposite = mode === 'light' ? 'dark' : 'light'
        const toggle = screen.getByRole('button', {
          name: mode === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro',
        })
        await userEvent.click(toggle)
        expect(document.documentElement.classList.contains(opposite)).toBe(true)
        expect(JSON.parse(localStorage.getItem(storageKey)!).state.theme).toBe(opposite)
        expect(
          getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
        ).toBe(PALETTES[0][opposite].accent.main)
      })
    })
  }
}
