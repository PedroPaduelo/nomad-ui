/**
 * Pagination — casos de borda além do fluxo básico coberto em table.test:
 * lista vazia, última página e página fora da faixa (clamp).
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Pagination } from '../Pagination'

describe('Pagination (bordas)', () => {
  it('lista vazia: faixa 0–0 de 0 e as duas pontas desabilitadas', () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={() => {}} />)
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toHaveTextContent('0–0 de 0')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })

  it('última página: Próxima desabilitada e Anterior volta uma', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={3} pageSize={25} total={60} onPageChange={onPageChange} />)
    expect(screen.getByRole('navigation')).toHaveTextContent('51–60 de 60')
    expect(screen.getByRole('navigation')).toHaveTextContent('Página 3 / 3')
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('página fora da faixa é limitada à última e os rótulos são trocáveis', () => {
    render(
      <Pagination
        page={500}
        pageSize={10}
        total={1234}
        onPageChange={() => {}}
        labels={{ of: 'of', previous: 'Previous', next: 'Next', page: 'Page' }}
        formatNumber={(n) => String(n)}
      />,
    )
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveTextContent('1231–1234 of 1234')
    expect(nav).toHaveTextContent('Page 124 / 124')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })
})
