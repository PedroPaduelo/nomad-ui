/**
 * `TopBar` nunca pode derrubar a barra inteira por um `model` incompleto.
 *
 * Origem: `[LB] [TOPBAR-PARITY-03]` (`6be96af1`) — no LB a barra "saía vazia"
 * e o app inteiro ficava sem navegação. **A causa não era o conflito de slots**
 * que o `.d.ts` descreve (o ramo do `model` ignora `org`/`apps`/`account`, e há
 * teste de compatibilidade para isso): era um **crash de render**. O
 * `TopBarModelBar` desreferenciava `model.account.manageAccountHref`, e o shape
 * legado que o backend devolvia (`profile` + `accountUrl`, sem `account`)
 * chega em runtime sem passar pelo `topBarModelSchema`. Em React, a exceção
 * derruba a subárvore — a barra inteira desaparece.
 *
 * Estes testes fixam a degradação: peça da conta sem "Gerenciar" e a grade e a
 * empresa de pé, para qualquer campo obrigatório que faltar no `model`.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { TopBar, topBarModelSchema, type TopBarModel } from '../index'

const VALID: TopBarModel = topBarModelSchema.parse({
  apps: [{ id: '1', slug: 'loadbalance', name: 'Loadbalance', iconUrl: null, launchUrl: '/x' }],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
  ],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'Proprietário',
    manageAccountHref: 'https://conta.example/account',
  },
})

/** O shape que `GET /api/oidc/topbar` devolveu no LB: 5 campos, sem `account`. */
const LEGACY_RAW = {
  apps: [{ id: '1', slug: 'loadbalance', name: 'Loadbalance', iconUrl: null, launchUrl: '/x' }],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
  ],
  accountUrl: 'https://conta.example/account',
  profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
}

const GERENCIAR = /Gerenciar sua Conta/i

describe('TopBar: `model` incompleto não derruba a barra (LB 6be96af1)', () => {
  it('o ramo do `model` ignora os slots (o `.d.ts` está certo)', () => {
    render(
      <TopBar
        model={VALID}
        org={<div data-testid="slot-org" />}
        apps={<div data-testid="slot-apps" />}
        account={<div data-testid="slot-account" />}
      />,
    )
    expect(screen.getByRole('button', { name: /aplicativos/i })).not.toBeNull()
    expect(screen.queryByTestId('slot-org')).toBeNull()
    expect(screen.queryByTestId('slot-apps')).toBeNull()
    expect(screen.queryByTestId('slot-account')).toBeNull()
  })

  it('model legado cru (sem `account`) não derruba a barra', async () => {
    // @ts-expect-error: reproduz o app que passa o JSON do backend sem validar
    const { container } = render(<TopBar model={LEGACY_RAW} />)
    // A barra continua de pé…
    expect(container.querySelector('header.ntb')).not.toBeNull()
    expect(screen.getByRole('button', { name: /aplicativos/i })).not.toBeNull()
    // …e a peça da conta degrada em vez de sumir com tudo.
    expect(screen.getByRole('button', { name: /conta de/i })).not.toBeNull()
    // Sem `manageAccountHref` não há item "Gerenciar" (é link, não ação) — e o
    // menu ABRE, que é o que prova que a peça degradou em vez de sumir.
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /conta de/i }))
    const panel = await screen.findByRole('menu', { name: /conta/i })
    expect(within(panel).queryByRole('menuitem', { name: GERENCIAR })).toBeNull()
  })

  it('com `account` completo "Gerenciar" está no menu da conta', async () => {
    const user = userEvent.setup()
    render(<TopBar model={VALID} />)
    await user.click(screen.getByRole('button', { name: /conta de ana/i }))
    const panel = await screen.findByRole('menu', { name: /conta/i })
    // Contraprova do teste anterior: aqui o item EXISTE. Sem abrir o painel a
    // asserção passaria com o item ausente — foi o que o revisor pegou.
    expect(within(panel).getByRole('menuitem', { name: GERENCIAR })).not.toBeNull()
  })

  // A partir daqui: os mesmos campos que o `account`, pelo mesmo motivo. O
  // `AppSwitcher` já fazia `apps ?? []`; `organization`/`organizations` eram
  // os dois que faltavam (achado do revisor, confirmado por reprodução).
  it.each([
    ['organization', { organization: undefined }],
    ['organizations', { organizations: undefined }],
    ['apps', { apps: undefined }],
  ])('model sem `%s` não derruba a barra', (_campo, patch) => {
    const model = { ...VALID, ...patch } as unknown as TopBarModel
    const { container } = render(<TopBar model={model} />)
    expect(container.querySelector('header.ntb')).not.toBeNull()
    // A barra continua navegável pela conta.
    expect(screen.getByRole('button', { name: /conta de/i })).not.toBeNull()
  })

  it('model sem `organizations` não mostra "Trocar de empresa"', async () => {
    const user = userEvent.setup()
    const model = { ...VALID, organizations: undefined } as unknown as TopBarModel
    render(<TopBar model={model} />)
    await user.click(screen.getByRole('button', { name: /conta de ana/i }))
    await waitFor(async () => {
      const panel = await screen.findByRole('menu', { name: /conta/i })
      // O item depende de `organizations.length > 1`; sem lista, não aparece.
      expect(within(panel).queryByRole('menuitem', { name: /trocar de empresa/i })).toBeNull()
    })
  })

  it('sem `profile` o rótulo acessível da conta não fica vazio', () => {
    const model = {
      ...VALID,
      account: { ...VALID.account, profile: { name: null, email: null, picture: null } },
    } as unknown as TopBarModel
    render(<TopBar model={model} />)
    // Antes virava "Conta de " (espaço no fim) — leitor de tela não anuncia nada.
    expect(screen.getByRole('button', { name: /conta de usuário/i })).not.toBeNull()
  })
})
