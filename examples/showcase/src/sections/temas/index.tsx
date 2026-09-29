import { Card } from '@nomad/ui'
import { PALETTES, useThemeStore, type PaletteId } from '@nomad/ui'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

function PaletteCard({
  id,
  name,
  description,
  preview,
  isActive,
  onActivate,
}: {
  id: PaletteId
  name: string
  description: string
  preview: { accent: string; amber: string; surface: string }
  isActive: boolean
  onActivate: () => void
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-pressed={isActive}
      className={
        'flex min-w-0 flex-col gap-3 rounded-lg border bg-surface-base p-4 text-left transition-colors ' +
        (isActive ? 'border-accent' : 'border-border hover:border-border-hover')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold text-text-primary">{name}</span>
        {isActive ? (
          <span className="text-caption font-semibold text-text-accent">ativa</span>
        ) : null}
      </div>
      <p className="text-caption text-text-secondary">{description}</p>
      <div className="flex items-center gap-1.5">
        <span
          className="h-7 w-7 rounded-md border border-border"
          style={{ background: preview.accent }}
          aria-hidden
        />
        <span
          className="h-7 w-7 rounded-md border border-border"
          style={{ background: preview.amber }}
          aria-hidden
        />
        <span
          className="h-7 w-7 rounded-md border border-border"
          style={{ background: preview.surface }}
          aria-hidden
        />
      </div>
      <span className="text-caption font-mono text-text-tertiary">{id}</span>
    </button>
  )
}

function PalettesContent() {
  const palette = useThemeStore((s) => s.palette)
  const setPalette = useThemeStore((s) => s.setPalette)
  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {PALETTES.map((p) => (
        <PaletteCard
          key={p.id}
          id={p.id}
          name={p.name}
          description={p.description}
          preview={p.preview}
          isActive={p.id === palette}
          onActivate={() => setPalette(p.id)}
        />
      ))}
    </div>
  )
}

const section: ShowcaseSection = {
  id: 'temas',
  title: 'Temas: as 10 paletas × claro/escuro',
  group: 'Tema',
  order: 5,
  description:
    'Todas as paletas do @nomad/ui. Clique numa para aplicá-la ao app inteiro — a vitrine, a barra Nomad e todo o restante respondem na hora.',
  render: () => (
    <DemoGrid>
      <Demo title="Paletas">
        <PalettesContent />
      </Demo>

      <Demo title="Como o tema entra no app">
        <Card className="w-full">
          <Card.Header className="flex-col items-stretch">
            <p className="text-body font-semibold text-text-primary">1 import</p>
            <p className="text-caption text-text-tertiary">
              O CSS do app importa o tema uma vez; as classes Tailwind usadas pelo pacote vêm do
              @source do próprio theme.css.
            </p>
          </Card.Header>
          <Card.Body>
            <pre className="overflow-x-auto rounded-md border border-border bg-surface-body p-3 text-caption">
              <code>{`@import '@nomad/ui/theme.css';`}</code>
            </pre>
          </Card.Body>
        </Card>
      </Demo>
    </DemoGrid>
  ),
}

export default section