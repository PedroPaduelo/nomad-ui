/**
 * Extras do kit trazidos do loadbalance na v1.1.0 (PKG-FIXES #1): Switch,
 * Table, Pagination, Banner, MultiSelect, CodeBlock e StatusDot — axe com
 * contraste em todas as paletas × claro/escuro, todos os tons de cada peça.
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { PALETTES, PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '@nomad/ui'
import { Switch } from '../components/ui/Switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  type TableRowTone,
} from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { Banner, type BannerTone } from '../components/ui/Banner'
import { MultiSelect } from '../components/ui/MultiSelect'
import { CodeBlock } from '../components/ui/CodeBlock'
import { StatusDot, type StatusDotTone } from '../components/ui/StatusDot'
import '../theme/globals.css'

const BANNER_TONES: BannerTone[] = ['info', 'success', 'warning', 'error']
const DOT_TONES: StatusDotTone[] = ['success', 'warning', 'error', 'info', 'accent', 'neutral']
const ROW_TONES: TableRowTone[] = ['default', 'selected', 'highlight', 'danger']

function Setup({
  paletteId,
  mode,
  children,
}: {
  paletteId: string
  mode: 'light' | 'dark'
  children: React.ReactNode
}) {
  useEffect(() => {
    useThemeStore.setState({ palette: paletteId as never, theme: mode })
    const pal = PALETTES.find((p) => p.id === paletteId)
    if (pal) applyPalette(pal, mode)
  }, [paletteId, mode])
  return (
    <ThemeProvider
      storageKey="kit-extras-a11y:ui-preferences"
      paletteStorageKey="kit-extras-a11y:palette-vars"
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

function Extras() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Switch label="Ligado" description="Com descrição" checked onCheckedChange={() => {}} />
      <Switch label="Desligado" checked={false} onCheckedChange={() => {}} />
      <Switch aria-label="Desabilitado" checked disabled onCheckedChange={() => {}} />

      {BANNER_TONES.map((tone) => (
        <Banner
          key={tone}
          tone={tone}
          title={`Banner ${tone}`}
          description="Descrição do aviso."
          action={<button type="button">Ação</button>}
          onDismiss={() => {}}
        />
      ))}

      <div className="flex items-center gap-3">
        {DOT_TONES.map((tone) => (
          <StatusDot key={tone} tone={tone} label={`Status ${tone}`} pulse={tone === 'success'} />
        ))}
      </div>

      <Table aria-label="Tabela de exemplo">
        <TableHeader>
          <TableRow>
            <TableHeaderCell sort={{ active: true, direction: 'asc', onSort: () => {} }}>
              Nome
            </TableHeaderCell>
            <TableHeaderCell sort={{ active: false, direction: 'asc', onSort: () => {} }}>
              Status
            </TableHeaderCell>
            <TableHeaderCell align="end">Total</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROW_TONES.map((tone) => (
            <TableRow key={tone} tone={tone}>
              <TableCell>Linha {tone}</TableCell>
              <TableCell>ok</TableCell>
              <TableCell align="end">1.234</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination page={2} pageSize={25} total={60} onPageChange={() => {}} />

      <MultiSelect
        label="Regiões"
        options={[
          { value: 'br', label: 'Brasil' },
          { value: 'us', label: 'EUA' },
        ]}
        value={['br']}
        onChange={() => {}}
        searchable
      />

      <CodeBlock aria-label="Exemplo JSON" language="json" code='{"ok": true, "n": 1, "s": null}' />
      <CodeBlock aria-label="Exemplo texto" language="text" code="linha 1\nlinha 2" copyable={false} />
    </div>
  )
}

describe('Extras do kit (Switch/Table/Pagination/Banner/MultiSelect/CodeBlock/StatusDot): axe em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`extras (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Extras />
          </Setup>,
        )
        const r = await axe.run(container, {
          rules: { 'color-contrast': { enabled: true }, region: { enabled: false } },
        })
        unmount()
        const problems = r.violations.flatMap((v) =>
          v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`),
        )
        expect(problems, `${p.id} ${mode}: ${problems.join('; ')}`).toEqual([])
      })
    }
  }
})
