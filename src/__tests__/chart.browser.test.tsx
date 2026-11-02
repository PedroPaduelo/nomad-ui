/**
 * Gráficos no Chromium: axe em todas as paletas × claro/escuro, e a cor de cada
 * série resolvida pelo navegador a partir do token da paleta ativa.
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { PALETTES, PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '@nomad/ui'
import { AreaChart, BarChart, ChartSparkline, LineChart, PieChart } from '../components/ui/Chart'
import '../theme/globals.css'
import '../theme/chart.css'

function Setup({
  paletteId,
  mode,
  children,
}: {
  paletteId: string
  mode: 'light' | 'dark'
  children: ReactNode
}) {
  useEffect(() => {
    useThemeStore.setState({ palette: paletteId as never, theme: mode })
    const pal = PALETTES.find((p) => p.id === paletteId)
    if (pal) applyPalette(pal, mode)
  }, [paletteId, mode])
  return (
    <ThemeProvider
      storageKey="chart-a11y:ui-preferences"
      paletteStorageKey="chart-a11y:palette-vars"
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

const ROWS = [
  { name: 'Seg', requests: 12, errors: 1, tokens: 900 },
  { name: 'Ter', requests: 19, errors: 3, tokens: 1200 },
  { name: 'Qua', requests: 8, errors: 0, tokens: 700 },
  { name: 'Qui', requests: 15, errors: 2, tokens: 1010 },
]
const PIE = [
  { name: 'A', value: 40 },
  { name: 'B', value: 25 },
  { name: 'C', value: 35 },
]

function Galeria() {
  return (
    <div style={{ width: 640 }}>
      <LineChart
        ariaLabel="Requisições e erros por dia"
        data={ROWS}
        xKey="name"
        series={[
          { dataKey: 'requests', label: 'Requisições' },
          { dataKey: 'errors', label: 'Erros' },
        ]}
      />
      <AreaChart
        ariaLabel="Tokens por dia"
        data={ROWS}
        xKey="name"
        categories={['tokens']}
        variant="gradient"
      />
      <BarChart ariaLabel="Erros por dia" data={ROWS} xKey="name" categories={['errors']} />
      <PieChart ariaLabel="Distribuição por rota" data={PIE} donut />
      <ChartSparkline data={[1, 3, 2, 5, 4]} ariaLabel="Tendência de erros" />
    </div>
  )
}

describe('Chart: axe em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`galeria de gráficos (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Galeria />
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

describe('Chart: cores e estrutura no navegador', () => {
  it('a série 1 pinta com a cor resolvida de --chart-1', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <LineChart ariaLabel="Linha" data={ROWS} xKey="name" categories={['requests']} />
        </div>
      </Setup>,
    )
    const curva = container.querySelector('.recharts-line-curve')
    expect(curva).not.toBeNull()
    const sonda = document.createElement('div')
    sonda.style.color = 'var(--chart-1)'
    document.body.appendChild(sonda)
    const esperado = getComputedStyle(sonda).color
    sonda.remove()
    expect(getComputedStyle(curva as Element).stroke).toBe(esperado)
    unmount()
  })

  it('gradiente: a área usa url(#…) para um gradiente que existe no SVG', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <AreaChart
            ariaLabel="Área"
            data={ROWS}
            xKey="name"
            categories={['tokens']}
            variant="gradient"
          />
        </div>
      </Setup>,
    )
    const area = container.querySelector('.recharts-area-area')
    const preenchimento = area?.getAttribute('fill') ?? ''
    expect(preenchimento.startsWith('url(#')).toBe(true)
    const id = preenchimento.slice(5, -1)
    expect(container.querySelector(`linearGradient[id="${id}"]`)).not.toBeNull()
    unmount()
  })

  it('hideLegend remove a legenda; o padrão a mostra', () => {
    const comLegenda = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <BarChart ariaLabel="Com legenda" data={ROWS} xKey="name" categories={['errors']} />
        </div>
      </Setup>,
    )
    expect(comLegenda.container.querySelector('.recharts-legend-wrapper')).not.toBeNull()
    comLegenda.unmount()

    const semLegenda = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <BarChart
            ariaLabel="Sem legenda"
            data={ROWS}
            xKey="name"
            categories={['errors']}
            hideLegend
          />
        </div>
      </Setup>,
    )
    expect(semLegenda.container.querySelector('.recharts-legend-wrapper')).toBeNull()
    semLegenda.unmount()
  })

  it('o gráfico com nome é imagem; sem nome, o gráfico e o sparkline são decorativos', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <Galeria />
      </Setup>,
    )
    expect(container.querySelector('[role="img"][aria-label="Tokens por dia"]')).not.toBeNull()
    expect(container.querySelector('.nomad-chart[aria-hidden="true"]')).toBeNull()
    unmount()

    const semNome = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div>
          <ChartSparkline data={[1, 2, 3]} />
          <LineChart ariaLabel="" data={ROWS} xKey="name" categories={['requests']} />
        </div>
      </Setup>,
    )
    expect(semNome.container.querySelectorAll('.nomad-chart[aria-hidden="true"]')).toHaveLength(2)
    expect(semNome.container.querySelector('[role="img"]')).toBeNull()
    semNome.unmount()
  })

  it('ponto isolado entre lacunas vira marcador; a linha continua visível', async () => {
    const lacunas = [{ name: 'Jan', value: 10 }, { name: 'Fev' }, { name: 'Mar', value: 30 }]
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <LineChart ariaLabel="Lacunas" data={lacunas} xKey="name" categories={['value']} />
        </div>
      </Setup>,
    )
    // Os marcadores aparecem quando a animação da linha termina (recharts).
    await new Promise((resolve) => setTimeout(resolve, 1800))
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    unmount()
  })

  it('a pizza não cria parada de Tab: o grupo da série tem tabindex -1', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <PieChart ariaLabel="Pizza" data={PIE} />
        </div>
      </Setup>,
    )
    expect(container.querySelector('.recharts-pie')?.getAttribute('tabindex')).toBe('-1')
    unmount()
  })

  it('xFormatter formata o rótulo do eixo X', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <div style={{ width: 640 }}>
          <LineChart
            ariaLabel="Eixo"
            data={ROWS}
            xKey="name"
            categories={['requests']}
            xFormatter={(v) => `dia ${String(v)}`}
          />
        </div>
      </Setup>,
    )
    expect(container.textContent).toContain('dia Seg')
    unmount()
  })
})
