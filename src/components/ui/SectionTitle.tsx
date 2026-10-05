// ── SectionTitle — cabeçalho de seção dentro de uma tela ────────────────
//
// Unifica os 6 cabeçalhos de seção de card que escreviam
// `text-heading font-semibold` à mão (antes escrito em px). Papel = `heading` (PLANO §2.1).

import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Label } from './Label'

export interface SectionTitleProps {
  children: ReactNode
  /** Rótulo minúsculo acima do título (`text-micro uppercase`). */
  eyebrow?: ReactNode
  /** Ação alinhada à direita (botão, link, contador). */
  action?: ReactNode
  className?: string
}

/**
 * Título de seção.
 *
 * @example
 * <SectionTitle eyebrow="Projeto" action={<Button size="sm">Novo</Button>}>
 *   Knowledges
 * </SectionTitle>
 */
export function SectionTitle({ children, eyebrow, action, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <Label as="p" className="mb-1">
            {eyebrow}
          </Label>
        ) : null}
        <h2 className="truncate text-heading font-semibold text-text-primary">{children}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
