import { Progress, type ProgressTone } from '@nomad/ui'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const TONES: { tone: ProgressTone; pct: number; label: string }[] = [
  { tone: 'success', pct: 65, label: 'Sucesso · 65%' },
  { tone: 'accent', pct: 80, label: 'Accent · 80%' },
  { tone: 'warning', pct: 88, label: 'Aviso · 88% (perto do corte)' },
  { tone: 'error', pct: 100, label: 'Erro · 100% (passou do corte)' },
  { tone: 'info', pct: 45, label: 'Info · 45%' },
]

const section: ShowcaseSection = {
  id: 'progress',
  title: 'Progress',
  group: 'Exibição',
  order: 30,
  description:
    'Barra de progresso com tom (success/accent/warning/error/info). Tokens do tema no fill; data-tone no root para CSS e teste.',
  render: () => (
    <DemoGrid>
      {TONES.map(({ tone, pct, label }) => (
        <Demo key={tone} title={tone}>
          <Progress value={pct} tone={tone} aria-label={label} />
        </Demo>
      ))}
    </DemoGrid>
  ),
}

export default section