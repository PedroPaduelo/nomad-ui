// ── Chart — gráficos de dados do kit (recharts 2) ───────────────────────────
//
// Cores vêm de quatro tokens de texto da paleta ativa (`--chart-1` a
// `--chart-4`, em src/theme/chart.css). A paleta garante contraste de texto
// de 4.5:1 sobre as superfícies, e isso cobre o 3:1 que objeto gráfico exige.
// Séries além do quarto slot repetem a cor e se diferenciam pelo tracejado
// (linha e área). Âmbar fica fora: é a cor do agente.
//
// Gráfico de dados exige `ariaLabel`. Sem nome, ele sai da árvore de
// acessibilidade como decorativo. O `ChartSparkline` é decorativo sem nome.
//
// `Chart` despacha pela prop `type`. `ChartTooltip` e `ChartLegend` são os do
// recharts; o conteúdo é o do kit.

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '../../lib/utils'

export { Legend as ChartLegend, Tooltip as ChartTooltip } from 'recharts'

export type ChartVariant = 'default' | 'gradient'
export type ChartSize = 'sm' | 'md' | 'lg' | 'xl'
export type ChartValueFormatter = (value: number) => string
export type ChartRow = Record<string, unknown>

export interface ChartConfigEntry {
  label?: string
  /** Token CSS, por exemplo `var(--chart-1)`. */
  color?: string
}

/** Mapa da chave da série (ou do nome da fatia) para rótulo e cor. */
export type ChartConfig = Record<string, ChartConfigEntry>

export interface ChartSeries {
  /** Campo da linha de dados. */
  dataKey: string
  /** Rótulo na legenda e no tooltip. Padrão: `dataKey`. */
  label?: string
  /** Cor CSS. Padrão: o próximo slot da rampa. */
  color?: string
}

const HEIGHT: Record<ChartSize, number> = { sm: 160, md: 240, lg: 320, xl: 400 }
const SPARK_HEIGHT: Record<ChartSize, number> = { sm: 24, md: 40, lg: 56, xl: 72 }
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 }
const SPARK_MARGIN = { top: 2, right: 2, bottom: 2, left: 2 }
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Slots de cor da rampa. Os quatro são tokens de texto, com contraste garantido. */
export const CHART_SLOTS = 4
const DASHES: ReadonlyArray<string | undefined> = [undefined, '6 3', '2 2', '8 3 2 3']

/** Cor de um slot da rampa. Sempre um token CSS. */
export function chartColor(index: number): string {
  return `var(--chart-${(index % CHART_SLOTS) + 1})`
}

interface ResolvedSeries {
  dataKey: string
  label: string
  color: string
  dash: string | undefined
}

/**
 * `series` tem precedência. `categories` é o atalho: só as chaves, com rótulo
 * e cor padrão.
 */
export function resolveSeries(
  series: ChartSeries[] | undefined,
  categories: string[] | undefined,
): ResolvedSeries[] {
  const list: ChartSeries[] = series?.length
    ? series
    : (categories ?? []).map((dataKey) => ({ dataKey }))
  return list.map((s, i) => ({
    dataKey: s.dataKey,
    label: s.label ?? s.dataKey,
    color: s.color ?? chartColor(i),
    dash: DASHES[Math.floor(i / CHART_SLOTS) % DASHES.length],
  }))
}

function configFrom(list: ResolvedSeries[]): ChartConfig {
  return Object.fromEntries(list.map((s) => [s.dataKey, { label: s.label, color: s.color }]))
}

/** Valores numéricos em texto viram número. Sem isso o domínio do eixo sai errado. */
function normalizeRows(
  data: ReadonlyArray<ChartRow> | null | undefined,
  keys: string[],
): ChartRow[] {
  if (!data) return []
  return data.map((row) => {
    const next: ChartRow = { ...row }
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        next[key] = Number(value)
      }
    }
    return next
  })
}

const ChartContext = createContext<{ config: ChartConfig } | null>(null)

function useChartConfig(): ChartConfig {
  return useContext(ChartContext)?.config ?? {}
}

