import type { MouseEvent, ReactNode } from 'react'
import { usePopoverClose } from './Popover'
import { CheckIcon } from './icons'

/** Iniciais do nome (2 letras): "Ana Souza" → "AS", "Nomad" → "NO". */
export function initials(name: string | null): string {
  const safe = name ?? ''
  const clean = safe.trim().replace(/@.*/, '')
  const parts = clean.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Um dos 6 tons de avatar, estável pelo nome (mesmo cálculo da Conta Nommand). */
export function toneOf(name: string | null): number {
  const safe = name ?? ''
  let h = 0
  for (let i = 0; i < safe.length; i++) h = (h * 31 + safe.charCodeAt(i)) >>> 0
  return (h % 6) + 1
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
  billing: 'Financeiro',
  readonly: 'Somente leitura',
}

/** Papel em português que a Conta já devolve traduzido (passa direto). */
const ROLE_PT: Record<string, string> = {
  proprietário: 'Proprietário',
  proprietaria: 'Proprietária',
  administrador: 'Administrador',
  administradora: 'Administradora',
  membro: 'Membro',
  visualizador: 'Visualizador',
  visualizadora: 'Visualizadora',
  financeiro: 'Financeiro',
}

/**
 * Papel na empresa em PT-BR. Aceita o identificador (`owner`/`OWNER` →
 * "Proprietário") e o rótulo em português que a Conta já devolve
 * ("Proprietário" → "Proprietário"); qualquer outro volta como veio.
 */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return ''
  const key = role.trim().toLowerCase()
  return ROLE_LABELS[key] ?? ROLE_PT[key] ?? role
}

/** Clique "normal" (sem Ctrl/⌘/Shift/botão do meio): só esse é interceptado para navegação SPA. */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

/**
 * Item extra de menu (menu da conta, seletor de empresa). Com `href` vira link; `onSelect` sem `href` vira botão.
 * Com `href` e `onSelect`, o clique normal chama `onSelect` (navegação SPA do app) e Ctrl/⌘+clique abre o link.
 */
export type MenuItemSpec = {
  key: string
  label: ReactNode
  icon?: ReactNode
  href?: string
  onSelect?: () => void
  /** Com `href`: clique normal chama isto (navegação SPA) em vez de seguir o link. */
  onNavigate?: () => void
  /** Abre o `href` numa aba nova. */
  newTab?: boolean
  danger?: boolean
  disabled?: boolean
}

type ItemProps = {
  children: ReactNode
  icon?: ReactNode
  leading?: ReactNode
  meta?: ReactNode
  checked?: boolean
  danger?: boolean
  disabled?: boolean
  href?: string
  newTab?: boolean
  onSelect?: () => void
  onNavigate?: () => void
  title?: string
}

/** Item de menu do pacote (`role="menuitem"`, ou `menuitemradio` quando `checked` vem definido). */
export function MenuItem({
  children,
  icon,
  leading,
  meta,
  checked,
  danger,
  disabled,
  href,
  newTab,
  onSelect,
  onNavigate,
  title,
}: ItemProps) {
  const close = usePopoverClose()
  const role = checked === undefined ? 'menuitem' : 'menuitemradio'
  const cls = `ntb-item${danger ? ' ntb-item--danger' : ''}`
  const inner = (
    <>
      {leading ?? icon ?? null}
      {meta ? (
        <span className="ntb-item__meta">
          <b>{children}</b>
          <small>{meta}</small>
        </span>
      ) : (
        <span>{children}</span>
      )}
      {checked && <CheckIcon className="ntb-ico ntb-item__check" />}
    </>
  )
  const common = {
    role,
    className: cls,
    'aria-checked': checked,
    'aria-disabled': disabled || undefined,
    'data-ntb-item': '',
    title,
  } as const
  if (href) {
    return (
      <a
        {...common}
        href={disabled ? undefined : href}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}
        tabIndex={-1}
        onClick={(e) => {
          if (disabled) return e.preventDefault()
          // `onSelect`: abre o item e executa a ação. `onNavigate`: só executa
          // (navegação SPA do app). Em ambos, ⌘/Ctrl+clique segue o `href`.
          if (isPlainClick(e)) {
            e.preventDefault()
            if (onSelect) onSelect()
            else onNavigate?.()
          }
          close()
        }}
      >
        {inner}
      </a>
    )
  }
  return (
    <button
      {...common}
      type="button"
      tabIndex={-1}
      onClick={() => {
        if (disabled) return
        close()
        onSelect?.()
      }}
    >
      {inner}
    </button>
  )
}

export function MenuItems({ items }: { items: MenuItemSpec[] }) {
  return (
    <>
      {items.map((it) => (
        <MenuItem
          key={it.key}
          icon={it.icon}
          href={it.href}
          onSelect={it.onSelect}
          onNavigate={it.onNavigate}
          newTab={it.newTab}
          danger={it.danger}
          disabled={it.disabled}
        >
          {it.label}
        </MenuItem>
      ))}
    </>
  )
}

export function MenuDivider() {
  return <div className="ntb-divider" role="separator" />
}
