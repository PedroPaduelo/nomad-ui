import {
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonText,
  StatusBadge,
  TableSkeleton,
} from '@nomad/ui'
import { Search } from 'lucide-react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const section: ShowcaseSection = {
  id: 'banner-estados',
  title: 'Estados e carga',
  group: 'Estados',
  order: 40,
  description:
    'EmptyState, ErrorState, Skeleton e StatusBadge: o que aparece enquanto o conteúdo real não chega ou quando algo falha.',
  render: () => (
    <DemoGrid>
      <Demo title="StatusBadge">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge type="status" value="online" label="online" />
          <StatusBadge type="status" value="offline" label="offline" />
          <StatusBadge type="status" value="syncing" label="syncing" />
          <StatusBadge type="status" value="warning" label="warning" />
          <StatusBadge type="status" value="error" label="error" />
          <StatusBadge type="status" value="pending" label="pending" />
        </div>
      </Demo>

      <Demo title="EmptyState">
        <div className="w-full">
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Refine a busca ou limpe os filtros para ver mais itens."
            action={
              <Button variant="secondary" onClick={() => {}}>
                Limpar filtros
              </Button>
            }
          />
        </div>
      </Demo>

      <Demo title="ErrorState">
        <div className="w-full">
          <ErrorState
            title="Falha ao carregar"
            description="Não conseguimos buscar os dados. Tente de novo em alguns instantes."
            onRetry={() => {}}
          />
        </div>
      </Demo>

      <Demo title="Skeleton linha e bloco">
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={3} />
        </div>
      </Demo>

      <Demo title="Tabela carregando (TableSkeleton)">
        <div className="w-full">
          <TableSkeleton rows={4} columns={4} />
        </div>
      </Demo>
    </DemoGrid>
  ),
}

export default section