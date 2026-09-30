import { useState } from 'react'
import { Pagination, Segmented } from '@nomad/ui'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const PAGE_SIZES = [10, 25, 50, 100]

/**
 * Paginação controlada pelo app (a peça mostra a faixa e Anterior/Próxima).
 * O seletor de tamanho ao lado é só para demonstrar `pageSize`.
 */
function PaginationExample() {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const total = 137
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-secondary">Itens por página:</span>
        <Segmented
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
          value={String(size)}
          onChange={(v) => {
            setSize(Number(v))
            setPage(1)
          }}
          aria-label="Tamanho da página"
        />
      </div>
      <Pagination
        page={page}
        pageSize={size}
        total={total}
        onPageChange={setPage}
        aria-label="Paginação de demonstração"
      />
    </div>
  )
}

function EmptyExample() {
  return (
    <div className="w-full text-caption text-text-tertiary">
      Quando <code>total = 0</code>, a peça mostra <code>0–0 de 0</code> com Anterior/Próxima desabilitados.
    </div>
  )
}

function OverflowExample() {
  const [page, setPage] = useState(20)
  return (
    <div className="flex w-full justify-end">
      <Pagination
        page={page}
        pageSize={5}
        total={999}
        onPageChange={setPage}
        aria-label="Paginação em página grande"
      />
    </div>
  )
}

const section: ShowcaseSection = {
  id: 'paginacao',
  title: 'Paginação',
  group: 'Navegação',
  order: 60,
  description:
    'Paginação do kit: faixa ("26–50 de 1.234") + Anterior/Próxima. `page` e `pageSize` vêm do app; a peça só apresenta.',
  render: () => (
    <DemoGrid>
      <Demo title="Com seletor de tamanho">
        <PaginationExample />
      </Demo>
      <Demo title="Página grande (999 itens, página 20)">
        <OverflowExample />
      </Demo>
      <Demo title="Lista vazia">
        <EmptyExample />
      </Demo>
    </DemoGrid>
  ),
}

export default section