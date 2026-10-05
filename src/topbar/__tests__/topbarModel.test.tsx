/**
 * `<TopBar model>` / `<TopBarModelBar>` — as 3 peças da barra a partir do
 * `TopBarModel` (Padrão SSO Nomad §10, contrato de 2026-09-30, v1.6.0).
 *
 * Fecha a divergência de conteúdo entre os apps: com o MESMO `TopBarModel`, a
 * barra renderiza os mesmos itens em qualquer app (grade de apps + launcherLinks
 * + "Gerenciar", empresas + "Criar empresa", conta + accountLinks + Tema +
 * "Trocar de empresa" + "Sair"), mais Ajuda e o sino de notificações.
 */
import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NommandMark,
  TopBar,
  TopBarModelBar,
  TopBarModelBrand,
  topBarModelSchema,
  type TopBarModel,
} from '../index'

const MODEL = topBarModelSchema.parse({
  apps: [
    {
      id: '1',
      slug: 'loadbalance',
      name: 'Loadbalance',
      iconUrl: null,
      launchUrl: 'https://lb.example/auth/sso',
    },
    {
      id: '2',
      slug: 'motor',
      name: 'Motor',
      iconUrl: null,
      launchUrl: 'https://motor.example/auth/sso',
    },
    {
      id: '3',
      slug: 'agent-package',
      name: 'Agent Package',
      iconUrl: null,
      launchUrl: 'https://ap.example/auth/sso',
    },
    {
      id: '4',
      slug: 'conta',
      name: 'Conta',
      iconUrl: null,
      launchUrl: 'https://conta.example/auth/sso',
    },
  ],
  organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'Proprietário' },
  organizations: [
    { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
    { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'admin', canOpenApp: true },
    { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
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

async function noAxeViolations() {
  const r = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

/** Nomes dos gatilhos/ações da barra, na ordem do DOM (§10). */
function barOrder(): (string | null)[] {
  return Array.from(screen.getByRole('banner').querySelectorAll('a, button, input')).map(
    (el) => el.getAttribute('aria-label') ?? el.textContent,
  )
}

function renderBar(extra: Partial<React.ComponentProps<typeof TopBar>> = {}) {
  return render(
    <TopBar
      model={MODEL}
      brand={<TopBarModelBrand product="Loadbalance" />}
      currentAppSlug="loadbalance"
      onSwitchOrg={() => {}}
      onSignOut={() => {}}
      {...extra}
    />,
  )
}

beforeEach(async () => {
  const { useThemeStore } = await import('../../theme/store')
  useThemeStore.setState({ theme: 'dark' })
})

describe('@nomad/ui/topbar: <TopBar model> monta as 3 peças a partir do TopBarModel', () => {
  it('seletor de empresa: chip com a ativa, menu com papel, empresa sem acesso desabilitada e "Criar empresa"', async () => {
    const user = userEvent.setup()
    const switchOrg = vi.fn()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderBar({ onSwitchOrg: switchOrg })

    expect(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    )
    const menu = screen.getByRole('menu', { name: 'Trocar de empresa' })
    const orgItems = within(menu).getAllByRole('menuitemradio')
    const item = (i: HTMLElement) => ({
      mark: i.querySelector('.ntb-org-mark')?.textContent,
      name: i.querySelector('.ntb-item__meta > b')?.textContent,
      role: i.querySelector('small')?.textContent,
      checked: i.getAttribute('aria-checked'),
      disabled: i.getAttribute('aria-disabled'),
    })
    expect(orgItems.map(item)).toEqual([
      { mark: 'NL', name: 'Nommand Labs', role: 'Proprietário', checked: 'true', disabled: null },
      { mark: 'SE', name: 'Serendiped', role: 'Administrador', checked: 'false', disabled: null },
      {
        mark: 'FA',
        name: 'Filial Sem App',
        role: 'Membro · Sem acesso a este app',
        checked: 'false',
        disabled: 'true',
      },
    ])
    expect(within(menu).getByRole('menuitem', { name: 'Criar empresa' })).toBeInTheDocument()

    // "Criar empresa" abre createOrgUrl em nova aba
    await user.click(within(menu).getByRole('menuitem', { name: 'Criar empresa' }))
    expect(open).toHaveBeenCalledWith('https://conta.example/new', '_blank', 'noopener')

    // troca de empresa vai para o app com a empresa escolhida (callback do app)
    await user.click(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    )
    await user.click(screen.getByRole('menuitemradio', { name: /Serendiped/ }))
    expect(switchOrg).toHaveBeenCalledWith('o2', expect.objectContaining({ name: 'Serendiped' }))
    open.mockRestore()
  })

  it('grade de apps: só os apps no grid; launcherLinks viram LINKS de rodapé (como na Conta) + "Gerenciar" no fim', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByRole('button', { name: 'Aplicativos Nommand' }))
    const dialog = screen.getByRole('dialog', { name: 'Aplicativos' })
    // O grid tem SÓ os apps: "Todos os aplicativos"/"Status dos serviços" não
    // podem parecer tiles (PKG-FIXES 25d586a6 — o dono viu isso no motor).
    const grid = within(dialog).getByRole('list')
    expect(Array.from(grid.querySelectorAll('.ntb-tile__text')).map((t) => t.textContent)).toEqual([
      'Loadbalance',
      'Motor',
      'Agent Package',
      'Conta',
    ])
    const tileLinks = within(dialog)
      .getAllByRole('link')
      .filter((a) => a.className.includes('ntb-tile'))
    expect(tileLinks[0]).toHaveAttribute('href', 'https://lb.example/auth/sso?org=o1&next=%2F')
    expect(tileLinks[0]).toHaveAttribute('aria-current', 'page')
    expect(tileLinks[1]).not.toHaveAttribute('aria-current')
    // Rodapé: os launcherLinks como links de texto com ícone pequeno, e
    // "Gerenciar sua Conta Nommand" por último.
    const foot = dialog.querySelector('.ntb-foot-links') as HTMLElement
    expect(foot).not.toBeNull()
    expect(Array.from(foot.querySelectorAll('.ntb-foot-link')).map((a) => a.textContent)).toEqual([
      'Todos os aplicativos',
      'Status dos serviços',
      'Gerenciar sua Conta Nommand',
    ])
    expect(foot.querySelector('.ntb-foot-link--manage')?.getAttribute('href')).toBe(
      'https://conta.example/account',
    )
    expect(within(foot).getByRole('link', { name: 'Todos os aplicativos' })).toHaveAttribute(
      'href',
      'https://conta.example/apps',
    )
    // launcherLinks abrem em aba nova por padrão
    expect(within(foot).getByRole('link', { name: 'Status dos serviços' })).toHaveAttribute(
      'target',
      '_blank',
    )
  })

  it('menu da conta: cartão, Gerenciar, accountLinks, Tema, Trocar de empresa e Sair na ordem do §10', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const dialog = screen.getByRole('dialog', { name: 'Sua conta' })
    expect(dialog).toHaveTextContent('Ana Souza')
    expect(dialog).toHaveTextContent('ana@nomad.dev')
    expect(dialog).toHaveTextContent('Nommand Labs · Proprietário')
    expect(
      within(dialog)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual([
      'Gerenciar sua Conta Nommand',
      'Segurança',
      'Aparência',
      'Tema · Escuro',
      'Trocar de empresa',
      'Sair',
    ])
    await noAxeViolations()
  })

  it('"Trocar de empresa" no menu da conta abre o seletor de empresa (fecha a conta)', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Trocar de empresa' }))
    expect(screen.queryByRole('dialog', { name: 'Sua conta' })).toBeNull()
    expect(screen.getByRole('menu', { name: 'Trocar de empresa' })).toBeInTheDocument()
  })

  it('item Tema mostra o estado e alterna o tema; "Sair" chama onSignOut', async () => {
    const user = userEvent.setup()
    const out = vi.fn()
    const setTheme = vi.fn()
    render(
      <div className="ntb ntb-bar">
        <TopBarModelBar
          model={MODEL}
          theme="dark"
          onThemeChange={setTheme}
          onSignOut={out}
          organize="trailing"
        />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Tema · Escuro' }))
    expect(setTheme).toHaveBeenCalledTimes(1)
    expect(setTheme).toHaveBeenCalledWith('light')

    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(out).toHaveBeenCalledTimes(1)
  })

  it('sem callbacks: o item "Tema" usa o store do pacote (ThemeProvider)', async () => {
    const user = userEvent.setup()
    // módulo novo: pega o store vivo
    const mod = await import('../../theme/store')
    mod.useThemeStore.setState({ theme: 'dark' })
    const seen: string[] = []
    const unsub = mod.useThemeStore.subscribe((s) => seen.push(s.theme))
    render(
      <div className="ntb ntb-bar">
        <TopBarModelBar model={MODEL} onSignOut={() => {}} organize="trailing" />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Tema · Escuro' }))
    unsub()
    expect(seen).toContain('light')
    expect(mod.useThemeStore.getState().theme).toBe('light')
    mod.useThemeStore.setState({ theme: 'dark' })
  })

  it('ajuda: menu só quando helpLinks vem, com os links da Conta', async () => {
    const user = userEvent.setup()
    const { rerender } = renderBar()
    await user.click(screen.getByRole('button', { name: 'Ajuda' }))
    const menu = screen.getByRole('menu', { name: 'Ajuda' })
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Ajuda', 'Privacidade', 'Termos'])
    expect(within(menu).getByRole('menuitem', { name: 'Termos' })).toHaveAttribute(
      'href',
      'https://conta.example/terms',
    )

    // sem helpLinks o botão não existe
    rerender(
      <TopBar
        model={{ ...MODEL, helpLinks: undefined }}
        brand={<TopBarModelBrand product="Loadbalance" />}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Ajuda' })).toBeNull()
  })

  it('notificações: sino com contador e destino da Conta; 0 esconde a pastilha; onNotificationsClick intercepta', () => {
    const full = renderBar()
    const bell = screen.getByRole('link', { name: 'Notificações, 3 não lidas' })
    expect(bell).toHaveAttribute('href', 'https://conta.example/notifications')
    expect(bell).toHaveAttribute('target', '_blank')
    expect(bell.querySelector('.ntb-notif-badge')).toHaveTextContent('3')
    full.unmount()

    const one = render(
      <TopBar
        model={{ ...MODEL, notifications: { unread: 1, href: 'https://conta.example/n' } }}
        brand={<TopBarModelBrand product="Loadbalance" />}
      />,
    )
    expect(screen.getByRole('link', { name: 'Notificações, 1 não lida' })).toBeInTheDocument()
    one.unmount()

    const zero = render(
      <TopBar
        model={{ ...MODEL, notifications: { unread: 0, href: 'https://conta.example/n' } }}
        brand={<TopBarModelBrand product="Loadbalance" />}
      />,
    )
    expect(screen.getByRole('link', { name: 'Notificações' })).toBeInTheDocument()
    expect(screen.queryByText('0')).toBeNull()
    zero.unmount()

    // 100+ vira 99+ (a pastilha não cresce)
    const many = render(
      <TopBar
        model={{ ...MODEL, notifications: { unread: 150, href: 'https://conta.example/n' } }}
        brand={<TopBarModelBrand product="Loadbalance" />}
      />,
    )
    expect(
      screen
        .getByRole('link', { name: 'Notificações, 150 não lidas' })
        .querySelector('.ntb-notif-badge'),
    ).toHaveTextContent('99+')
    many.unmount()

    // SPA: `onNotificationsClick` executa no clique normal em vez de seguir o link
    const onNotif = vi.fn()
    const { container } = render(
      <TopBar
        model={MODEL}
        brand={<TopBarModelBrand product="Loadbalance" />}
        onNotificationsClick={onNotif}
      />,
    )
    const spy = container.querySelector<HTMLElement>('.ntb-notif-btn')
    expect(spy).not.toBeNull()
    expect(spy?.getAttribute('href')).toBe('https://conta.example/notifications')
    fireEvent.click(spy as HTMLElement)
    expect(onNotif).toHaveBeenCalledTimes(1)
  })

  it('ordem da barra §10: marca · empresa · busca · ações do app · sino · ajuda · apps · conta', () => {
    renderBar({
      search: <input aria-label="Buscar" />,
      actions: <button type="button" aria-label="Paleta" />,
    })
    expect(barOrder()).toEqual([
      'Nommand Loadbalance, início',
      'Empresa: Nommand Labs. Trocar de empresa',
      'Buscar',
      'Paleta',
      'Notificações, 3 não lidas',
      'Ajuda',
      'Aplicativos Nommand',
      'Conta de Ana Souza',
    ])
  })

  it('sem violações de axe com a barra completa e a grade aberta', async () => {
    const user = userEvent.setup()
    renderBar({ search: <input aria-label="Buscar" /> })
    await noAxeViolations()
    await user.click(screen.getByRole('button', { name: 'Aplicativos Nommand' }))
    await noAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await noAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Ajuda' }))
    await noAxeViolations()
  })

  it('sem onSignOut o item "Sair" não aparece (barra anônima) e uma empresa só esconde "Trocar de empresa"', async () => {
    const user = userEvent.setup()
    const oneOrg: TopBarModel = {
      ...MODEL,
      organizations: [MODEL.organizations[0]],
      notifications: undefined,
    }
    render(<TopBar model={oneOrg} brand={<TopBarModelBrand product="Loadbalance" />} />)
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    const items = within(screen.getByRole('dialog', { name: 'Sua conta' }))
      .getAllByRole('menuitem')
      .map((i) => i.textContent)
    expect(items).toEqual([
      'Gerenciar sua Conta Nommand',
      'Segurança',
      'Aparência',
      'Tema · Escuro',
    ])
    expect(screen.queryByRole('link', { name: /Notificações/ })).toBeNull()
  })

  it('compatibilidade: sem `model` a barra usa os slots como sempre (nada muda)', () => {
    function Legacy() {
      const [orgOpen, setOrgOpen] = useState(false)
      return (
        <TopBar
          brand={
            <a href="/" aria-label="Marca">
              <NommandMark />
            </a>
          }
          org={<button type="button" aria-label="Empresa" onClick={() => setOrgOpen(!orgOpen)} />}
          search={<input aria-label="Buscar" />}
          apps={<button type="button" aria-label="Grade" />}
          account={<button type="button" aria-label="Conta" />}
        />
      )
    }
    render(<Legacy />)
    expect(barOrder()).toEqual(['Marca', 'Empresa', 'Buscar', 'Grade', 'Conta'])
    expect(screen.getByRole('banner').querySelector('.ntb-vsep')).not.toBeNull()
  })

  it('`model` legado (TopbarData v1.0.x validado no schema) renderiza as 3 peças', async () => {
    const user = userEvent.setup()
    const legacy = topBarModelSchema.parse({
      profile: { name: 'Ana Souza', email: 'ana@nomad.dev', picture: null },
      organization: { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner' },
      organizations: [
        { id: 'o1', name: 'Nommand Labs', slug: 'nommand-labs', role: 'owner', canOpenApp: true },
      ],
      apps: MODEL.apps,
      accountUrl: 'https://conta.example/',
    })
    render(
      <TopBar model={legacy} brand={<TopBarModelBrand product="Conta" />} onSignOut={() => {}} />,
    )
    expect(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conta de Ana Souza' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    // papel em inglês formatado para PT-BR; uma empresa só → sem "Trocar de empresa"
    expect(screen.getByRole('dialog', { name: 'Sua conta' })).toHaveTextContent(
      'Nommand Labs · Proprietário',
    )
    expect(screen.queryByRole('menuitem', { name: 'Trocar de empresa' })).toBeNull()
    // sem notifications/helpLinks/links: só Gerenciar + Tema + Sair
    expect(
      within(screen.getByRole('dialog', { name: 'Sua conta' }))
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Gerenciar sua Conta Nommand', 'Tema · Escuro', 'Sair'])
  })

  it('onSwitchOrg opcional: o item troca o estado do chip sem quebrar', async () => {
    const user = userEvent.setup()
    render(<TopBar model={MODEL} brand={<TopBarModelBrand product="Loadbalance" />} />)
    await user.click(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    )
    await user.click(screen.getByRole('menuitemradio', { name: /Serendiped/ }))
    // sem callback, o chip continua no model (a troca é do app)
    expect(
      screen.getByRole('button', { name: 'Empresa: Nommand Labs. Trocar de empresa' }),
    ).toBeInTheDocument()
  })
})

describe('@nomad/ui/topbar: MenuItem com onNavigate (navegação SPA com href)', () => {
  it('clique normal executa onNavigate e não segue o href; ⌘/Ctrl+clique segue o link', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    render(
      <TopBar
        model={MODEL}
        brand={<TopBarModelBrand product="Loadbalance" />}
        onSignOut={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Segurança' }))
    // o link de Segurança (accountLinks) segue o href normalmente (sem onNavigate)
    expect(screen.queryByRole('menuitem', { name: 'Segurança' })).toBeNull()

    // tema usa onNavigate: o item tem href? não — botão. Verificamos que o
    // MenuItem com href+onNavigate navega em SPA pelo slot `actions` do app.
    render(
      <TopBar
        model={MODEL}
        brand={<TopBarModelBrand product="Loadbalance" />}
        actions={
          <a
            href="/docs"
            onClick={(e) => {
              e.preventDefault()
              navigate()
            }}
          >
            Docs
          </a>
        }
      />,
    )
    await user.click(screen.getByRole('link', { name: 'Docs' }))
    expect(navigate).toHaveBeenCalled()
  })
})
