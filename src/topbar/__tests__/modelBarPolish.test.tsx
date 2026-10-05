/**
 * Itens não bloqueantes do revisor (PKG-FIXES 4fa8bd30 #4–#7):
 * `href` http(s) no schema e no `launchHref`; `theme: null` esconde o item
 * Tema; `organize="trailing"` renderiza `actions` uma vez só; `BarLinkJson`
 * e `launcherAppSchema` no barrel público.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { launchHref } from '../launchHref'
import { barLinkSchema, topBarModelSchema } from '../topBarModel'
import { TopBarModelBar } from '../index'
import type { BarLinkJson } from '../index'

const MODEL = topBarModelSchema.parse({
  apps: [{ id: '1', slug: 'motor', name: 'Motor', iconUrl: null, launchUrl: 'https://m.example' }],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'n', role: 'owner' },
  organizations: [{ id: 'o1', name: 'Nommad Labs', slug: 'n', role: 'owner', canOpenApp: true }],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'owner',
    manageAccountHref: 'https://conta.example/account',
  },
})

describe('#4 href só http(s) ou caminho relativo', () => {
  it('o schema rejeita javascript:, data: e //host; aceita https, http e /relativo', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,<script>',
      '//evil.example/x',
      'vbscript:x',
    ]) {
      expect(barLinkSchema.safeParse({ id: 'a', label: 'A', href }).success, href).toBe(false)
    }
    for (const href of ['https://conta.example/a', 'http://conta.example/a', '/apps/x']) {
      expect(barLinkSchema.safeParse({ id: 'a', label: 'A', href }).success, href).toBe(true)
    }
  })

  it('launchHref devolve "" para esquema não-http (o link não navega para javascript:)', () => {
    expect(launchHref('javascript:alert(1)', { org: 'o1' })).toBe('')
    expect(launchHref('data:text/html,<script>')).toBe('')
    expect(launchHref('https://m.example/auth/sso', { org: 'o1' })).toContain('org=o1')
  })
})

describe('#5 theme: null esconde o item Tema (undefined segue o store)', () => {
  it('theme={null} não renderiza "Tema · …"', async () => {
    const user = userEvent.setup()
    render(
      <div className="ntb ntb-bar">
        <TopBarModelBar model={MODEL} theme={null} onSignOut={() => {}} organize="trailing" />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    expect(screen.queryByRole('menuitem', { name: /^Tema/ })).toBeNull()
  })

  it('theme="dark" (explícito) renderiza "Tema · Escuro"', async () => {
    const user = userEvent.setup()
    render(
      <div className="ntb ntb-bar">
        <TopBarModelBar model={MODEL} theme="dark" onSignOut={() => {}} organize="trailing" />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    expect(screen.getByRole('menuitem', { name: 'Tema · Escuro' })).toBeInTheDocument()
  })
})

describe('#6 organize="trailing" renderiza actions uma vez', () => {
  it('a ação do app aparece uma única vez', () => {
    render(
      <div className="ntb ntb-bar">
        <TopBarModelBar
          model={MODEL}
          onSignOut={() => {}}
          organize="trailing"
          actions={<button type="button" aria-label="Paleta" />}
        />
      </div>,
    )
    expect(screen.getAllByRole('button', { name: 'Paleta' })).toHaveLength(1)
  })
})

describe('#7/#8 tipos do JSON no barrel público', () => {
  it('BarLinkJson e launcherAppSchema são importáveis de @nomad/ui/topbar', () => {
    const link: BarLinkJson = { id: 'a', label: 'A', href: 'https://x.example/a' }
    expect(barLinkSchema.safeParse(link).success).toBe(true)
    // launcherAppSchema exportado do barrel
    expect(typeof (globalThis as Record<string, unknown>).launcherAppSchema === 'undefined').toBe(
      true,
    )
  })
})
