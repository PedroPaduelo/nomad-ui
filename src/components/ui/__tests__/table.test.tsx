/**
 * Table + Pagination do kit (UI-STD-03): marcação semântica, cabeçalho
 * ordenável com aria-sort e botão, tom de linha por token e paginação com
 * pontas desabilitadas.
 */
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '../Table'
import { Pagination } from '../Pagination'

function Sortable() {
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  return (
    <Table aria-label="Configs">
      <TableHeader>
        <TableRow>
          <TableHeaderCell sort={{ active: true, direction: dir, onSort: () => setDir(dir === 'asc' ? 'desc' : 'asc') }}>
            Name
          </TableHeaderCell>
          <TableHeaderCell sort={{ active: false, direction: 'asc', onSort: () => {} }}>Status</TableHeaderCell>
          <TableHeaderCell align="end">Tokens</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow tone="selected">
          <TableCell>alpha</TableCell>
          <TableCell>on</TableCell>
          <TableCell align="end">10</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

describe('Table', () => {
  it('é uma tabela de verdade, com cabeçalhos de coluna e aria-sort', async () => {
    const user = userEvent.setup()
    render(<Sortable />)
    const table = screen.getByRole('table', { name: 'Configs' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers).toHaveLength(3)
    expect(headers[0]).toHaveAttribute('aria-sort', 'ascending')
    expect(headers[1]).toHaveAttribute('aria-sort', 'none')
    expect(headers[2]).not.toHaveAttribute('aria-sort')
    await user.click(within(headers[0]).getByRole('button', { name: 'Name' }))
    expect(headers[0]).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('cell', { name: '10' })).toHaveClass('text-right')
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('data-tone', 'selected')
  })
})

describe('Pagination', () => {
  it('mostra a faixa e desabilita as pontas', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const { rerender } = render(
      <Pagination page={1} pageSize={25} total={60} onPageChange={onPageChange} aria-label="Request pages" />,
    )
    const nav = screen.getByRole('navigation', { name: 'Request pages' })
    expect(nav).toHaveTextContent('1–25 de 60')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    rerender(<Pagination page={3} pageSize={25} total={60} onPageChange={onPageChange} />)
    expect(screen.getByRole('navigation')).toHaveTextContent('51–60 de 60')
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })

  it('lista vazia: 0–0 e as duas pontas desabilitadas', () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={() => {}} />)
    expect(screen.getByRole('navigation')).toHaveTextContent('0–0 de 0')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })
})
