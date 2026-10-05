/**
 * Switch do kit (UI-STD-02): padrão APG "Switch" sobre o Base UI — papel
 * `switch` com `aria-checked`, Espaço alterna, clique no rótulo visível
 * alterna, desabilitado não muda e o nome acessível vem do `label` ou do
 * `aria-label`.
 */
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Switch } from '../index'

function Controlled({ onChange }: { onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(false)
  return (
    <Switch
      checked={on}
      onCheckedChange={(v) => {
        setOn(v)
        onChange?.(v)
      }}
      label="Janela deslizante"
      description="Corta o histórico antigo"
    />
  )
}

describe('Switch', () => {
  it('sozinho: papel switch com o nome do aria-label e estado em aria-checked', () => {
    render(<Switch checked aria-label="Ativar chave" onCheckedChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Ativar chave' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('clique e Espaço alternam (controlado)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Janela deslizante' })
    expect(sw).toHaveAttribute('aria-checked', 'false')

    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(onChange).toHaveBeenLastCalledWith(true)

    sw.focus()
    await user.keyboard(' ')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('com label: nome = rótulo e descrição ligada por aria-describedby', () => {
    render(<Controlled />)
    const sw = screen.getByRole('switch', { name: 'Janela deslizante' })
    expect(sw).toHaveAccessibleDescription('Corta o histórico antigo')
  })

  it('clicar no texto do rótulo alterna uma vez só', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await user.click(screen.getByText('Janela deslizante'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('desabilitado não alterna', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Switch checked={false} disabled aria-label="Ativar" onCheckedChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Ativar' })
    await user.click(sw)
    expect(onChange).not.toHaveBeenCalled()
    expect(sw).toHaveAttribute('aria-disabled', 'true')
  })

  it('não controlado: defaultChecked e data-testid repassado', async () => {
    const user = userEvent.setup()
    render(<Switch defaultChecked aria-label="Ligado" data-testid="sw" />)
    const sw = screen.getByTestId('sw')
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })
})
