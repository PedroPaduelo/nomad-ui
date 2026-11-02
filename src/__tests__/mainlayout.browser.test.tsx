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

describe('MainLayout: axe a11y em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`shell completo (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
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
        expect(problems, `${p.id} ${mode}: ${problems.join('; ')}`).toEqual([])
      })

      it(`shell sem breadcrumb (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
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
        expect(problems, `${p.id} ${mode}: ${problems.join('; ')}`).toEqual([])
      })
    }
  }
})

describe('MainLayout: topBar e asides', () => {
  it('topBar substitui o Header do kit', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <MainLayout
          sidebar={sidebarProps}
          sidebarCollapsed={false}
          onToggleSidebar={() => {}}
          topBar={<header data-testid="barra-do-app">Barra do app</header>}
        >
          <p>Conteúdo de exemplo.</p>
        </MainLayout>
      </Setup>,
    )
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelector('[data-testid="barra-do-app"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Buscar ou ir para')
    unmount()
  })

  it('só um aside fica exposto à árvore de acessibilidade', () => {
    const { container, unmount } = render(
      <Setup paletteId={PALETTES[0].id} mode="light">
        <MainLayout sidebar={sidebarProps} sidebarCollapsed={false} onToggleSidebar={() => {}}>
          <p>Conteúdo de exemplo.</p>
        </MainLayout>
      </Setup>,
    )
    expect(container.querySelectorAll('aside')).toHaveLength(2)
    expect(container.querySelectorAll('aside[aria-hidden="true"]')).toHaveLength(1)
    unmount()
  })
})
