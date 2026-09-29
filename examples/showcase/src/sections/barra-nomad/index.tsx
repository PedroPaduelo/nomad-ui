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
import { Demo } from '../../Demo'
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
    iconUrl: null,
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
  id: 'barra-nomad',
  title: 'Barra Nomad (Padrão SSO §10)',
  group: 'Barra Nomad',
  order: 10,
  description:
    'A barra superior padrão Nomad: TopBar, seletor de empresa, grade de apps e menu da conta. O painel aberto usa a flag inlinePanel do Popover para caber no cartão, sem portal.',
  render: () => (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Card 1: Barra Nomad modo padrão, contida no cartão */}
      <Demo title="Barra fechada (modo padrão)">
        <div
          className="relative w-full max-w-full overflow-hidden"
          data-testid="topbar-closed"
        >
          <BarPlayground product="Loadbalance" />
        </div>
      </Demo>

      {/* Card 2: Texto curto + grade de 4 cartões lado a lado com painéis abertos */}
      <Demo title="Painéis abertos em linha (sem portal, via inlinePanel)">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-body text-text-secondary">
            Cada painel renderiza em linha, dentro do próprio cartão. Em produção cada um abre
            pelo seu gatilho no portal normal.
          </p>
          <div className="grid min-h-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InlinePanelCard title="Barra Nomad" subtitle="modo padrão">
              <BarPlayground product="Loadbalance" />
            </InlinePanelCard>
            <InlinePanelCard title="Seletor de empresa" subtitle="OrgSwitcher · inlinePanel">
              <PopoverExample />
            </InlinePanelCard>
            <InlinePanelCard title="Grade de apps" subtitle="AppSwitcher · inlinePanel">
              <AppsExample />
            </InlinePanelCard>
            <InlinePanelCard title="Menu da conta" subtitle="AccountMenu · inlinePanel">
              <AccountExample />
            </InlinePanelCard>
          </div>
        </div>
      </Demo>
    </div>
  ),
}

export default section

/** Cartão com altura fixa para os painéis inline. Cada painel ocupa o cartão inteiro. */
function InlinePanelCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      className="relative flex min-h-72 min-w-0 flex-col gap-2 overflow-hidden rounded-md border border-border bg-surface-base p-3"
      style={{ maxWidth: '100%' }}
    >
      <p className="text-caption font-semibold text-text-tertiary">{title}</p>
      <p className="text-caption text-text-secondary">{subtitle}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

function PopoverExample() {
  // Mantém o painel sempre aberto: a vitrine quer mostrar o estado expandido.
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-surface-base p-3">
      <OrgSwitcher
        organizations={DATA.organizations}
        currentOrgId={DATA.organization.id}
        onSwitch={() => {}}
        open
        inlinePanel
        onOpenChange={() => {}}
      />
    </div>
  )
}

function AppsExample() {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-surface-base p-3">
      <AppSwitcher
        apps={APPS}
        orgId={DATA.organization.id}
        currentAppSlug="motor"
        accountUrl={DATA.accountUrl}
        open
        inlinePanel
        onOpenChange={() => {}}
      />
    </div>
  )
}

function AccountExample() {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-surface-base p-3">
      <AccountMenu
        user={{ name: 'Ana Souza', email: 'ana@nomad.dev', picture: null }}
        organization={{ name: 'Nomad Labs', role: 'owner' }}
        manageAccountHref={DATA.accountUrl}
        onSwitchOrganization={() => {}}
        onSignOut={() => {}}
        width={240}
        open
        inlinePanel
        onOpenChange={() => {}}
      />
    </div>
  )
}
