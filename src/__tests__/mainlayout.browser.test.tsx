/**
 * MainLayout — axe a11y em 1 paleta × claro/escuro (mínimo do critério de
 * aceite da NUI-01).
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { Folder, Home, Settings } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { PALETTES, PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '@nomad/ui'
import { MainLayout } from '../components/ui/MainLayout'
import '../theme/globals.css'

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
    <ThemeProvider
      storageKey="mainlayout-a11y:ui-preferences"
      paletteStorageKey="mainlayout-a11y:palette-vars"
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

const sidebarProps = {
  sections: [
    {
      items: [
        { key: 'home', label: 'Início', icon: <Home />, href: '/', current: true },
        { key: 'projects', label: 'Projetos', icon: <Folder />, href: '/projects' },
      ],
    },
  ],
  footerItems: [
    { key: 'settings', label: 'Configurações', icon: <Settings />, href: '/settings' },
  ],
  brand: { initial: 'A', name: 'AgentPack', subtitle: 'Empresa · 3 projetos' },
}

describe('MainLayout: axe a11y em 1 paleta × claro/escuro', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`shell completo (${mode})`, async () => {
      const { container, unmount } = render(
        <Setup paletteId="slate-blue-gold" mode={mode}>
          <MainLayout
            sidebar={sidebarProps}
            sidebarCollapsed={false}
            onToggleSidebar={() => {}}
            breadcrumb={[
              { label: 'Projetos', href: '/projects' },
              { label: 'AgentPack', href: '/projects/abc' },
              { label: 'Memórias' },
            ]}
          >
            <p>Conteúdo de exemplo.</p>
          </MainLayout>
        </Setup>,
      )
      const r = await axe.run(container, {
        rules: { 'color-contrast': { enabled: true }, region: { enabled: false } },
      })
      unmount()
      const problems = r.violations.flatMap((v) =>
        v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`),
      )
      expect(problems, `${mode}: ${problems.join('; ')}`).toEqual([])
    })

    it(`shell sem breadcrumb (${mode})`, async () => {
      const { container, unmount } = render(
        <Setup paletteId="slate-blue-gold" mode={mode}>
          <MainLayout
            sidebar={sidebarProps}
            sidebarCollapsed={false}
            onToggleSidebar={() => {}}
          >
            <p>Conteúdo de exemplo.</p>
          </MainLayout>
        </Setup>,
      )
      const r = await axe.run(container, {
        rules: { 'color-contrast': { enabled: true }, region: { enabled: false } },
      })
      unmount()
      const problems = r.violations.flatMap((v) =>
        v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`),
      )
      expect(problems, `${mode}: ${problems.join('; ')}`).toEqual([])
    })
  }
})