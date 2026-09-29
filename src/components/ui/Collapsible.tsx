// ── Collapsible — seção que abre e fecha ───────────────────────────────
//
// Sobre o Collapsible headless do Base UI (padrão APG "Disclosure"): o
// gatilho é um `<button>` com `aria-expanded` + `aria-controls`, Enter e
// Espaço alternam, e o painel fechado sai da árvore de acessibilidade.
// Substitui as seções colapsáveis escritas à mão (Section/InspectorSection
// do Render, FC-02).
//
// Uso:
//   <Collapsible title="Avançado" defaultOpen>…</Collapsible>
//   <Collapsible title="Filtros" open={aberto} onOpenChange={setAberto}
//                actions={<Badge>3</Badge>}>…</Collapsible>
//
// `actions` fica ao lado do gatilho, FORA dele (botão dentro de botão não é
// permitido). `keepMounted` mantém o painel montado fechado (estado de
// formulário preservado); por padrão ele é desmontado.

import { type ReactNode } from 'react'
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { labelVariants } from './Label'

export interface CollapsibleProps {
  title: ReactNode
  children: ReactNode
  /** Estado inicial (não controlado). */
  defaultOpen?: boolean
  /** Estado controlado; use com `onOpenChange`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Conteúdo à direita do título (contador, botão). Fica fora do gatilho. */
  actions?: ReactNode
  /** Mantém o painel no DOM quando fechado. */
  keepMounted?: boolean
  disabled?: boolean
  className?: string
  panelClassName?: string
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  actions,
  keepMounted = false,
  disabled = false,
  className,
  panelClassName,
}: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
      disabled={disabled}
      className={cn('grid', className)}
      data-slot="collapsible"
    >
      <div className="flex items-center gap-2">
        <BaseCollapsible.Trigger
          className={cn(
            labelVariants({ tone: 'default' }),
            'group/collapsible flex min-w-0 flex-1 items-center gap-1.5 rounded-sm py-1.5 text-left',
            'hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-data-panel-open/collapsible:rotate-90"
          />
          <span className="truncate">{title}</span>
        </BaseCollapsible.Trigger>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <BaseCollapsible.Panel keepMounted={keepMounted} className={cn('pt-1', panelClassName)}>
        {children}
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  )
}
