/**
 * MultiSelect do kit (UI-STD-03): gatilho com resumo, busca, caixas de
 * seleção dentro de um grupo com nome, Clear e Esc devolvendo o foco.
 */
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { MultiSelect } from '../MultiSelect'

const OPTIONS = [
  { value: 'claude-sonnet', label: 'claude-sonnet' },
  { value: 'claude-opus', label: 'claude-opus' },
  { value: 'gpt-5', label: 'gpt-5' },
]

function Harness({ onChange }: { onChange?: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>([])
  return (
    <MultiSelect
      label="Models"
      placeholder="Any model"
      searchable
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

describe('MultiSelect', () => {
  it('abre, filtra pela busca, marca e resume a seleção', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: 'Models: Any model' })
    await user.click(trigger)
    const group = await screen.findByRole('group', { name: 'Models' })
    expect(within(group).getAllByRole('checkbox')).toHaveLength(3)

    await user.type(screen.getByRole('searchbox', { name: 'Buscar Models' }), 'claude')
    expect(within(group).getAllByRole('checkbox')).toHaveLength(2)

    await user.click(within(group).getByRole('checkbox', { name: 'claude-opus' }))
    await user.click(within(group).getByRole('checkbox', { name: 'claude-sonnet' }))
    expect(onChange).toHaveBeenLastCalledWith(['claude-opus', 'claude-sonnet'])
    expect(screen.getByRole('button', { name: 'Models: 2 selecionados' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('Esc fecha e devolve o foco ao gatilho', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Models: Any model' }))
    await screen.findByRole('group', { name: 'Models' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Models' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Models: Any model' })).toHaveFocus()
  })
})
