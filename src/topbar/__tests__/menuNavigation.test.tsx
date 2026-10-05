/**
 * Item de menu com `href`: o clique normal **não** pode ter o default
 * prevenido quando não há callback para executar — o link tem que navegar.
 * O `preventDefault()` só acontece com `onSelect`/`onNavigate` (ação do app
 * em vez de sair da página).
 *
 * Regressão (PKG-FIXES 4fa8bd30, item #1 do revisor): a v1.6.0 passou a
 * prevenir **incondicionalmente** ao adicionar o `onNavigate` — "Gerenciar sua
 * sua Conta Nommand", todo `accountLinks` e todo `helpLinks` ficaram com o
 * clique prevenido e sem função (inclusive no caminho legado do `AccountMenu`).
 *
 * O teste dispara o clique e lê `event.defaultPrevented` DEPOIS do dispatch
 * (o handler do React roda na fase de bubble na raiz, então preventable já
 * está resolvido quando `dispatchEvent` retorna). Mutar o código de volta
 * para o `preventDefault()` incondicional faz estes testes falharem.
 */
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AccountMenu, TopBarModelBar, topBarModelSchema } from '../index'

const MODEL = topBarModelSchema.parse({
  apps: [{ id: '1', slug: 'motor', name: 'Motor', iconUrl: null, launchUrl: 'https://m.example' }],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
  ],
  account: {
    profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
    role: 'owner',
    manageAccountHref: 'https://conta.example/account',
  },
  accountLinks: [{ id: 'security', label: 'Segurança', href: 'https://conta.example/security' }],
  helpLinks: [
    { id: 'help', label: 'Ajuda', href: 'https://conta.example/help' },
    { id: 'terms', label: 'Termos', href: 'https://conta.example/terms' },
  ],
})

/** Dispara um clique "normal" (button 0) e devolve se o default foi prevenido. */
function clickPrevented(el: HTMLElement): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
  el.dispatchEvent(event)
  return event.defaultPrevented
}

function renderModelBar() {
  return render(
    <div className="ntb ntb-bar">
      <TopBarModelBar model={MODEL} onSignOut={() => {}} organize="trailing" />
    </div>,
  )
}

describe('item de menu com href sem callback: o clique NÃO é prevenido (regressão da v1.6.0)', () => {
  it('"Gerenciar sua Conta Nommand" e os accountLinks navegam (TopBar model)', async () => {
    const user = userEvent.setup()
    renderModelBar()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const dialog = screen.getByRole('dialog', { name: 'Sua conta' })
    const gerenciar = within(dialog).getByRole('menuitem', { name: 'Gerenciar sua Conta Nommand' })
    expect(gerenciar).toHaveAttribute('href', 'https://conta.example/account')
    expect(clickPrevented(gerenciar), '"Gerenciar" não pode ter o clique prevenido').toBe(false)

    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const security = within(screen.getByRole('dialog', { name: 'Sua conta' })).getByRole(
      'menuitem',
      {
        name: 'Segurança',
      },
    )
    expect(clickPrevented(security), 'accountLink não pode ter o clique prevenido').toBe(false)
  })

  it('os helpLinks do menu Ajuda navegam', async () => {
    const user = userEvent.setup()
    renderModelBar()
    await user.click(screen.getByRole('button', { name: 'Ajuda' }))
    const menu = screen.getByRole('menu', { name: 'Ajuda' })
    expect(clickPrevented(within(menu).getByRole('menuitem', { name: 'Ajuda' }))).toBe(false)
    expect(clickPrevented(within(menu).getByRole('menuitem', { name: 'Termos' }))).toBe(false)
  })

  it('"Gerenciar sua Conta Nommand" no caminho legado (AccountMenu com só href) navega', async () => {
    const user = userEvent.setup()
    render(
      <div className="ntb ntb-bar">
        <AccountMenu
          user={{ name: 'Ana Souza' }}
          organization={{ name: 'Nommad Labs', role: 'owner' }}
          manageAccountHref="https://conta.example/account"
          onSignOut={() => {}}
        />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const item = within(screen.getByRole('dialog', { name: 'Sua conta' })).getByRole('menuitem', {
      name: 'Gerenciar sua Conta Nommand',
    })
    expect(clickPrevented(item), 'caminho legado não pode ter o clique prevenido').toBe(false)
  })

  it('com onSelect: o clique normal é prevenido e executa a ação (não navega)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <div className="ntb ntb-bar">
        <AccountMenu
          user={{ name: 'Ana Souza' }}
          manageAccountHref="https://conta.example/account"
          onManageAccount={onSelect}
          onSignOut={() => {}}
        />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const item = within(screen.getByRole('dialog', { name: 'Sua conta' })).getByRole('menuitem', {
      name: 'Gerenciar sua Conta Nommand',
    })
    expect(clickPrevented(item), 'com onSelect o clique deve ser prevenido').toBe(true)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
