import { useState } from 'react'
import {
  Banner,
  Button,
  CodeBlock,
  MultiSelect,
  Pagination,
  StatusDot,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  bannerVariants,
  type StatusDotTone,
} from '@nomad/ui'
import { Code2, Copy, ShieldAlert } from 'lucide-react'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

/**
 * Peças adicionadas na v1.1.0 (originais do load-balance; agora no kit).
 *
 * `examples/showcase` carrega o pacote por `@nomad/ui`, então o que está
 * aqui é o que cada app vê quando instala a tag. O "lado a lado" do MIG
 * com a vitrine usa estas peças.
 */

const PEOPLE = [
  { value: 'ana', label: 'Ana Souza' },
  { value: 'bruno', label: 'Bruno Lima' },
  { value: 'camila', label: 'Camila Reis' },
  { value: 'diego', label: 'Diego Alves' },
  { value: 'elisa', label: 'Elisa Prado' },
]

type SortKey = 'name' | 'status' | 'tokens'
type SortDir = 'asc' | 'desc'

const ROWS = [
  { key: 'agent-1', name: 'agent-prod', status: 'online' as const, tokens: 12_345, owner: 'Ana Souza' },
  { key: 'agent-2', name: 'agent-stage', status: 'syncing' as const, tokens: 8_910, owner: 'Bruno Lima' },
  { key: 'agent-3', name: 'agent-dev', status: 'offline' as const, tokens: 1_234, owner: 'Camila Reis' },
  { key: 'agent-4', name: 'agent-edge', status: 'warning' as const, tokens: 56_789, owner: 'Diego Alves' },
]

const STATUS_TONE: Record<typeof ROWS[number]['status'], StatusDotTone> = {
  online: 'success',
  syncing: 'info',
  offline: 'neutral',
  warning: 'warning',
}

const STATUS_LABEL: Record<typeof ROWS[number]['status'], string> = {
  online: 'online',
  syncing: 'sincronizando',
  offline: 'offline',
  warning: 'atenção',
}

function SortableTableExample() {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'tokens', dir: 'desc' })

  const toggle = (k: SortKey) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }))

  const sorted = [...ROWS].sort((a, b) => {
    const k = sort.key
    if (k === 'name' || k === 'status') return a[k].localeCompare(b[k]) * (sort.dir === 'asc' ? 1 : -1)
    return (a[k] - b[k]) * (sort.dir === 'asc' ? 1 : -1)
  })

  const sortProp = (k: SortKey) => ({
    active: sort.key === k,
    direction: sort.dir,
    onSort: () => toggle(k),
  })

  return (
    <div className="w-full">
      <Table aria-label="Agentes">
        <TableHeader>
          <TableRow>
            <TableHeaderCell sort={sortProp('name')}>Agente</TableHeaderCell>
            <TableHeaderCell sort={sortProp('status')}>Status</TableHeaderCell>
            <TableHeaderCell align="end" sort={sortProp('tokens')}>
              Tokens
            </TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.key} tone={r.status === 'warning' ? 'highlight' : 'default'} interactive>
              <TableCell>
                <span className="font-medium text-text-primary">{r.name}</span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <StatusDot
                    tone={STATUS_TONE[r.status]}
                    size="md"
                    pulse={r.status === 'online'}
                    label={`Status: ${STATUS_LABEL[r.status]}`}
                  />
                  <span className="text-body text-text-secondary">{STATUS_LABEL[r.status]}</span>
                </span>
              </TableCell>
              <TableCell align="end">
                <span className="tabular-nums">{r.tokens.toLocaleString('pt-BR')}</span>
              </TableCell>
              <TableCell>{r.owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function BannerExample() {
  const [show, setShow] = useState(true)
  return (
    <div className="flex w-full flex-col gap-3">
      {show ? (
        <Banner
          tone="warning"
          title="Conexão com o provider lenta"
          description="A média das últimas 5 respostas ficou acima do esperado. Os apps continuam funcionando."
          action={
            <Button variant="secondary" size="sm" onClick={() => setShow(false)}>
              Reconectar
            </Button>
          }
          onDismiss={() => setShow(false)}
        />
      ) : null}
    </div>
  )
}

function PaginationExample() {
  const [page, setPage] = useState(2)
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-caption text-text-secondary">
        Página controlada pelo app (a peça mostra a faixa + Anterior/Próxima; <code>page</code> e{' '}
        <code>pageSize</code> são entrada).
      </p>
      <Pagination page={page} pageSize={3} total={12} onPageChange={setPage} aria-label="Paginação de demonstração" />
    </div>
  )
}

function MultiSelectExample() {
  const [value, setValue] = useState<string[]>(['ana'])
  return (
    <div className="flex w-full flex-col gap-3">
      <MultiSelect
        label="Owners"
        options={PEOPLE}
        value={value}
        onChange={setValue}
        searchable
        searchPlaceholder="Buscar pessoa…"
      />
      <p className="text-caption text-text-tertiary">Selecionados: {value.join(', ') || '—'}</p>
    </div>
  )
}

