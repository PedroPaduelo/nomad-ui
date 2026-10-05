// ── Button — primitive base para todos os botões da app ────────────────
//
// Componente unificado que cobre TODOS os padrões de botão do DS.
// Variantes declaradas com `cva` (FE-S1), em classes Tailwind ligadas aos
// tokens CSS — nada hardcoded, nada de `style` para cor ou tamanho.
//
// Variantes:
//   - primary   : ação principal (accent sólido)
//   - secondary : ação normal (border + texto)
//   - ghost     : ação sutil (só hover)
//   - danger    : ação destrutiva (error sólido)
//   - agent / agent-outline : ações "do agente" (amber)
//
// Tamanhos:
//   - sm : altura 30px
//   - md : altura 36px (default)
//   - lg : altura 40px
//
// Cor: cada variante preenche as custom properties `--btn-*` por classe e o
// `.ui-btn` (globals.css) as aplica, com o hover declarativo em
// `:hover:not(:disabled)`. Um destaque pontual sobrescreve só a custom
// property (`style={{ '--btn-bg': … }}`, ver CanvasToolbar). Tamanho, raio e
// espaçamento são classes: `className="px-2"` sobrescreve o padding da
// variante (o `cn` resolve o conflito a favor do className).

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'agent' | 'agent-outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Cores de cada variante, como custom properties lidas pelo `.ui-btn`. */
const colorVariants: Record<ButtonVariant, string> = {
  primary:
    '[--btn-bg:var(--color-accent)] [--btn-bg-h:var(--color-accent-hover)] ' +
    '[--btn-fg:var(--color-text-on-accent)] [--btn-fg-h:var(--color-text-on-accent)] ' +
    '[--btn-bd:transparent] [--btn-bd-h:transparent]',
  secondary:
    '[--btn-bg:var(--surface-base)] [--btn-bg-h:var(--surface-overlay)] ' +
    '[--btn-fg:var(--color-text-primary)] [--btn-fg-h:var(--color-text-primary)] ' +
    '[--btn-bd:var(--color-border)] [--btn-bd-h:var(--color-border-hover)]',
  ghost:
    '[--btn-bg:transparent] [--btn-bg-h:var(--surface-raised)] ' +
    '[--btn-fg:var(--color-text-secondary)] [--btn-fg-h:var(--color-text-primary)] ' +
    '[--btn-bd:transparent] [--btn-bd-h:transparent]',
  danger:
    '[--btn-bg:var(--color-error)] [--btn-bg-h:var(--color-error)] ' +
    '[--btn-fg:var(--color-text-on-accent)] [--btn-fg-h:var(--color-text-on-accent)] ' +
    '[--btn-bd:transparent] [--btn-bd-h:transparent]',
  agent:
    '[--btn-bg:var(--color-amber)] [--btn-bg-h:var(--color-amber-hover)] ' +
    '[--btn-fg:var(--color-text-on-amber)] [--btn-fg-h:var(--color-text-on-amber)] ' +
    '[--btn-bd:transparent] [--btn-bd-h:transparent]',
  'agent-outline':
    '[--btn-bg:transparent] [--btn-bg-h:var(--color-amber-muted)] ' +
    '[--btn-fg:var(--color-text-amber)] [--btn-fg-h:var(--color-text-amber)] ' +
    '[--btn-bd:var(--color-amber)] [--btn-bd-h:var(--color-amber)]',
}

export const buttonVariants = cva(
  'ui-btn group/btn inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
    'transition-all duration-(--transition-fast) active:translate-y-px ' +
    'disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: colorVariants,
      size: {
        sm: 'h-[30px] px-2.5 text-caption',
        md: 'h-9 px-3.5 text-body',
        lg: 'h-10 px-4 text-body',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', fullWidth: false },
  },
)

const buttonIconVariants = cva('inline-flex shrink-0 items-center', {
  variants: { size: { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-4 w-4' } },
  defaultVariants: { size: 'md' },
})

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** Quando true, ocupa 100% da largura. */
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    loading = false,
    disabled,
    children,
    className,
    type,
    ...props
  },
  ref,
) {
  const iconClass = buttonIconVariants({ size })
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 'xs' : 'sm'} tone="current" />
      ) : leadingIcon ? (
        <span className={iconClass}>{leadingIcon}</span>
      ) : null}
      {children}
      {trailingIcon ? <span className={iconClass}>{trailingIcon}</span> : null}
    </button>
  )
})

// ── IconButton — botão quadrado/circular para ícones isolados ──────────

export const iconButtonVariants = cva(
  'ui-btn inline-flex shrink-0 items-center justify-center transition-all ' +
    'duration-(--transition-fast) disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: colorVariants,
      size: { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10' },
      rounded: {
        sm: 'rounded-sm',
        md: 'rounded-(--radius-md)',
        full: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md', rounded: 'md' },
  },
)

const iconButtonGlyphVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: { size: { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-[18px] w-[18px]' } },
  defaultVariants: { size: 'md' },
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tela-only label para a11y. */
  'aria-label': string
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'sm' | 'md' | 'full'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', rounded = 'md', children, className, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-variant={variant}
      data-size={size}
      className={cn(iconButtonVariants({ variant, size, rounded }), className)}
      {...props}
    >
      <span className={iconButtonGlyphVariants({ size })}>{children}</span>
    </button>
  )
})
