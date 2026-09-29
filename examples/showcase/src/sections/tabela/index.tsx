import { Avatar, Badge, Card, Chip, StatusBadge } from '@nomad/ui'
import { MoreHorizontal } from 'lucide-react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

type Row = {
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Membro'
  status: 'online' | 'offline' | 'syncing' | 'warning' | 'error' | 'pending'
  initials: string
}

const ROWS: Row[] = [
  { name: 'Ana Souza', email: 'ana@nomad.dev', role: 'Owner', status: 'online', initials: 'AS' },
  { name: 'Bruno Lima', email: 'bruno@nomad.dev', role: 'Admin', status: 'syncing', initials: 'BL' },
  {
    name: 'Camila Reis',
    email: 'camila@nomad.dev',
    role: 'Membro',
    status: 'offline',
    initials: 'CR',
  },
]

const section: ShowcaseSection = {
  id: 'tabela',
  title: 'Lista (tabela) com Card, Avatar, Badge e Chip',
  group: 'Exibição',
  order: 25,
  description:
    'A “tabela” aqui é uma lista em Card: avatar + nome + papel + status. Chip/Badge compõem o resto.',
  render: () => (
    <DemoGrid>
      <Demo title="Membros da equipe">
        <Card className="w-full">
          <Card.Header className="flex items-center justify-between">
            <div>
              <p className="text-body font-semibold text-text-primary">Membros</p>
              <p className="text-caption text-text-tertiary">
                3 contas ativas neste workspace.
              </p>
            </div>
            <button
              type="button"
              aria-label="Mais ações"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </Card.Header>
          <Card.Body className="p-0">
            <table className="w-full text-body">
              <thead className="text-caption text-text-tertiary">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium">Pessoa</th>
                  <th className="px-4 py-2 text-left font-medium">Papel</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.email} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size={28}>{r.initials}</Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{r.name}</p>
                          <p className="truncate text-caption text-text-tertiary">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Chip>{r.role}</Chip>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge type="status" value={r.status} label={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Body>
        </Card>
      </Demo>

      <Demo title="Badges de status (tons)">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Padrão</Badge>
          <Badge variant="secondary">Secundário</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="warning">Atenção</Badge>
          <Badge variant="error">Erro</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </Demo>
    </DemoGrid>
  ),
}

export default section