import { useState } from 'react'
import { Button, Segmented } from '@nomad/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const PAGE_SIZES = [10, 25, 50, 100]

function PaginationExample() {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const total = 137

  const totalPages = Math.max(1, Math.ceil(total / size))
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-caption text-text-secondary">
        {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Página anterior"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Anterior
        </Button>
        <span className="text-body text-text-primary">
          Página <strong>{page}</strong> de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Próxima página"
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Próxima
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </Button>
      </div>
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
    </div>
  )
}

const section: ShowcaseSection = {
  id: 'paginacao',
  title: 'Paginação',
  group: 'Navegação',
  order: 60,
  description:
    'Compor paginação com Button e Segmented: anterior/próxima + seletor de tamanho.',
  render: () => (
    <DemoGrid>
      <Demo title="Lista paginada">
        <PaginationExample />
      </Demo>
    </DemoGrid>
  ),
}

export default section