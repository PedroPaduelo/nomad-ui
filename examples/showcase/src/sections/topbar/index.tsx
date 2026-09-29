import { useState } from 'react'
import { Input } from '@nomad/ui'
import {
  AccountMenu,
  AppSwitcher,
  OrgSwitcher,
  TopBar,
  TopBarBrand,
  type LauncherApp,
  type TopbarOrganization,
  type TopbarData,
} from '@nomad/ui/topbar'
import { Demo, DemoGrid } from '../../Demo'
import type { ShowcaseSection } from '../../types'

/** Marca Nommand igual à da Conta (o kit ainda não exporta a marca). */
function NommandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Nommand">
      <rect width={32} height={32} rx="8" fill="var(--mark-bg)" />
      <g
        fill="none"
        stroke="var(--mark-on)"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.5 22.5V9.5l11 13v-13" />
      </g>
    </svg>
  )
}

/* Dados falsos: iguais aos da Conta e dos testes da barra (Ana Souza, Nomad Labs). */
const ORGS: TopbarOrganization[] = [
  { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
  { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
  { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
]

const APPS: LauncherApp[] = [
  {
    id: '1',
    slug: 'motor',
    name: 'Motor',
    iconUrl: null,
    launchUrl: 'https://motor.example/auth/sso',
    description: 'Automação',
  },
  {
    id: '2',
    slug: 'loadbalance',
    name: 'Loadbalance',
    iconUrl: 'https://conta.example/api/apps/loadbalance/icon',
    launchUrl: 'https://lb.example/auth/sso',
    description: 'Proxy',
  },
  {
    id: '3',
    slug: 'agent-package',
    name: 'Agent Package',
    iconUrl: null,
    launchUrl: 'https://ap.example/auth/sso',
    description: 'Agentes',
  },
  {
    id: '4',
    slug: 'conta',
    name: 'Conta',
    iconUrl: null,
    launchUrl: 'https://conta.example/auth/sso',
    description: 'SSO',
  },
]

const PROFILE = { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null as string | null }

const DATA: TopbarData = {
  profile: PROFILE,
  organization: { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner' },
  organizations: ORGS.map((o) => ({
    ...o,
    slug: o.slug ?? '',
    role: o.role ?? 'member',
    canOpenApp: o.canOpenApp ?? true,
  })),
  apps: APPS,
  accountUrl: 'https://conta.example/',
}

/** A peça funcionando: chips, grade e menu da conta todos abertos e com dados falsos. */
function BarPlayground({ product }: { product: string }) {
  const [orgOpen, setOrgOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const noop = () => {}
  return (
    <TopBar
      brand={
        <TopBarBrand
          logo={<NommandMark />}
          name="Nommand"
          product={product}
          label={`Nommand ${product}, início`}
        />
      }
      org={
        <OrgSwitcher
          organizations={DATA.organizations}
          currentOrgId={DATA.organization.id}
          onSwitch={noop}
          open={orgOpen}
          onOpenChange={setOrgOpen}
        />
      }
      search={<Input aria-label="Buscar" placeholder="Buscar ou ir para…  Ctrl K" />}
      actions={
        <button
          type="button"
          className="ntb-icon-btn"
          aria-label="Ação de exemplo"
          title="Ação de exemplo"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
      }
      apps={
        <AppSwitcher
          apps={APPS}
          orgId={DATA.organization.id}
          currentAppSlug={product.toLowerCase().replace(/\s+/g, '-')}
          accountUrl={DATA.accountUrl}
          open={appsOpen}
          onOpenChange={setAppsOpen}
        />
      }
      account={
        <AccountMenu
          user={PROFILE}
          organization={DATA.organization}
          manageAccountHref={DATA.accountUrl}
          onSwitchOrganization={() => {
            setAccountOpen(false)
            setOrgOpen(true)
          }}
          onSignOut={noop}
          open={accountOpen}
          onOpenChange={setAccountOpen}
        />
      }
    />
  )
}

const section: ShowcaseSection = {
  id: 'topbar',
  title: 'Barra Nomad (Padrão SSO §10)',
  group: 'Barra Nomad',
  order: 10,
  description: (
    <>
      A barra superior padrão Nomad (<code>@nomad/ui/topbar</code>): <code>TopBar</code>, seletor de
      empresa, grade de apps e menu da conta. A barra lê o tema do <code>@nomad/ui</code>
      (paleta × claro/escuro) — em qualquer paleta, com o mesmo dado, ela fica igual à da Conta
      Nommand. Troque a paleta e o modo na barra de cima para ver.
    </>
  ),
  render: () => (
    <DemoGrid>
      <Demo title="Barra fechada (modo padrão)">
        <BarPlayground product="Loadbalance" />
      </Demo>
      <Demo title="Barra com os três painéis abertos (forçados)">
        <div className="flex flex-col gap-4">
          <p className="text-caption text-text-secondary">
            A vitrine abre cada painel via <code>open</code>/<code>onOpenChange</code> para você ver
            os três estados juntos. Em uso normal cada um abre pelo próprio gatilho.
          </p>
          <BarPlayground product="Conta" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-caption font-semibold text-text-tertiary">
                Seletor de empresa
              </p>
              <PopoverExample />
            </div>
            <div>
              <p className="mb-2 text-caption font-semibold text-text-tertiary">Grade de apps</p>
              <AppsExample />
            </div>
            <div>
              <p className="mb-2 text-caption font-semibold text-text-tertiary">Menu da conta</p>
              <AccountExample />
            </div>
          </div>
        </div>
      </Demo>
    </DemoGrid>
  ),
}

export default section

function PopoverExample() {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-md border border-border bg-surface-base p-3">
      <OrgSwitcher
        organizations={DATA.organizations}
        currentOrgId={DATA.organization.id}
        onSwitch={() => {}}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}

function AppsExample() {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-md border border-border bg-surface-base p-3">
      <AppSwitcher
        apps={APPS}
        orgId={DATA.organization.id}
        currentAppSlug="motor"
        accountUrl={DATA.accountUrl}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}

function AccountExample() {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-md border border-border bg-surface-base p-3">
      <AccountMenu
        user={PROFILE}
        organization={DATA.organization}
        manageAccountHref={DATA.accountUrl}
        onSwitchOrganization={() => {}}
        onSignOut={() => {}}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
