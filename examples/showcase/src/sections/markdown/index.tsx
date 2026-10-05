import { Markdown } from '@nomad/ui/markdown'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

const SECTION_MD = `# Cabeçalho H1

Um parágrafo com **negrito**, *itálico* e \`código inline\`.

## Lista

- Item um
- Item dois
- Item três

## Citação

> A barra Nomad é o mesmo componente em todos os apps.

\`\`\`ts
import { Markdown } from '@nomad/ui'
<Markdown source={md} />
\`\`\`

| Coluna A | Coluna B |
| -------- | -------- |
| linha 1  | valor    |
| linha 2  | valor    |
`

const LINK_MD = `## Links

- [@nomad/ui no GitHub](https://github.com/PedroPaduelo/nomad-ui)
- [Padrão Frontend Nomad v1](#)`

const section: ShowcaseSection = {
  id: 'markdown',
  title: 'Markdown (texto longo, listas, tabela, código)',
  group: 'Exibição',
  order: 30,
  description:
    'O Markdown do pacote: render seguro, mesmo tema do app (paleta × claro/escuro).',
  render: () => (
    <DemoGrid>
      <Demo title="Bloco rico">
        <Markdown
          source={SECTION_MD}
          className="max-w-3xl rounded-md border border-border bg-surface-base p-4 text-body"
        />
      </Demo>
      <Demo title="Links e navegação">
        <Markdown
          source={LINK_MD}
          className="max-w-md rounded-md border border-border bg-surface-base p-4 text-body"
        />
      </Demo>
    </DemoGrid>
  ),
}

export default section