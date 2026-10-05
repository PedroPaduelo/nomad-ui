import type { ShowcaseSection } from './types'

/**
 * Registro auto-descoberto: toda `sections/<id>/index.tsx` com `export default`
 * de uma `ShowcaseSection` aparece na vitrine, sem editar este arquivo.
 */
const modules = import.meta.glob<{ default: ShowcaseSection }>('./sections/*/index.tsx', {
  eager: true,
})

/** Ordem dos grupos no menu; grupo desconhecido vai para o fim. */
export const GROUP_ORDER = [
  'Tema',
  'Ações',
  'Formulário',
  'Exibição',
  'Estados',
  'Sobreposições',
  'Navegação',
  'Layout',
  'Barra Nomad',
]

function groupRank(group: string): number {
  const i = GROUP_ORDER.indexOf(group)
  return i === -1 ? GROUP_ORDER.length : i
}

export const sections: ShowcaseSection[] = Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)
  .sort(
    (a, b) =>
      groupRank(a.group) - groupRank(b.group) ||
      (a.order ?? 100) - (b.order ?? 100) ||
      a.title.localeCompare(b.title),
  )
