import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileNavButton } from '../components/ui/Header'

describe('MobileNavButton', () => {
  it('aponta para o drawer da sidebar e expõe o estado aberto', () => {
    render(<MobileNavButton expanded />)
    const botao = screen.getByRole('button', { name: 'Abrir navegação' })
    expect(botao.getAttribute('aria-controls')).toBe('mobile-sidebar')
    expect(botao.getAttribute('aria-expanded')).toBe('true')
  })

  it('chama onToggle ao clicar e aceita rótulo próprio', () => {
    const onToggle = vi.fn()
    render(<MobileNavButton onToggle={onToggle} label="Menu do app" />)
    screen.getByRole('button', { name: 'Menu do app' }).click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
