/**
 * Toast do kit (PKG-FIXES #3b): wrapper Sonner + tokens da paleta ativa.
 *
 * Regras:
 * - `useToast()` retorna SEMPRE a mesma referência (memoização segura).
 * - `Toaster` lê o tema via `useResolvedTheme()` e injeta CSS vars para os 4
 *   tons (success/error/warning/info) apontando para os tokens da paleta
 *   ativa. Sem isso, o toast fica em cor padrão do Sonner, ignorando a paleta.
 */
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Toaster } from '../Toaster'
import { useToast } from '../useToast'
import { useThemeStore } from '../../../theme/store'

afterEach(() => {
  // Volta para 'light' para não vazar tema entre testes.
  useThemeStore.getState().setTheme('light')
})

describe('useToast', () => {
  it('retorna a mesma referência em renders diferentes (memoização)', () => {
    const { result, rerender } = renderHook(() => useToast())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('expõe success, error, warning, info, loading, dismiss, promise como funções', () => {
    const toast = useToast()
    expect(typeof toast.success).toBe('function')
    expect(typeof toast.error).toBe('function')
    expect(typeof toast.warning).toBe('function')
    expect(typeof toast.info).toBe('function')
    expect(typeof toast.loading).toBe('function')
    expect(typeof toast.dismiss).toBe('function')
    expect(typeof toast.promise).toBe('function')
  })
})

describe('Toaster', () => {
  it('renderiza a região de toasts do Sonner (ol-inert="true" no jsdom)', () => {
    render(<Toaster />)
    // A região do Sonner tem role="region" e aria-label="Notifications".
    expect(screen.getByRole('region', { name: /notif/i })).toBeInTheDocument()
  })

  it('lê o tema do useResolvedTheme() e injeta CSS vars para os 4 tons (no <ol> após um toast)', async () => {
    useThemeStore.getState().setTheme('dark')
    const user = userEvent.setup()
    function Demo() {
      const toast = useToast()
      return <button onClick={() => toast.success('x')}>Disparar</button>
    }
    render(
      <>
        <Demo />
        <Toaster />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Disparar' }))
    // Após um toast, o <ol data-sonner-toaster> aparece com o style aplicado.
    const ol = document.querySelector('ol[data-sonner-toaster]') as HTMLElement | null
    expect(ol).toBeTruthy()
    const styleBlob = ol?.getAttribute('style') ?? ''
    expect(styleBlob).toContain('--success-bg')
    expect(styleBlob).toContain('--error-bg')
    expect(styleBlob).toContain('--warning-bg')
    expect(styleBlob).toContain('--info-bg')
    expect(styleBlob).toContain('--normal-bg')
  })

  it('os tons usam color-mix com os tokens do tema (não cores hardcoded)', async () => {
    const user = userEvent.setup()
    function Demo() {
      const toast = useToast()
      return <button onClick={() => toast.success('x')}>Disparar</button>
    }
    render(
      <>
        <Demo />
        <Toaster />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Disparar' }))
    const ol = document.querySelector('ol[data-sonner-toaster]') as HTMLElement | null
    const styleBlob = ol?.getAttribute('style') ?? ''
    expect(styleBlob).toMatch(/--success-bg[^"]*color-mix/)
    expect(styleBlob).toMatch(/--success-text[^"]*var\(--color-success\)/)
  })

  it('clique num botão que dispara toast: aparece um [data-sonner-toast]', async () => {
    const user = userEvent.setup()
    function Demo() {
      const toast = useToast()
      return <button onClick={() => toast.success('Salvo!')}>Disparar</button>
    }
    render(
      <>
        <Demo />
        <Toaster />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Disparar' }))
    expect(screen.getByText('Salvo!')).toBeInTheDocument()
  })

  it('prop position customizada (top-right) é aceita', () => {
    render(<Toaster position="top-right" />)
    // A região existe; Sonner posiciona via CSS no próprio wrapper.
    expect(screen.getByRole('region', { name: /notif/i })).toBeInTheDocument()
  })
})