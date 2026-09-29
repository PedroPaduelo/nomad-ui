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
} from '@nomad/ui/topbar'
import { NommandMark } from './fixtures'

const DATA: TopbarData = {
  profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
  organization: { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
    { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
  ],
  apps: [
    { id: '1', slug: 'motor', name: 'Motor', iconUrl: null, launchUrl: 'https://motor.example/auth/sso', description: null },
    { id: '2', slug: 'loadbalance', name: 'Loadbalance', iconUrl: null, launchUrl: 'https://lb.example/auth/sso', description: null },
    { id: '3', slug: 'agent-package', name: 'Agent Package', iconUrl: null, launchUrl: 'https://ap.example/auth/sso', description: null },
  ] satisfies LauncherApp[],
  accountUrl: 'https://conta.example/',
}

configureThemeStorage({
  storageKey: 'topbar-a11y:ui-preferences',
  paletteStorageKey: 'topbar-a11y:palette-vars',
})

function Setup({ paletteId, mode, children }: { paletteId: string; mode: 'light' | 'dark'; children: React.ReactNode }) {
  useEffect(() => {
    useThemeStore.setState({ palette: paletteId as never, theme: mode })
    const pal = PALETTES.find((p) => p.id === paletteId)
    if (pal) applyPalette(pal, mode)
  }, [paletteId, mode])
  return (
    <ThemeProvider storageKey="topbar-a11y:ui-preferences" paletteStorageKey="topbar-a11y:palette-vars">
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  )
}

function Bar() {
  return (
    <TopBar
      brand={<TopBarBrand logo={<NommandMark />} name="Nommand" product="Vitrine" label="Nommand Vitrine, início" />}
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
        render(
          <Setup paletteId={p.id} mode={mode}>
            <Bar />
          </Setup>,
        )
        const r = await axe.run(document.body, {
          rules: { 'color-contrast': { enabled: true }, region: { enabled: false } },
        })
        const problems = r.violations.flatMap((v) =>
          v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`),
        )
        expect(problems, `${p.id} ${mode}: ${problems.join('; ')}`).toEqual([])
      })
    }
  }
})