function StatusDotShowcase() {
  const tones: Array<{ tone: StatusDotTone; text: string }> = [
    { tone: 'success', text: 'online' },
    { tone: 'info', text: 'sincronizando' },
    { tone: 'warning', text: 'atenção' },
    { tone: 'error', text: 'erro' },
    { tone: 'accent', text: 'em uso' },
    { tone: 'neutral', text: 'ocioso' },
  ]
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {tones.map((t) => (
          <span key={t.tone} className="inline-flex items-center gap-2 text-body text-text-secondary">
            <StatusDot tone={t.tone} size="md" pulse={t.tone === 'success'} label={t.text} />
            {t.text}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {tones.map((t) => (
          <span key={`${t.tone}-sm`} className="inline-flex items-center gap-2 text-caption text-text-tertiary">
            <StatusDot tone={t.tone} size="sm" label={t.text} />
            sm · {t.tone}
          </span>
        ))}
      </div>
    </div>
  )
}

const SAMPLE_JSON = `{
  "id": "req_8f3a",
  "model": "gpt-large",
  "stream": true,
  "usage": { "prompt_tokens": 1240, "completion_tokens": 318 },
  "finish_reason": null
}`

const SAMPLE_TEXT = `GET https://api.example.com/v1/agents
Authorization: Bearer ********
Accept: application/json`

const section: ShowcaseSection = {
  id: 'componentes-v1-1-0',
  title: 'Componentes v1.1.0 (loadbalance)',
  group: 'Exibição',
  order: 95,
  description:
    'Peças adicionadas na v1.1.0 do @nomad/ui (originais do load-balance): Switch, Table, Pagination, Banner, MultiSelect, CodeBlock e StatusDot. É o que cada app vê ao instalar a tag.',
  render: () => (
    <DemoGrid>
      <Demo title="Switch — ligado/desligado">
        <SwitchExample />
      </Demo>

      <Demo title="Banner — 4 tons + ação + dispensar">
        <BannerExample />
      </Demo>

      <Demo title="Pagination — Anterior/Próxima + faixa">
        <PaginationExample />
      </Demo>

      <Demo title="MultiSelect — chips, busca, limpar">
        <MultiSelectExample />
      </Demo>

      <Demo title="CodeBlock — JSON com realce + texto puro">
        <div className="flex w-full flex-col gap-3">
          <CodeBlock code={SAMPLE_JSON} language="json" aria-label="Payload JSON do request" />
          <CodeBlock code={SAMPLE_TEXT} language="text" aria-label="Cabeçalho do request" copyable={false} />
        </div>
      </Demo>

      <Demo title="StatusDot — 6 tons × 2 tamanhos, com pulse">
        <StatusDotShowcase />
      </Demo>

      <Demo title="Table — ordenação, seleção, linha em destaque, células alinhadas">
        <SortableTableExample />
      </Demo>

      <Demo title="Banner — variação info/success/error (uma faixa por tom)">
        <div className="flex w-full flex-col gap-2">
          {(['info', 'success', 'warning', 'error'] as const).map((tone) => (
            <Banner
              key={tone}
              tone={tone}
              title={`Banner · ${tone}`}
              description={
                tone === 'info'
                  ? 'Aviso neutro; usa `role="status"` para leitor de tela.'
                  : tone === 'success'
                    ? 'Confirmação pública e não bloqueante.'
                    : tone === 'warning'
                      ? 'Atenção: precisa de ação em algum momento.'
                      : 'Falha que afeta o usuário: usa `role="alert"`.'
              }
              action={<Button variant="ghost" size="sm">Detalhes</Button>}
            />
          ))}
        </div>
      </Demo>

      <Demo title="Tons do Banner (classes utilitárias disponíveis)">
        <div className="flex w-full flex-wrap gap-2">
          {(['info', 'success', 'warning', 'error'] as const).map((tone) => (
            <span
              key={tone}
              className={bannerVariants({ tone }) + ' inline-flex w-auto px-2 py-1 text-caption'}
            >
              <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
              {tone}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-(--surface-code) px-2 py-1 text-caption font-mono text-text-secondary">
            <Code2 aria-hidden="true" className="h-3.5 w-3.5" />
            bannerVariants({"{ tone: 'success' }"})
          </span>
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-(--surface-code) px-2 py-1 text-caption font-mono text-text-secondary">
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            statusDotVariants({"{ tone, size }"})
          </span>
        </div>
      </Demo>
    </DemoGrid>
  ),
}

function SwitchExample() {
  const [a, setA] = useState(true)
  const [b, setB] = useState(false)
  return (
    <div className="flex w-full flex-col gap-3">
      <Switch
        label="Streaming"
        description="Recebe tokens conforme o modelo emite."
        checked={a}
        onCheckedChange={setA}
      />
      <Switch label="Logs detalhados" checked={b} onCheckedChange={setB} />
      <Switch label="Desabilitado" disabled defaultChecked />
    </div>
  )
}

export default section