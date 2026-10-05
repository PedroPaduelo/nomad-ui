/**
 * Header / Breadcrumb / HeaderUserMenu — axe a11y em 1 paleta × claro/escuro
 * (mínimo do critério de aceite da NUI-01).
 */
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { PALETTES, PaletteProvider, ThemeProvider, applyPalette, useThemeStore } from '@nomad/ui'
import { Header } from '../components/ui/Header'
import { Breadcrumb, type BreadcrumbItem } from '../components/ui/Breadcrumb'
import { HeaderUserMenu } from '../components/ui/HeaderUserMenu'
import '../theme/globals.css'

const BREADCRUMB_ITEMS: BreadcrumbItem[] = [
  { label: 'Projetos', href: '/projects' },
  { label: 'AgentPack', href: '/projects/abc' },
  { label: 'Memórias' },
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
    <ThemeProvider
      storageKey="header-a11y:ui-preferences"
      paletteStorageKey="header-a11y:palette-vars"
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

describe('Header / Breadcrumb / HeaderUserMenu: axe a11y em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`barra mínima (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Header onToggleSidebar={() => {}} />
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

      it(`trilha de navegação (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Breadcrumb items={BREADCRUMB_ITEMS} />
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

      it(`menu do usuário (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <HeaderUserMenu user={{ name: 'Ana Souza', email: 'ana@nomad.dev' }} />
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