// ── NotificationsButton — sino da Conta com contador de não lidas ────────
//
// Peça padrão da barra (Padrão SSO Nomad §10, v1.6.0): o `TopBarModel`
// traz `notifications { unread, href }` e o botão fica à direita, entre
// as ações do app e a grade de apps. Sem model, o botão não aparece.
//
// É um link (a central de notificações é uma página da Conta), com o
// contador numa pastilha; `unread: 0` esconde a pastilha mas mantém o
// nome acessível completo. O app que já tem central própria passa
// `onSelect` (navegação SPA): o clique normal executa a ação em vez de
// sair da página; ⌘/Ctrl+clique segue o link, como nos itens de menu.

import type { MouseEvent } from 'react'
import { BellIcon } from './icons'
import { isPlainClick } from './shared'
import type { TopBarNotifications } from './topBarModel'

export type NotificationsButtonProps = {
  /** Contador de não lidas e destino (vem do `TopBarModel.notifications`). */
  notifications: TopBarNotifications
  /** Clique normal: chamado no lugar de seguir o `href` (ex.: abre um drawer). */
  onSelect?: () => void
  /** Número acessível em vez do rótulo derivado (padrão: "Notificações, 3 não lidas"). */
  label?: string
  /** Abre numa aba nova (padrão: sim, §10). */
  newTab?: boolean
  className?: string
}

/** Rótulo acessível do sino: Notificações · N não lidas. */
export function notificationsLabel(notifications: TopBarNotifications): string {
  const unread = Math.max(0, Math.floor(notifications.unread))
  return unread > 0
    ? `Notificações, ${unread} ${unread === 1 ? 'não lida' : 'não lidas'}`
    : 'Notificações'
}

/**
 * Botão de notificações da barra: sino + pastilha com o contador.
 * Renderizado pelo `<TopBar model>` quando `model.notifications` vem.
 */
export function NotificationsButton({
  notifications,
  onSelect,
  label,
  newTab = true,
  className,
}: NotificationsButtonProps) {
  const unread = Math.max(0, Math.floor(notifications.unread))
  const accessibleName = label ?? notificationsLabel(notifications)
  const classNames = ['ntb-btn', 'ntb-icon-btn', 'ntb-notif-btn', className]
    .filter(Boolean)
    .join(' ')
  // Sempre um link: `href` é a central da Conta (destino padrão §10). Com
  // `onSelect`, o clique normal executa a ação do app em vez de sair da
  // página; ⌘/Ctrl+clique segue o link, como nos itens de menu do pacote.
  return (
    <a
      className={classNames}
      href={notifications.href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      aria-label={accessibleName}
      data-ntb-notifications="link"
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (!onSelect || !isPlainClick(e)) return
        e.preventDefault()
        onSelect()
      }}
    >
      <BellIcon />
      {unread > 0 ? (
        <span className="ntb-notif-badge" data-testid="ntb-notif-badge">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </a>
  )
}