/** Animação desligada com prefers-reduced-motion. Sem matchMedia (jsdom, SSR), mantém a animação. */
function useAnimate(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(REDUCED_MOTION)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o matchMedia depois de montar (SSR-safe)
    setReduced(mql.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return !reduced
}

/** id seguro para `url(#…)`. O useId traz caracteres que quebram a referência. */
function useGradientId(): string {
  return 'chart-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

export interface ChartContainerProps {
  config: ChartConfig
  /** Nome do gráfico para leitores de tela. Vazio deixa o gráfico decorativo. */
  ariaLabel: string
  size?: ChartSize
  variant?: ChartVariant
  className?: string
  /** Um único elemento de gráfico do recharts. */
  children: ReactElement
}

/**
 * Contêiner de gráfico. Leva a `config` ao tooltip e à legenda, dá a altura do
 * tamanho escolhido e expõe o gráfico como imagem com nome.
 */
export function ChartContainer({
  config,
  ariaLabel,
  size = 'md',
  variant = 'default',
  className,
  children,
}: ChartContainerProps) {
  const decorative = !ariaLabel
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : ariaLabel}
        aria-hidden={decorative ? true : undefined}
        data-size={size}
        data-variant={variant}
        className={cn('nomad-chart w-full', className)}
        style={{ height: HEIGHT[size] ?? HEIGHT.md }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

interface TooltipEntry {
  name?: string | number
  dataKey?: string | number
  value?: unknown
  color?: string
}

export interface ChartTooltipContentProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipEntry>
  label?: unknown
  /** Formata cada valor numérico. Padrão: texto puro. */
  formatter?: ChartValueFormatter
  /** Formata o rótulo do eixo X. */
  labelFormatter?: (label: unknown) => ReactNode
}

/** Texto do valor: número finito passa pelo formatador; ausente ou não numérico vira traço. */
function valueText(value: unknown, formatter?: ChartValueFormatter): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—'
    return formatter ? formatter(value) : String(value)
  }
  return value === undefined || value === null ? '—' : String(value)
}

/** Conteúdo do tooltip: rótulo do eixo e, por série, cor, nome e valor. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipContentProps) {
  const config = useChartConfig()
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-32 rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-text-primary shadow-md">
      {label === undefined || label === null || label === '' ? null : (
        <div className="mb-1 font-medium">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}
      <ul className="grid gap-1">
        {payload.map((entry) => {
          const key = String(entry.name ?? entry.dataKey ?? '')
          const meta = config[key]
          return (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-text-secondary">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: meta?.color ?? entry.color }}
                />
                {meta?.label ?? key}
              </span>
              <span className="font-medium tabular-nums text-text-primary">
                {valueText(entry.value, formatter)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface LegendEntry {
  value?: unknown
  dataKey?: string | number
  color?: string
}

export interface ChartLegendContentProps {
  payload?: ReadonlyArray<LegendEntry>
}

/** Conteúdo da legenda: uma entrada por série, com a cor do slot. */
export function ChartLegendContent({ payload }: ChartLegendContentProps) {
  const config = useChartConfig()
  if (!payload?.length) return null
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-sm text-text-secondary">
      {payload.map((entry) => {
        const key = String(entry.value ?? entry.dataKey ?? '')
        const meta = config[key]
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: meta?.color ?? entry.color }}
            />
            {meta?.label ?? key}
          </li>
        )
      })}
    </ul>
  )
}

