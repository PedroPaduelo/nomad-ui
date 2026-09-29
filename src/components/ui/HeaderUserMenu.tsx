/**
 * HeaderUserMenu — avatar redondo com menu de usuário.
 *
 * Trazido do agent-package com a mesma UX visual (avatar accent-muted em
 * anel accent, cartão com nome/e-mail e itens "Configurações" + "Sair"),
 * mas desacoplado da sessão e do router: nome, e-mail, callbacks e URL
 * de configurações vêm por prop.
 *
 * O initials cai em "U" quando name é vazio (compatibilidade com o
 * tratamento original do agent-package).
 */
import { LogOut, Settings } from 'lucide-react'
import { Menu, MenuItem, MenuSeparator } from './Menu'

export interface HeaderUserMenuUser {
  /** Nome completo (exibido em "Nome" no menu). Vazio cai para "U" no avatar. */
  name: string
  /** E-mail (exibido em "E-mail" abaixo do nome). Opcional. */
  email?: string
  /** Iniciais customizadas (padrão: 2 letras do nome). */
  initials?: string
}

export interface HeaderUserMenuProps {
  user: HeaderUserMenuUser
  /** Callback do item "Sair" — limpar sessão, navegar, etc. */
  onSignOut?: () => void
  /** URL para a tela de configurações. Se passada, o item vira link. */
  settingsHref?: string
  /** Callback do item "Configurações" (alternativa ao `settingsHref`). */
  onSettings?: () => void
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  )
}

export function HeaderUserMenu({
  user,
  onSignOut,
  settingsHref,
  onSettings,
}: HeaderUserMenuProps) {
  const { name, email, initials } = user
  const avatar = initials ?? initialsOf(name)

  return (
    <Menu
      ariaLabel="Menu do usuário"
      align="right"
      buttonClassName="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-text-accent transition-all hover:ring-2 hover:ring-accent"
      button={avatar}
    >
      <div className="px-2.5 pb-2 pt-1.5">
        <p className="truncate text-body font-medium text-text-primary">{name}</p>
        {email ? (
          <p className="truncate text-caption text-text-tertiary">{email}</p>
        ) : null}
      </div>
      <MenuSeparator />
      <MenuItem
        icon={<Settings className="h-4 w-4" />}
        onClick={onSettings}
        href={onSettings ? undefined : settingsHref}
      >
        Configurações
      </MenuItem>
      <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={onSignOut}>
        Sair
      </MenuItem>
    </Menu>
  )
}