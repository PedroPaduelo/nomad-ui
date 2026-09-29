import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import {
  AccountMenu,
  AppSwitcher,
  OrgSwitcher,
  TopBar,
  TopBarBrand,
  fetchLauncherApps,
  launchHref,
  type LauncherApp,
  type TopbarOrganization,
} from '../index'

const apps: LauncherApp[] = [
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
    description: null,
  },
  {
    id: '3',
    slug: 'agent-package',
    name: 'Agent Package',
    iconUrl: null,
    launchUrl: 'https://ap.example/auth/sso',
    description: null,
  },
  {
    id: '4',
    slug: 'quarto',
    name: 'Quarto App',
    iconUrl: null,
    launchUrl: 'https://q.example/auth/sso',
    description: null,
  },
]

const orgs: TopbarOrganization[] = [
  { id: 'o1', name: 'Nomad Labs', slug: 'nomad-labs', role: 'owner', canOpenApp: true },
  { id: 'o2', name: 'Serendiped', slug: 'serendiped', role: 'ADMIN', canOpenApp: true },
  { id: 'o3', name: 'Filial Sem App', slug: 'filial', role: 'member', canOpenApp: false },
]

async function noAxeViolations() {
  const r = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  expect(
    r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

/** Espera o setTimeout(0) que devolve o foco ao gatilho quando o item focado some. */
const flush = () => act(() => new Promise((r) => setTimeout(r, 5)))

describe('@nomad/ui/topbar: AppSwitcher', () => {
  it('abre com o mouse: dialog com os apps como links launchUrl?org=&next=/ em aba nova; onOpen uma vez', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(
      <AppSwitcher
        apps={apps}
        onOpen={onOpen}
        currentAppSlug="motor"
        orgId="o9"
        accountUrl="https://conta.example/"
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Aplicativos Nommand' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Aplicativos' })
    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    const motor = within(dialog).getByRole('link', { name: 'Motor' })
    expect(motor).toHaveAttribute('href', 'https://motor.example/auth/sso?org=o9&next=%2F')
    expect(motor).toHaveAttribute('target', '_blank')
    expect(motor).toHaveAttribute('rel', 'noopener noreferrer')
    expect(motor).toHaveAttribute('aria-current', 'page')
    expect(
      within(dialog).getByRole('link', { name: 'Gerenciar sua Conta Nommand' }),
    ).toHaveAttribute('href', 'https://conta.example/')
    // Aberto pelo mouse, o foco fica no painel (sem anel no 1º item).
    expect(document.activeElement).toBe(dialog)
    await user.click(trigger)
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(trigger)
    expect(onOpen).toHaveBeenCalledTimes(1)
    await noAxeViolations()
  })

  it('teclado: Enter foca o 1º app, setas navegam em 2D, Esc fecha e devolve o foco', async () => {
    const user = userEvent.setup()
    render(<AppSwitcher apps={apps} />)
    const trigger = screen.getByRole('button', { name: 'Aplicativos Nommand' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Motor' }))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Loadbalance' }))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Quarto App' }))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Quarto App' }))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Motor' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    // ↓ no gatilho também abre.
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Motor' }))
  })

  it('clique fora fecha e devolve o foco ao gatilho; Tab para fora fecha', async () => {
    const user = userEvent.setup()
    render(
      <>
        <AppSwitcher apps={apps} />
        <button type="button">Depois</button>
        <p>fora</p>
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Aplicativos Nommand' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByText('fora'))
    expect(screen.queryByRole('dialog')).toBeNull()
    await flush()
    expect(document.activeElement).toBe(trigger)
    await user.click(trigger)
    screen.getByRole('link', { name: 'Quarto App' }).focus()
    await user.tab()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('carregando, vazio, erro com tentar de novo, blocos extras com navegação SPA e rodapé próprio', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    const go = vi.fn()
    const { rerender } = render(<AppSwitcher apps={null} />)
    await user.click(screen.getByRole('button', { name: 'Aplicativos Nommand' }))
    expect(screen.getByRole('status')).toHaveTextContent('Carregando aplicativos…')
    rerender(<AppSwitcher apps={[]} empty="Nada liberado" />)
    expect(screen.getByText('Nada liberado')).toBeInTheDocument()
    rerender(<AppSwitcher apps={null} error="Sem rede." onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sem rede.')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(retry).toHaveBeenCalled()
    rerender(
      <AppSwitcher
        apps={[apps[0]]}
        extraTiles={[
          { key: 'conta', label: 'Conta', icon: <span />, href: '/', onSelect: go },
          {
            key: 'lock',
            label: 'Loadbalance',
            icon: <span />,
            caption: 'Solicitar acesso',
            href: '/pedir',
            onSelect: go,
            disabled: true,
            ariaLabel: 'Loadbalance: sem acesso. Solicitar acesso',
          },
        ]}
        footer={<a href="#todos">Todos os aplicativos</a>}
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Loadbalance: sem acesso. Solicitar acesso' }).className,
    ).toContain('ntb-tile--disabled')
    await user.click(screen.getByRole('link', { name: 'Conta' }))
    expect(go).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Aplicativos Nommand' }))
    await user.click(screen.getByRole('link', { name: 'Todos os aplicativos' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('launchHref monta launchUrl?org=&next= preservando a query', () => {
    expect(launchHref('https://lb.example/auth/sso', { org: 'o1', next: '/' })).toBe(
      'https://lb.example/auth/sso?org=o1&next=%2F',
    )
    expect(
      launchHref('https://lb.example/auth/sso?a=1&org=velha', { org: 'o2', next: '/x?y=1' }),
    ).toBe('https://lb.example/auth/sso?a=1&org=o2&next=%2Fx%3Fy%3D1')
    expect(launchHref('https://lb.example/auth/sso', {})).toBe('https://lb.example/auth/sso')
    expect(launchHref('/relativo', { org: 'o1' })).toBe('/relativo')
  })

  it('fetchLauncherApps manda os cabeçalhos e devolve a lista', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ apps }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    try {
      const r = await fetchLauncherApps({
        url: 'https://conta.example/api/apps/launcher',
        headers: { Authorization: 'Bearer t' },
      })
      expect(r).toHaveLength(4)
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('https://conta.example/api/apps/launcher')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t')
      fetchMock.mockImplementation(async () => new Response('{}', { status: 401 }))
      await expect(fetchLauncherApps()).rejects.toThrow('Sua sessão expirou')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('@nomad/ui/topbar: OrgSwitcher', () => {
  it('chip da empresa ativa; ↓ abre o menu no 1º item; setas, End e Esc; papel e atual marcados', async () => {
    const user = userEvent.setup()
    render(<OrgSwitcher organizations={orgs} currentOrgId="o1" onSwitch={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Empresa: Nomad Labs. Trocar de empresa' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveTextContent('Nomad Labs')
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    const menu = screen.getByRole('menu', { name: 'Trocar de empresa' })
    const items = within(menu).getAllByRole('menuitemradio')
    expect(items).toHaveLength(3)
    expect(document.activeElement).toBe(items[0])
    expect(items[0]).toHaveAttribute('aria-checked', 'true')
    expect(items[0]).toHaveTextContent('Proprietário')
    expect(items[1]).toHaveTextContent('Administrador')
    expect(items[2]).toHaveTextContent('Membro · Sem acesso a este app')
    expect(items[2]).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[1])
    // O desabilitado fica fora da navegação: ↓ volta ao 1º.
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[0])
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(items[1])
    await noAxeViolations()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    // ↑ no gatilho abre no último item habilitado.
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(screen.getAllByRole('menuitemradio')[1])
  })

  it('onSwitch só para outra empresa habilitada; itens extras; clique fora fecha', async () => {
    const user = userEvent.setup()
    const onSwitch = vi.fn()
    const create = vi.fn()
    render(
      <>
        <OrgSwitcher
          organizations={orgs}
          currentOrgId="o1"
          onSwitch={onSwitch}
          extraItems={[{ key: 'new', label: 'Criar empresa', onSelect: create }]}
        />
        <p>fora</p>
      </>,
    )
    const trigger = screen.getByRole('button', { name: /^Empresa: Nomad Labs/ })
    await user.click(trigger)
    await user.click(screen.getByRole('menuitemradio', { name: /Filial Sem App/ }))
    expect(onSwitch).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitemradio', { name: /Nomad Labs/ }))
    expect(onSwitch).not.toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitemradio', { name: /Serendiped/ }))
    expect(onSwitch).toHaveBeenCalledWith('o2', orgs[1])
    expect(screen.queryByRole('menu')).toBeNull()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Criar empresa' }))
    expect(create).toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByText('fora'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('sem empresa mostra "Sem empresa"; controlado por open/onOpenChange foca o 1º item', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            abrir de fora
          </button>
          <OrgSwitcher
            organizations={orgs}
            currentOrgId="o2"
            onSwitch={() => {}}
            open={open}
            onOpenChange={setOpen}
          />
        </>
      )
    }
    const user = userEvent.setup()
    const { unmount } = render(<OrgSwitcher organizations={[]} onSwitch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Escolher empresa' })).toHaveTextContent(
      'Sem empresa',
    )
    unmount()
    render(<Controlled />)
    await user.click(screen.getByRole('button', { name: 'abrir de fora' }))
    expect(document.activeElement).toBe(screen.getAllByRole('menuitemradio')[0])
  })
})

describe('@nomad/ui/topbar: AccountMenu', () => {
  const user0 = {
    name: 'Ana Souza',
    email: 'ana@nomad.dev',
    picture: 'https://conta.example/api/users/1/avatar?v=abc',
  }

  it('avatar com foto; cartão com nome, e-mail, empresa e papel; itens com callbacks', async () => {
    const user = userEvent.setup()
    const manage = vi.fn()
    const sw = vi.fn()
    const out = vi.fn()
    const prefs = vi.fn()
    render(
      <AccountMenu
        user={user0}
        organization={{ name: 'Nomad Labs', role: 'owner' }}
        manageAccountHref="https://conta.example/"
        onManageAccount={manage}
        extraItems={[{ key: 'p', label: 'Preferências', href: '/preferences', onSelect: prefs }]}
        onSwitchOrganization={sw}
        onSignOut={out}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Conta de Ana Souza' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger.querySelector('img')).toHaveAttribute('src', user0.picture)
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Sua conta' })
    expect(dialog).toHaveTextContent('Ana Souza')
    expect(dialog).toHaveTextContent('ana@nomad.dev')
    expect(dialog).toHaveTextContent('Nomad Labs · Proprietário')
    const items = within(dialog)
      .getAllByRole('menuitem')
      .map((i) => i.textContent)
    expect(items).toEqual([
      'Gerenciar sua Conta Nommand',
      'Preferências',
      'Trocar de empresa',
      'Sair',
    ])
    await noAxeViolations()
    await user.click(screen.getByRole('menuitem', { name: 'Gerenciar sua Conta Nommand' }))
    expect(manage).toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Preferências' }))
    expect(prefs).toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Trocar de empresa' }))
    expect(sw).toHaveBeenCalled()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(out).toHaveBeenCalled()
  })

  it('teclado: Enter foca o 1º item, setas circulam, Esc devolve o foco; sem foto mostra as iniciais', async () => {
    const user = userEvent.setup()
    render(
      <AccountMenu
        user={{ name: 'Bruno Lacerda', email: null, picture: null }}
        onSignOut={() => {}}
        manageAccountHref="https://conta.example/"
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Conta de Bruno Lacerda' })
    expect(trigger).toHaveTextContent('BL')
    trigger.focus()
    await user.keyboard('{Enter}')
    const items = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(items[0])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[1])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[0])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('foto que falha cai nas iniciais', () => {
    render(
      <AccountMenu
        user={{ name: 'Clara Menezes', picture: 'https://x/quebrada.png' }}
        onSignOut={() => {}}
      />,
    )
    const img = screen.getByRole('button', { name: 'Conta de Clara Menezes' }).querySelector('img')!
    fireEvent.error(img)
    expect(screen.getByRole('button', { name: 'Conta de Clara Menezes' })).toHaveTextContent('CM')
  })
})

describe('@nomad/ui/topbar: TopBar', () => {
  it('moldura com os slots na ordem; marca com navegação SPA; "Trocar de empresa" abre o seletor; sem violações', async () => {
    function Bar() {
      const [orgOpen, setOrgOpen] = useState(false)
      return (
        <TopBar
          brand={
            <TopBarBrand
              logo={<svg aria-hidden="true" />}
              name="Nommand"
              product="Loadbalance"
              onNavigate={nav}
            />
          }
          org={
            <OrgSwitcher
              organizations={orgs}
              currentOrgId="o1"
              onSwitch={() => {}}
              open={orgOpen}
              onOpenChange={setOrgOpen}
            />
          }
          search={<input aria-label="Buscar" />}
          actions={<button type="button">Ajuda</button>}
          apps={<AppSwitcher apps={apps} orgId="o1" />}
          account={
            <AccountMenu
              user={{ name: 'Ana Souza' }}
              onSignOut={() => {}}
              onSwitchOrganization={() => setOrgOpen(true)}
            />
          }
        />
      )
    }
    const nav = vi.fn()
    const user = userEvent.setup()
    render(<Bar />)
    const bar = screen.getByRole('banner')
    const order = Array.from(bar.querySelectorAll('a, button, input')).map(
      (el) => el.getAttribute('aria-label') ?? el.textContent,
    )
    expect(order).toEqual([
      'Nommand Loadbalance, início',
      'Empresa: Nomad Labs. Trocar de empresa',
      'Buscar',
      'Ajuda',
      'Aplicativos Nommand',
      'Conta de Ana Souza',
    ])
    expect(bar.querySelector('.ntb-vsep')).not.toBeNull()
    await user.click(screen.getByRole('link', { name: 'Nommand Loadbalance, início' }))
    expect(nav).toHaveBeenCalled()
    await noAxeViolations()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    await user.click(screen.getByRole('menuitem', { name: 'Trocar de empresa' }))
    await flush()
    expect(screen.queryByRole('dialog', { name: 'Sua conta' })).toBeNull()
    expect(screen.getByRole('menu', { name: 'Trocar de empresa' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getAllByRole('menuitemradio')[0])
  })

  it('sem org não desenha o separador; sticky opcional', () => {
    render(<TopBar brand={<span>Marca</span>} sticky={false} />)
    const bar = screen.getByRole('banner')
    expect(bar.querySelector('.ntb-vsep')).toBeNull()
    expect(bar.className).not.toContain('ntb-bar--sticky')
  })
})

describe('@nomad/ui/topbar: controle externo da grade e do menu da conta (acréscimo)', () => {
  it('AppSwitcher com open: abre por fora, avisa onOpen uma vez e pede para fechar pelo onOpenChange', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const change = vi.fn()
    const { rerender } = render(
      <AppSwitcher apps={apps} open onOpen={onOpen} onOpenChange={change} />,
    )
    expect(screen.getByRole('dialog', { name: 'Aplicativos' })).toBeInTheDocument()
    expect(onOpen).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(change).toHaveBeenLastCalledWith(false)
    // Controlado: continua aberto até o dono mudar `open`.
    expect(screen.getByRole('dialog', { name: 'Aplicativos' })).toBeInTheDocument()
    rerender(<AppSwitcher apps={apps} open={false} onOpen={onOpen} onOpenChange={change} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<AppSwitcher apps={apps} open onOpen={onOpen} onOpenChange={change} />)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('AccountMenu com open/onOpenChange', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    const { rerender } = render(
      <AccountMenu
        user={{ name: 'Ana Souza' }}
        onSignOut={() => {}}
        open={false}
        onOpenChange={change}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Conta de Ana Souza' }))
    expect(change).toHaveBeenLastCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(
      <AccountMenu user={{ name: 'Ana Souza' }} onSignOut={() => {}} open onOpenChange={change} />,
    )
    expect(screen.getByRole('dialog', { name: 'Sua conta' })).toBeInTheDocument()
  })
})
