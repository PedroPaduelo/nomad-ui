// ── PageHeader — cabeçalho canônico de tela ─────────────────────────────
//
// Único dono do <h1> de página. Papéis da escala (PLANO §2.1):
//   eyebrow      → `text-micro uppercase` (tertiary)
//   title  <h1>  → `text-title`  (antes: tamanho em px cru)
//   description  → `text-body`   (antes: tamanho em px cru)
//
// Qualquer tela que desenhe o próprio <h1> à mão sai do sistema e fica com
// tamanho diferente das outras — foi exatamente o que aconteceu com a
// "Base de conhecimento" (24px) contra o Dashboard (22px). Use este
// componente em vez de repetir as classes.

import { ReactNode } from 'react'
import { Label } from './Label'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Rótulo minúsculo acima do título (`text-micro uppercase`). */
  eyebrow?: ReactNode
  action?: ReactNode
  breadcrumb?: ReactNode
}

export function PageHeader({ title, description, eyebrow, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex flex-1 basis-72 items-start gap-3 min-w-0">
        {breadcrumb ? <div className="mt-1 text-body text-text-tertiary">{breadcrumb}</div> : null}
        <div className="min-w-0">
          {eyebrow ? (
            <Label as="p" className="mb-1">
              {eyebrow}
            </Label>
          ) : null}
          <h1 className="text-title text-text-primary">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-[90ch] text-body text-text-secondary">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
