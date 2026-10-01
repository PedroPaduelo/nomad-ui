import { render } from '@testing-library/react'
import axe from 'axe-core'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import {
  PALETTES,
  PaletteProvider,
  ThemeProvider,
  applyPalette,
  configureThemeStorage,
  useThemeStore,
} from '@nomad/ui'
import {
  AccountMenu,
  AppSwitcher,
  OrgSwitcher,
  TopBar,
  TopBarBrand,
  type LauncherApp,
  type TopbarData,
  topBarModelSchema,
} from '@nomad/ui/topbar'
import { NommandMark } from './fixtures'
import '../topbar/topbar.css'

const DATA: TopbarData = {
  profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
  organization: { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
    { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
  ],
  apps: [
    {
      id: '1',
      slug: 'motor',
      name: 'Motor',
      iconUrl: null,
      launchUrl: 'https://motor.example/auth/sso',
      description: null,
    },
    {
      id: '2',
      slug: 'loadbalance',
      name: 'Loadbalance',
      iconUrl: null,
      launchUrl: 'https://lb.example/auth/sso',
      description: null,
    },
    {
      id: '3',
      slug: 'agent-package',
      name: 'Agent Package',
      iconUrl: null,
      launchUrl: 'https://ap.example/auth/sso',
      description: null,
    },
  ] satisfies LauncherApp[],
  accountUrl: 'https://conta.example/',
}

configureThemeStorage({
  storageKey: 'topbar-a11y:ui-preferences',
  paletteStorageKey: 'topbar-a11y:palette-vars',
})

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
      storageKey="topbar-a11y:ui-preferences"
      paletteStorageKey="topbar-a11y:palette-vars"
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

function Bar() {
  return (
    <TopBar
      brand={
        <TopBarBrand
          logo={<NommandMark />}
          name="Nommand"
          product="Vitrine"
          label="Nommand Vitrine, início"
        />
      }
      org={
        <OrgSwitcher
          organizations={DATA.organizations}
          currentOrgId={DATA.organization.id}
          onSwitch={() => {}}
          open={false}
          onOpenChange={() => {}}
        />
      }
      search={<input aria-label="Buscar" placeholder="Buscar" />}
      apps={
        <AppSwitcher
          apps={DATA.apps}
          orgId={DATA.organization.id}
          currentAppSlug="motor"
          accountUrl={DATA.accountUrl}
          open={false}
          onOpenChange={() => {}}
        />
      }
      account={
        <AccountMenu
          user={DATA.profile}
          organization={DATA.organization}
          manageAccountHref={DATA.accountUrl}
          onSwitchOrganization={() => {}}
          onSignOut={() => {}}
          open={false}
          onOpenChange={() => {}}
        />
      }
    />
  )
}

describe('@nomad/ui/topbar: axe em todas as paletas × claro/escuro', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`barra fechada (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <Bar />
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

/**
 * `launcherLinks` como RODAPÉ de links da grade, não como tiles (PKG-FIXES
 * `25d586a6`, o que o dono viu no motor: "Todos os aplicativos" e "Status dos
 * serviços" pareciam apps). No Chromium, com o `topbar.css` do pacote: os links
 * ficam numa LINHA ABAIXO do grid (topo maior que o dos tiles, fonte menor) e o
 * contraste passa no axe em todas as paletas × claro/escuro.
 */
const MODEL = topBarModelSchema.parse({
  apps: DATA.apps,
  organization: DATA.organization,
  organizations: DATA.organizations,
  account: {
    profile: DATA.profile,
    role: 'owner',
    manageAccountHref: DATA.accountUrl,
  },
  launcherLinks: [
    { id: 'all-apps', label: 'Todos os aplicativos', href: 'https://conta.example/apps' },
    { id: 'status', label: 'Status dos serviços', href: 'https://status.example' },
  ],
  helpLinks: [{ id: 'help', label: 'Ajuda', href: 'https://conta.example/help' }],
  createOrgUrl: 'https://conta.example/new',
})

function ModelBar() {
  return (
    <TopBar
      model={MODEL}
      brand={<TopBarBrand logo={<NommandMark />} name="Nommand" product="Motor" />}
      currentAppSlug="motor"
      onSwitchOrg={() => {}}
      onSignOut={() => {}}
    />
  )
}

describe('@nomad/ui/topbar: launcherLinks no rodapé da grade (Chromium, paletas × claro/escuro)', () => {
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`rodapé da grade (${p.id} ${mode})`, async () => {
        const { container, unmount } = render(
          <Setup paletteId={p.id} mode={mode}>
            <ModelBar />
          </Setup>,
        )
        const trigger = container.querySelector<HTMLElement>('[aria-label="Aplicativos Nommand"]')!
        const { default: userEvent } = await import('@testing-library/user-event')
        const user = userEvent.setup()
        await user.click(trigger)
        const dialog = container.querySelector<HTMLElement>(
          '[role="dialog"][aria-label="Aplicativos"]',
        )!
        const grid = dialog.querySelector<HTMLElement>('.ntb-grid')!
        const foot = dialog.querySelector<HTMLElement>('.ntb-foot-links')!
        expect(foot, `${p.id} ${mode}: rodapé ausente`).not.toBeNull()

        // 1) grid SÓ com os apps
        expect(
          Array.from(grid.querySelectorAll('.ntb-tile__text')).map((t) => t.textContent),
        ).toEqual(DATA.apps.map((a) => a.name))
        // 2) rodapé com os launcherLinks + "Gerenciar", na ordem da Conta
        expect(
          Array.from(foot.querySelectorAll('.ntb-foot-link')).map((a) => a.textContent),
        ).toEqual(['Todos os aplicativos', 'Status dos serviços', 'Gerenciar sua Conta Nommand'])
        // 3) geometria: o rodapé é uma linha ABAIXO do grid (topo maior) e com fonte
        // menor que a dos tiles — visual de link, não de app.
        const gridRect = grid.getBoundingClientRect()
        const footRect = foot.getBoundingClientRect()
        expect(footRect.top, `${p.id} ${mode}: rodapé não está abaixo do grid`).toBeGreaterThan(
          gridRect.bottom - 1,
        )
        const tileFont = parseFloat(
          getComputedStyle(grid.querySelector('.ntb-tile__text')!).fontSize,
        )
        const footFont = parseFloat(getComputedStyle(foot).fontSize)
        expect(footFont).toBeLessThan(tileFont)
        // 4) contraste do rodapé no axe
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
