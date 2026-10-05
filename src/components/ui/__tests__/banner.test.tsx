/**
 * Banner do kit (UI-STD-03): papel por tom (alert x status), ação e dispensar.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Banner } from '../Banner'

describe('Banner', () => {
  it('erro é alert, com título, descrição e ação', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    render(
      <Banner
        tone="error"
        title="Could not load requests"
        description="Network down"
        action={<button onClick={retry}>Retry</button>}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load requests')
    expect(alert).toHaveTextContent('Network down')
    expect(alert).toHaveAttribute('data-tone', 'error')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('sucesso é status e pode ser dispensado', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<Banner tone="success" title="Sua URL foi criada" onDismiss={onDismiss} dismissLabel="Fechar aviso" />)
    expect(screen.getByRole('status')).toHaveTextContent('Sua URL foi criada')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
