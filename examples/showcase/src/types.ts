import type { ReactNode } from 'react'

/**
 * Uma seção da vitrine. Cada pasta `src/sections/<id>/index.tsx` exporta
 * `default` com este formato e entra sozinha no menu (registry.ts usa
 * `import.meta.glob`): uma lane nova só cria a própria pasta.
 */
export interface ShowcaseSection {
  /** Âncora e parâmetro `?section=` (igual ao nome da pasta). */
  id: string
  title: string
  description?: ReactNode
  /** Grupo no menu lateral (ex.: 'Tema', 'Ações', 'Sobreposições', 'Barra Nomad'). */
  group: string
  /** Ordem dentro do menu (menor primeiro). Padrão 100. */
  order?: number
  render: () => ReactNode
}
