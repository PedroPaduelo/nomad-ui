// ── Card — primitive base para todos os cards da app ──────────────────
//
// Componente unificado para cards (KnowledgeCard, project cards, etc).
// 100% token-driven, variantes com `cva` (FE-S1).
//
// Forma (Spec 02 §6): radius 12 (--radius-card via rounded-lg). Hover
// interativo muda APENAS a cor da borda (sem translate/shadow/gradiente).
//
// Variantes:
//   - default / raised / bordered / ghost : superfícies neutras
//   - agent : borda dourada suave (contexto "o agente" / MCP)
//
// Sub-componentes: Card.Header / Card.Body / Card.Footer
//
// Elemento que não é `div` (ex.: `<article>` com link esticado, `<ul>` de
// resultados): use `cardVariants({ … })` direto no className dele.

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export type CardVariant = 'default' | 'raised' | 'ghost' | 'bordered' | 'agent'

export const cardVariants = cva(
  'rounded-lg border transition-colors duration-(--transition-fast)',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface-raised',
        raised: 'border-border bg-surface-raised',
        ghost: 'border-transparent bg-surface-base',
        bordered: 'border-border bg-surface-base',
        agent: 'border-[color-mix(in_srgb,var(--color-amber)_35%,transparent)] bg-surface-raised',
      },
      interactive: {
        true:
          'cursor-pointer hover:border-border-hover focus-visible:outline-hidden focus-visible:ring-2 ' +
          'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-body)',
        false: '',
      },
    },
    defaultVariants: { variant: 'default', interactive: false },
  },
)

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Ativa hover (muda só a cor da borda) + foco visível. */
  interactive?: boolean
  /** Renderiza como button (accessibility). Quando true, vira clickable. */
  asButton?: boolean
}

const CardBase = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'default',
    interactive = false,
    asButton = false,
    children,
    className,
    onClick,
    onKeyDown,
    tabIndex,
    role,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-variant={variant}
      role={asButton ? 'button' : role}
      tabIndex={asButton ? 0 : tabIndex}
      onClick={onClick}
      onKeyDown={
        asButton
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
              } else {
                onKeyDown?.(e)
              }
            }
          : onKeyDown
      }
      className={cn(cardVariants({ variant, interactive: interactive || asButton }), className)}
      {...props}
    >
      {children}
    </div>
  )
})

// ── Sub-componentes ───────────────────────────────────────────

interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function CardHeader({ children, className, ...props }: SectionProps) {
  return (
    <div
      className={cn('flex items-center gap-2 border-b border-border px-4 py-3', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CardBody({ children, className, ...props }: SectionProps) {
  return (
    <div className={cn('p-4', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ children, className, ...props }: SectionProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-t border-border px-4 py-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Compound API: tipa Card.Header/Body/Footer via interseção (Object.assign
// preserva o forwardRef callable e adiciona os sub-componentes ao tipo).
export const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
})
