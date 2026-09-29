import { Plus, Trash2 } from 'lucide-react'
import { Button, IconButton, type ButtonSize, type ButtonVariant } from '@nomad/ui'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'danger',
  'agent',
  'agent-outline',
]
const SIZES: ButtonSize[] = ['sm', 'md', 'lg']

const section: ShowcaseSection = {
  id: 'botoes',
  title: 'Button e IconButton',
  group: 'Ações',
  order: 10,
  description: 'Variantes, tamanhos, ícone, carregando e desabilitado.',
  render: () => (
    <DemoGrid>
      <Demo title="Variantes">
        {VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </Demo>
      <Demo title="Tamanhos">
        {SIZES.map((s) => (
          <Button key={s} size={s} leadingIcon={<Plus className="h-4 w-4" />}>
            Tamanho {s}
          </Button>
        ))}
      </Demo>
      <Demo title="Estados">
        <Button loading>Salvando</Button>
        <Button disabled>Desabilitado</Button>
        <IconButton aria-label="Excluir" variant="danger">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </Demo>
    </DemoGrid>
  ),
}

export default section
