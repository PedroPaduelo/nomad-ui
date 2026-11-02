import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CHART_SLOTS,
  ChartLegendContent,
  ChartTooltipContent,
  chartColor,
  resolveSeries,
} from '../components/ui/Chart'

describe('chartColor', () => {
  it('devolve token de slot e cicla pela rampa', () => {
    expect(chartColor(0)).toBe('var(--chart-1)')
    expect(chartColor(CHART_SLOTS)).toBe('var(--chart-1)')
    for (let i = 0; i < 12; i++) expect(chartColor(i)).toMatch(/^var\(--chart-[1-4]\)$/)
  })
})

describe('resolveSeries', () => {
  it('series tem precedência sobre categories', () => {
    const list = resolveSeries(
      [{ dataKey: 'a', label: 'Alfa', color: 'var(--chart-3)' }],
      ['b', 'c'],
    )
    expect(list).toEqual([
      { dataKey: 'a', label: 'Alfa', color: 'var(--chart-3)', dash: undefined },
    ])
  })

  it('categories vira série com rótulo e cor padrão', () => {
    const list = resolveSeries(undefined, ['requests', 'errors'])
    expect(list.map((s) => [s.dataKey, s.label, s.color])).toEqual([
      ['requests', 'requests', 'var(--chart-1)'],
      ['errors', 'errors', 'var(--chart-2)'],
    ])
  })

  it('depois de um ciclo da rampa o tracejado diferencia a série', () => {
    const list = resolveSeries(
      undefined,
      Array.from({ length: CHART_SLOTS + 1 }, (_, i) => `s${i}`),
    )
    expect(list[0].dash).toBeUndefined()
    expect(list[CHART_SLOTS].color).toBe('var(--chart-1)')
    expect(list[CHART_SLOTS].dash).toBe('6 3')
  })
})

describe('regra de cor da casa: nenhum literal de cor nos arquivos do gráfico', () => {
  it('Chart.tsx e chart.css não têm hex, rgb() nem hsl()', () => {
    for (const file of ['src/components/ui/Chart.tsx', 'src/theme/chart.css']) {
      const text = readFileSync(join(process.cwd(), file), 'utf8')
      expect(text.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g), file).toBeNull()
    }
  })

  it('a rampa usa só tokens de texto, que a paleta garante em 4.5:1', () => {
    const css = readFileSync(join(process.cwd(), 'src/theme/chart.css'), 'utf8')
    const slots = [...css.matchAll(/--chart-\d:\s*([^;]+);/g)].map((m) => m[1].trim())
    expect(slots).toHaveLength(CHART_SLOTS)
    for (const valor of slots) expect(valor).toMatch(/^var\(--color-text-/)
  })
})

describe('ChartTooltipContent', () => {
  it('mostra o rótulo, o nome da série e o valor formatado', () => {
    const { container } = render(
      <ChartTooltipContent
        active
        label="Seg"
        payload={[{ name: 'requests', dataKey: 'requests', value: 12, color: 'var(--chart-1)' }]}
        formatter={(v) => `${v} req`}
      />,
    )
    expect(container.textContent).toContain('Seg')
    expect(container.textContent).toContain('requests')
    expect(container.textContent).toContain('12 req')
  })

  it('valor não finito aparece como traço, e não como NaN', () => {
    const { container } = render(
      <ChartTooltipContent
        active
        label="Qua"
        payload={[{ name: 'requests', value: Number.NaN }]}
        formatter={(v) => `${v} req`}
      />,
    )
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toContain('NaN')
  })

  it('sem active não renderiza nada', () => {
    const { container } = render(
      <ChartTooltipContent active={false} payload={[{ name: 'requests', value: 1 }]} />,
    )
    expect(container.innerHTML).toBe('')
  })
})

describe('ChartLegendContent', () => {
  it('uma entrada por série, com o nome e a cor do slot', () => {
    const { container } = render(
      <ChartLegendContent
        payload={[
          { value: 'requests', color: 'var(--chart-1)' },
          { value: 'errors', color: 'var(--chart-2)' },
        ]}
      />,
    )
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.textContent).toContain('errors')
  })
})
