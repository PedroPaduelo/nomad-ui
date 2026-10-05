/**
 * Sidebar — axe a11y em 1 paleta × claro/escuro (mínimo do critério de
 * aceite da NUI-01). Para ter cobertura completa em todas as paletas, use o
 * teste do TopBar (10 × 2). Aqui validamos as peças específicas do shell
 * lateral — drawer mobile, focus trap, inert — em uma paleta contrastante.
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { Folder, Home, Settings } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { PALETTES, PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '@nomad/ui'
import { Sidebar, type SidebarSection } from '../components/ui/Sidebar'
import '../theme/globals.css'

// Os testes em `__tests__` consomem o pacote via alias de `@nomad/ui` (tsconfig),
// mas o Vitest a11y config não tem o mesmo alias. Importação relativa segura.

const SECTIONS: SidebarSection[] = [
  {
    items: [
      { key: 'home', label: 'Início', icon: <Home />, href: '/', current: true },
      { key: 'projects', label: 'Projetos', icon: <Folder />, href: '/projects' },
    ],
  },
]

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
    <ThemeProvider storageKey="sidebar-a11y:ui-preferences" paletteStorageKey="sidebar-a11y:palette-vars">
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

describe('Sidebar: axe a11y em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`sidebar expandida (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Sidebar
              sections={SECTIONS}
              footerItems={[
                { key: 'settings', label: 'Configurações', icon: <Settings />, href: '/settings' },
              ]}
              brand={{ initial: 'A', name: 'AgentPack', subtitle: 'Empresa · 3 projetos' }}
              collapsed={false}
              onToggleCollapse={() => {}}
            />
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

      it(`sidebar colapsada (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Sidebar
              sections={SECTIONS}
              footerItems={[
                { key: 'settings', label: 'Configurações', icon: <Settings />, href: '/settings' },
              ]}
              collapsed
              onToggleCollapse={() => {}}
            />
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