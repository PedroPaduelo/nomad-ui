import { Breadcrumb, Button, Card, PageHeader, StatCard } from '@nomad/ui'
import { Plus } from 'lucide-react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const section: ShowcaseSection = {
  id: 'layout',
  title: 'Layout: PageHeader, Breadcrumb, Card e StatCard',
  group: 'Layout',
  order: 70,
  description:
    'PageHeader compõe o topo da página (eyebrow + título + ação). StatCard é o KPI do dashboard.',
  render: () => (
    <DemoGrid>
      <Demo title="PageHeader + Breadcrumb">
        <div className="flex w-full flex-col gap-3">
          <Breadcrumb
            items={[
              { label: 'Projetos', href: '#' },
              { label: 'Nomad UI', href: '#' },
              { label: 'Componentes' },
            ]}
          />
          <PageHeader
            eyebrow="Layout"
            title="Componentes"
            description="Cabeçalho padrão das páginas internas do app."
            action={
              <Button variant="primary">
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Novo
              </Button>
            }
          />
        </div>
      </Demo>

      <Demo title="Card (variantes)">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <Card variant="default">
            <Card.Header className="flex-col items-stretch">
              <p className="text-body font-semibold text-text-primary">Default</p>
              <p className="text-caption text-text-tertiary">Borda fina, fundo base.</p>
            </Card.Header>
            <Card.Body>
              <p className="text-body text-text-secondary">
                Use para agrupar conteúdo sem destacar.
              </p>
            </Card.Body>
          </Card>
          <Card variant="raised">
            <Card.Header className="flex-col items-stretch">
              <p className="text-body font-semibold text-text-primary">Raised</p>
              <p className="text-caption text-text-tertiary">Fundo levantado, sem borda.</p>
            </Card.Header>
            <Card.Body>
              <p className="text-body text-text-secondary">
                Use quando o card precisa de presença sobre o fundo.
              </p>
            </Card.Body>
          </Card>
        </div>
      </Demo>

      <Demo title="StatCard">
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard count={1284} label="Usuários ativos" />
          <StatCard count={612} label="Requisições/min" />
          <StatCard count={3} label="Erros 5xx (24h)" />
        </div>
      </Demo>
    </DemoGrid>
  ),
}

export default section