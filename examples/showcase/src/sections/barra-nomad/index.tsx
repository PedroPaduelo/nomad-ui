import { useState } from 'react'
import { Input } from '@nomad/ui'
import { TopBar, TopBarModelBrand, topBarModelSchema, type TopBarModel } from '@nomad/ui/topbar'
import { Demo } from '../../Demo'
import type { ShowcaseSection } from '../../types'

/**
 * Barra Nomad montada a partir do `TopBarModel` (Padrão SSO §10, v1.6.0).
 *
 * Este é o caminho que os apps usam: validam a resposta do backend com
 * `topBarModelSchema` e passam o objeto para `<TopBar model={…}>`. A vitrine
 * mostra as 3 peças (empresa, apps, conta) + Ajuda + notificações a partir de
 * um model de exemplo completo.
 */
const MODEL: TopBarModel = topBarModelSchema.parse({
  apps: [
    {
      id: '1',
      slug: 'loadbalance',
      name: 'Loadbalance',
      iconUrl: null,
      launchUrl: 'https://lb.example/auth/sso',
      description: 'Proxy',
    },
    {
      id: '2',
      slug: 'motor',
      name: 'Motor',
      iconUrl: null,
      launchUrl: 'https://motor.example/auth/sso',
      description: 'Automação',
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
  ],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'Proprietário' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
    {
      id: 'o3',
      name: 'Filial Sem App',
      slug: 'filial',
      role: 'member',
      canOpenApp: false,
    },
  ],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'Proprietário',
    manageAccountHref: 'https://conta.example/account',
  },
  launcherLinks: [
    { id: 'all-apps', label: 'Todos os aplicativos', href: 'https://conta.example/apps' },
    { id: 'status', label: 'Status dos serviços', href: 'https://status.example' },
  ],
  accountLinks: [
    { id: 'security', label: 'Segurança', href: 'https://conta.example/security' },
    { id: 'appearance', label: 'Aparência', href: 'https://conta.example/appearance' },
  ],
  helpLinks: [
    { id: 'help', label: 'Ajuda', href: 'https://conta.example/help' },
    { id: 'privacy', label: 'Privacidade', href: 'https://conta.example/privacy' },
    { id: 'terms', label: 'Termos', href: 'https://conta.example/terms' },
  ],
  createOrgUrl: 'https://conta.example/new',
  notifications: { unread: 3, href: 'https://conta.example/notifications' },
})

/** A barra como o app monta: um model, marca, busca e ações do app. */
function ModelBar({ product }: { product: string }) {
  const [signOuts, setSignOuts] = useState(0)
  const [switches, setSwitches] = useState<string[]>([])
  return (
    <div className="flex w-full flex-col gap-2">
      <TopBar
        model={MODEL}
        brand={<TopBarModelBrand product={product} />}
        currentAppSlug="loadbalance"
        search={<Input aria-label="Buscar" placeholder="Buscar ou ir para…  Ctrl K" />}
        actions={
          <button
            type="button"
            className="ntb-icon-btn"
            aria-label="Paleta (ação do app)"
            title="Paleta (ação do app)"
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
        onSwitchOrg={(orgId) => setSwitches((s) => [...s, orgId])}
        onSignOut={() => setSignOuts((n) => n + 1)}
      />
      <p className="text-caption text-text-tertiary">
        Trocar de empresa: {switches.length ? switches.join(', ') : '—'} · Sair: {signOuts}
      </p>
    </div>
  )
}

function LegacyBar() {
  const legacy = topBarModelSchema.parse({
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner' },
    organizations: [
      { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    ],
    apps: MODEL.apps,
    accountUrl: 'https://conta.example/',
  })
  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-md border border-border">
      <TopBar
        model={legacy}
        brand={<TopBarModelBrand product="Conta" />}
        onSignOut={() => {}}
      />
    </div>
  )
}

const section: ShowcaseSection = {
  id: 'barra-nomad',
  title: 'Barra Nomad a partir do TopBarModel (Padrão SSO §10)',
  group: 'Barra Nomad',
  order: 10,
  description:
    'A barra inteira vem de UM TopBarModel (validado com topBarModelSchema na borda): seletor de empresa, grade de apps, menu da conta, menu de ajuda e sino de notificações — sem item hard-coded por app. Abra os gatilhos para ver os painéis; o item "Tema · Escuro/Escuro" do menu da conta alterna o tema de verdade (ThemeProvider do pacote).',
  render: () => (
    <div className="flex min-w-0 flex-col gap-6">
      <Demo title="Barra fechada (modo padrão)">
        <div className="relative w-full max-w-full overflow-hidden">
          <ModelBar product="Loadbalance" />
        </div>
      </Demo>

      <Demo title="O TopBarModel de exemplo (o que a Conta devolve)">
        <pre className="max-h-96 w-full overflow-auto rounded-md border border-border bg-(--surface-code) p-4 font-mono text-caption leading-relaxed text-text-primary">
          {JSON.stringify(MODEL, null, 2)}
        </pre>
      </Demo>

      <Demo title="Model legado da v1.0.x (TopbarData) passa pelo mesmo schema">
        <div className="flex w-full flex-col gap-2">
          <p className="text-caption text-text-secondary">
            <code>{'topBarModelSchema.parse({ profile, organization, organizations, apps, accountUrl })'}</code>{' '}
            monta o <code>account</code> canônico — apps em produção não precisam trocar o payload do servidor.
          </p>
          <LegacyBar />
        </div>
      </Demo>
    </div>
  ),
}

export default section