/** Gradiente vertical por série. `from` e `to` são as opacidades do topo e da base. */
function gradientDefs(list: ResolvedSeries[], id: string, from: number, to: number) {
  return (
    <defs>
      {list.map((s, i) => (
        <linearGradient key={s.dataKey} id={`${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: s.color, stopOpacity: from }} />
          <stop offset="100%" style={{ stopColor: s.color, stopOpacity: to }} />
        </linearGradient>
      ))}
    </defs>
  )
}

/**
 * Ponto sem vizinho com valor é marcado. Sem isso, um dado isolado entre duas
 * lacunas some, porque a linha não tem trecho para desenhar.
 */
function isolatedDot(rows: ChartRow[], dataKey: string, color: string) {
  const hasValue = (i: number) => {
    const value = rows[i]?.[dataKey]
    return typeof value === 'number' && Number.isFinite(value)
  }
  return (props: { cx?: unknown; cy?: unknown; index?: unknown; key?: unknown }) => {
    const { cx, cy, index } = props
    // O recharts renderiza o `dot` como filho de uma lista, e o React só lê o
    // `key` do elemento devolvido — a função não o herda dos props. O recharts
    // já manda um `key` único por ponto ("dot-<i>"); sem copiá-lo, o React
    // avisa de chave ausente.
    const key = typeof props.key === 'string' ? props.key : `dot-${index}`
    if (typeof cx !== 'number' || typeof cy !== 'number' || typeof index !== 'number') {
      return <g key={key} />
    }
    if (!hasValue(index) || hasValue(index - 1) || hasValue(index + 1)) {
      return <g key={key} />
    }
    return <circle key={key} cx={cx} cy={cy} r={3} style={{ fill: color }} />
  }
}

function valueTicks(formatter: ChartValueFormatter | undefined) {
  return formatter ? (value: unknown) => formatter(Number(value)) : undefined
}

function labelTicks(formatter: ((value: unknown) => string) | undefined) {
  return formatter ? (value: unknown) => formatter(value) : undefined
}

interface ChartBaseProps {
  /** Nome do gráfico para leitores de tela. Obrigatório. */
  ariaLabel: string
  /** `gradient` preenche áreas e barras com degradê. Em linha não tem efeito. */
  variant?: ChartVariant
  size?: ChartSize
  /** Esconde a legenda. Padrão: a legenda aparece. */
  hideLegend?: boolean
  valueFormatter?: ChartValueFormatter
  className?: string
}

export interface CartesianChartProps extends ChartBaseProps {
  data: ReadonlyArray<ChartRow>
  /** Campo do eixo X. Padrão: `name`. */
  xKey?: string
  /** Formata o rótulo do eixo X. */
  xFormatter?: (value: unknown) => string
  /** Atalho: só as chaves das séries, com rótulo e cor padrão. */
  categories?: string[]
  /** Séries com rótulo e cor. Tem precedência sobre `categories`. */
  series?: ChartSeries[]
}

export interface PieChartProps extends ChartBaseProps {
  data: ReadonlyArray<ChartRow>
  /** Campo com o valor da fatia. Padrão: `value`. */
  dataKey?: string
  /** Campo com o nome da fatia. Padrão: `name`. */
  nameKey?: string
  /** Furo no centro. */
  donut?: boolean
}

export function LineChart({
  data,
  xKey = 'name',
  xFormatter,
  categories,
  series,
  ariaLabel,
  variant = 'default',
  size = 'md',
  hideLegend = false,
  valueFormatter,
  className,
}: CartesianChartProps) {
  const list = resolveSeries(series, categories)
  const rows = normalizeRows(
    data,
    list.map((s) => s.dataKey),
  )
  const animate = useAnimate()
  return (
    <ChartContainer
      config={configFrom(list)}
      ariaLabel={ariaLabel}
      size={size}
      variant={variant}
      className={className}
    >
      <RechartsLineChart data={rows} margin={MARGIN}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTicks(xFormatter)}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={valueTicks(valueFormatter)} />
        <Tooltip
          cursor={{ stroke: 'var(--color-border-hover)' }}
          content={<ChartTooltipContent formatter={valueFormatter} />}
        />
        {hideLegend ? null : <Legend content={<ChartLegendContent />} />}
        {list.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dash}
            dot={isolatedDot(rows, s.dataKey, s.color)}
            isAnimationActive={animate}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}

export function AreaChart({
  data,
  xKey = 'name',
  xFormatter,
  categories,
  series,
  ariaLabel,
  variant = 'default',
  size = 'md',
  hideLegend = false,
  valueFormatter,
  className,
}: CartesianChartProps) {
  const list = resolveSeries(series, categories)
  const rows = normalizeRows(
    data,
    list.map((s) => s.dataKey),
  )
  const gradientId = useGradientId()
  const animate = useAnimate()
  const gradient = variant === 'gradient'
  return (
    <ChartContainer
      config={configFrom(list)}
      ariaLabel={ariaLabel}
      size={size}
      variant={variant}
      className={className}
    >
      <RechartsAreaChart data={rows} margin={MARGIN}>
        {gradient ? gradientDefs(list, gradientId, 0.45, 0) : null}
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTicks(xFormatter)}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={valueTicks(valueFormatter)} />
        <Tooltip
          cursor={{ stroke: 'var(--color-border-hover)' }}
          content={<ChartTooltipContent formatter={valueFormatter} />}
        />
        {hideLegend ? null : <Legend content={<ChartLegendContent />} />}
        {list.map((s, i) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dash}
            fill={gradient ? `url(#${gradientId}-${i})` : s.color}
            fillOpacity={gradient ? 1 : 0.15}
            dot={isolatedDot(rows, s.dataKey, s.color)}
            isAnimationActive={animate}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  )
}

export function BarChart({
  data,
  xKey = 'name',
  xFormatter,
  categories,
  series,
  ariaLabel,
  variant = 'default',
  size = 'md',
  hideLegend = false,
  valueFormatter,
  className,
}: CartesianChartProps) {
  const list = resolveSeries(series, categories)
  const rows = normalizeRows(
    data,
    list.map((s) => s.dataKey),
  )
  const gradientId = useGradientId()
  const animate = useAnimate()
  const gradient = variant === 'gradient'
  return (
    <ChartContainer
      config={configFrom(list)}
      ariaLabel={ariaLabel}
      size={size}
      variant={variant}
      className={className}
    >
      <RechartsBarChart data={rows} margin={MARGIN}>
        {gradient ? gradientDefs(list, gradientId, 1, 0.55) : null}
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickFormatter={labelTicks(xFormatter)}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={valueTicks(valueFormatter)} />
        <Tooltip
          cursor={{ fill: 'var(--color-accent-muted)' }}
          content={<ChartTooltipContent formatter={valueFormatter} />}
        />
        {hideLegend ? null : <Legend content={<ChartLegendContent />} />}
        {list.map((s, i) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            fill={gradient ? `url(#${gradientId}-${i})` : s.color}
            radius={[4, 4, 0, 0]}
            isAnimationActive={animate}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}

export function PieChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  ariaLabel,
  variant = 'default',
  size = 'md',
  hideLegend = false,
  valueFormatter,
  donut = false,
  className,
}: PieChartProps) {
  const rows = normalizeRows(data, [dataKey])
  const config: ChartConfig = Object.fromEntries(
    rows.map((row, i) => {
      const name = String(row[nameKey] ?? '')
      return [name, { label: name, color: chartColor(i) }]
    }),
  )
  const animate = useAnimate()
  return (
    <ChartContainer
      config={config}
      ariaLabel={ariaLabel}
      size={size}
      variant={variant}
      className={className}
    >
      <RechartsPieChart margin={MARGIN}>
        <Tooltip content={<ChartTooltipContent formatter={valueFormatter} />} />
        {hideLegend ? null : <Legend content={<ChartLegendContent />} />}
        <Pie
          data={rows}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={donut ? '60%' : 0}
          outerRadius="85%"
          stroke="none"
          rootTabIndex={-1}
          isAnimationActive={animate}
        >
          {rows.map((_row, i) => (
            <Cell key={i} fill={chartColor(i)} />
          ))}
        </Pie>
      </RechartsPieChart>
    </ChartContainer>
  )
}

export interface ChartSparklineProps {
  /** Números em sequência, ou linhas com `dataKey`. */
  data: ReadonlyArray<number> | ReadonlyArray<ChartRow>
  /** Campo com o valor quando `data` são linhas. Padrão: `value`. */
  dataKey?: string
  /** Cor CSS. Padrão: o primeiro slot da rampa. */
  color?: string
  variant?: ChartVariant
  size?: ChartSize
  /** Sem `ariaLabel` o sparkline é decorativo e fica fora da árvore de acessibilidade. */
  ariaLabel?: string
  className?: string
}

/** Miniatura de tendência: área sem eixos, sem tooltip e sem legenda. */
export function ChartSparkline({
  data,
  dataKey = 'value',
  color,
  variant = 'default',
  size = 'md',
  ariaLabel,
  className,
}: ChartSparklineProps) {
  const raw = (data ?? []) as ReadonlyArray<number | ChartRow>
  const rows = normalizeRows(
    raw.map((d) => (typeof d === 'number' ? { [dataKey]: d } : d)),
    [dataKey],
  )
  const stroke = color ?? chartColor(0)
  const gradientId = useGradientId()
  const animate = useAnimate()
  const gradient = variant === 'gradient'
  const decorative = !ariaLabel
  const series: ResolvedSeries[] = [{ dataKey, label: dataKey, color: stroke, dash: undefined }]
  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? true : undefined}
      data-size={size}
      data-variant={variant}
      className={cn('nomad-chart w-full', className)}
      style={{ height: SPARK_HEIGHT[size] ?? SPARK_HEIGHT.md }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={rows} margin={SPARK_MARGIN}>
          {gradient ? gradientDefs(series, gradientId, 0.45, 0) : null}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={1.5}
            fill={gradient ? `url(#${gradientId}-0)` : stroke}
            fillOpacity={gradient ? 1 : 0.15}
            dot={isolatedDot(rows, dataKey, stroke)}
            isAnimationActive={animate}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export type ChartProps =
  (CartesianChartProps & { type: 'line' | 'area' | 'bar' }) | (PieChartProps & { type: 'pie' })

/** Despacha para o gráfico escolhido pela prop `type`. */
export function Chart(props: ChartProps) {
  switch (props.type) {
    case 'line':
      return <LineChart {...props} />
    case 'area':
      return <AreaChart {...props} />
    case 'bar':
      return <BarChart {...props} />
    case 'pie':
      return <PieChart {...props} />
    default:
      return null
  }
}
