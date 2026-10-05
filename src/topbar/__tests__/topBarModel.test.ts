/**
 * TopBarModel — Zod schema + tipos canônicos (Padrão SSO Nomad §10,
 * contrato decidido em 2026-09-30).
 *
 * A Conta devolve um JSON em `GET /api/oidc/topbar`; os apps validam com
 * `topBarModelSchema.parse(data)` antes de passar para `<TopBar model={...} />`.
 * Compatível com o `TopbarData` legado (v1.0.x).
 */
import { describe, expect, it } from 'vitest'

import {
  topBarModelSchema,
  type TopBarAccountOrg,
  type TopBarOrgOption,
} from '../topBarModel'

const ORG: TopBarAccountOrg = {
  id: 'org-1',
  name: 'Nommand Labs',
  slug: 'nommand-labs',
  role: 'Proprietário',
}

const ORGS: TopBarOrgOption[] = [
  { ...ORG, canOpenApp: true },
  { id: 'org-2', name: 'Serendiped', slug: 'serendiped', role: 'Admin', canOpenApp: true },
]

const APPS = [
  { id: 'app-load', slug: 'loadbalance', name: 'Loadbalance', launchUrl: 'https://lb.example' },
]

const ACCOUNT = {
  profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
  role: 'Proprietário',
  manageAccountHref: 'https://conta.example/account',
}

describe('topBarModelSchema', () => {
  it('aceita o shape canônico (v1.5.0) com apps, organizations, account completo', () => {
    const r = topBarModelSchema.parse({
      apps: APPS,
      organization: ORG,
      organizations: ORGS,
      account: ACCOUNT,
      launcherLinks: [{ id: 'all-apps', label: 'Todos os apps', href: 'https://conta.example/apps' }],
      createOrgUrl: 'https://conta.example/new',
      accountLinks: [{ id: 'security', label: 'Segurança', href: 'https://conta.example/sec' }],
      helpLinks: [{ id: 'help', label: 'Ajuda', href: 'https://conta.example/help' }],
    })
    expect(r.apps).toEqual(APPS)
    expect(r.organization).toEqual(ORG)
    expect(r.organizations).toEqual(ORGS)
    expect(r.account.manageAccountHref).toBe('https://conta.example/account')
    expect(r.launcherLinks?.[0].id).toBe('all-apps')
    expect(r.createOrgUrl).toBe('https://conta.example/new')
    expect(r.helpLinks?.[0].id).toBe('help')
  })

  it('aceita o shape legado (v1.0.x) com profile + accountUrl, montando account automaticamente', () => {
    const r = topBarModelSchema.parse({
      apps: APPS,
      organization: ORG,
      organizations: ORGS,
      profile: ACCOUNT.profile,
      accountUrl: 'https://conta.example/account',
    })
    expect(r.account.profile).toEqual(ACCOUNT.profile)
    expect(r.account.role).toBe(ORG.role)
    expect(r.account.manageAccountHref).toBe('https://conta.example/account')
  })

  it('lança se faltar account.manageAccountHref (e nenhum accountUrl legado)', () => {
    expect(() =>
      topBarModelSchema.parse({
        apps: APPS,
        organization: ORG,
        organizations: ORGS,
        account: { profile: ACCOUNT.profile, role: ORG.role, manageAccountHref: '' },
      }),
    ).toThrow(/account.manageAccountHref/)
  })

  it('launcherLinks, accountLinks e helpLinks são opcionais (vitrine mínima)', () => {
    const r = topBarModelSchema.parse({
      apps: APPS,
      organization: ORG,
      organizations: ORGS,
      account: ACCOUNT,
    })
    expect(r.launcherLinks).toBeUndefined()
    expect(r.accountLinks).toBeUndefined()
    expect(r.helpLinks).toBeUndefined()
  })

  it('rejeita launcherLink sem label', () => {
    expect(() =>
      topBarModelSchema.parse({
        apps: APPS,
        organization: ORG,
        organizations: ORGS,
        account: ACCOUNT,
        launcherLinks: [{ id: 'x', label: '', href: '/x' }],
      }),
    ).toThrow()
  })
})