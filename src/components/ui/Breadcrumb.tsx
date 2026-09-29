/**
 * Breadcrumb — trilha de navegação.
 *
 * Trazido do agent-package com a mesma UX visual (Home + itens com
 * ChevronRight, truncamento em telas estreitas) mas desacoplado do produto:
 * a URL, projeto e design system são passados por prop.
 *
 * Tela estreita: só os 2 últimos níveis (o resto vira "P.", "T" ilegível).
 *
 * Fonte da verdade visual: agent-package. Nada de cores hardcoded — só
 * tokens do tema.
 */
import type { ReactNode } from 'react'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  /** Rótulo do item. */
  label: string
  /** URL do item. Omitir para o item atual (não clicável). */
  href?: string
  /** Callback ao clicar. Para React Router, chame `navigate(href)` e `preventDefault`. */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export interface BreadcrumbProps {
  /** Itens da trilha (em ordem). Para uma trilha vazia, renderize nada. */
  items: BreadcrumbItem[]
  /**
   * Elemento inicial antes do primeiro item (padrão: ícone "Home" apontando
   * para "/"). Para ocultar (ex.: em rotas sem home), passe `null`.
   */
  home?: ReactNode
  /** Rótulo do `aria-label` da `<nav>`. Padrão: "Trilha de navegação". */
  ariaLabel?: string
}

export function Breadcrumb({ items, home, ariaLabel = 'Trilha de navegação' }: BreadcrumbProps) {
  if (!items.length) return null
  const HomeSlot =
    home === null
      ? null
      : home ?? (
          <a
            href="/"
            aria-label="Início"
            className="flex items-center gap-1 text-text-tertiary transition-colors hover:text-text-primary"
          >
            <Home aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        )

  return (
    <nav aria-label={ariaLabel}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {HomeSlot ? (
          <li className="flex items-center">
            {HomeSlot}
          </li>
        ) : null}
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li
              key={`${i}:${item.href ?? item.label}`}
              // Tela estreita: só os 2 últimos níveis (o resto vira "P.", "T" ilegível).
              className={`min-w-0 items-center gap-1.5 ${i < items.length - 2 ? 'hidden sm:flex' : 'flex'}`}
            >
              <ChevronRight
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-disabled)]"
              />
              {isLast || !item.href ? (
                <span
                  aria-current="page"
                  className="block max-w-[40ch] truncate font-medium text-text-primary"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  title={item.label}
                  className="block max-w-[24ch] truncate text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {item.label}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}