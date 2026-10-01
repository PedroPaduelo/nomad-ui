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
 * Estes testes fixam a degradação: peça da conta sem "Gerenciar" e sem avatar,
 * resto da barra de pé.
 */
import { render, screen } from '@testing-library/react'
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

  it('model legado cru (sem `account`) não derruba a barra', () => {
    // @ts-expect-error: reproduz o app que passa o JSON do backend sem validar
    const { container } = render(<TopBar model={LEGACY_RAW} />)
    // A barra continua de pé…
    expect(container.querySelector('header.ntb')).not.toBeNull()
    expect(screen.getByRole('button', { name: /aplicativos/i })).not.toBeNull()
    // …e a peça da conta degrada em vez de sumir com tudo.
    expect(screen.getByRole('button', { name: /conta/i })).not.toBeNull()
  })

  it('sem `account` o item "Gerenciar" não aparece (não há href para seguir)', () => {
    // @ts-expect-error: idem — shape legado cru
    render(<TopBar model={LEGACY_RAW} />)
    expect(screen.queryByRole('link', { name: /Gerenciar sua Conta/i })).toBeNull()
  })

  it('com `account` completo nada muda: "Gerenciar" segue no menu da conta', () => {
    render(<TopBar model={VALID} />)
    expect(screen.getByRole('button', { name: /conta/i })).not.toBeNull()
  })
})
