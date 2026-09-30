/**
 * Menu do kit (UI-STD-02 §9): propagação de `disabled` no gatilho.
 *
 * Regra (PKG-FIXES #3a, reportado pela [LB] NUI-MIG-02): `<Menu disabled />`
 * deve pôr o `BaseMenu.Trigger` em `disabled` (atributo HTML + `aria-disabled`)
 * e impedir a abertura do painel — antes, o `disabled` era ignorado e o
 * contorno era CSS no app.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Menu, MenuItem } from '../Menu'

describe('Menu', () => {
  it('disabled: gatilho recebe o atributo HTML disabled e aria-disabled, e não abre o painel', async () => {
    const user = userEvent.setup()
    render(
      <Menu button="Ações" ariaLabel="Ações da linha" disabled>
        <MenuItem onClick={() => {}}>Editar</MenuItem>
        <MenuItem onClick={() => {}}>Excluir</MenuItem>
      </Menu>,
    )

    const trigger = screen.getByRole('button', { name: 'Ações da linha' })
    // HTML `disabled` (e o `data-disabled` do Base UI) já são suficientes para
    // o atributo acessível — um `<button disabled>` tem `aria-disabled="true"`
    // implícito nas tecnologias assistivas, não precisa duplicar.
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('data-disabled', '')

    await user.click(trigger)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('sem disabled: gatilho é focável e abre o painel com os itens', async () => {
    const user = userEvent.setup()
    render(
      <Menu button="Ações" ariaLabel="Ações da linha">
        <MenuItem onClick={() => {}}>Editar</MenuItem>
      </Menu>,
    )

    const trigger = screen.getByRole('button', { name: 'Ações da linha' })
    expect(trigger).not.toBeDisabled()
    expect(trigger).not.toHaveAttribute('data-disabled')

    await user.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(menu).toHaveTextContent('Editar')
  })
})