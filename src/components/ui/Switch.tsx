// ── Switch — liga/desliga (padrão APG "Switch") ───────────────────────
//
// Sobre o Switch headless do Base UI: `role="switch"` com `aria-checked`,
// Espaço e Enter alternam, entra na ordem de Tab e o estado vai num
// `<input type="checkbox">` escondido (funciona dentro de <form>). Criado na
// Fase 2 (UI-STD-02) para substituir o `Switch` do Astryx e o do shadcn
// (Radix), que saíram na UI-STD-07.
//
// Nome acessível: `label` (texto visível ao lado, num <label> que também
// alterna ao clicar; `description` vira o `aria-describedby`) ou `aria-label`
// quando o controle fica sozinho (linha de tabela, toolbar). Cor só por
// token: trilho `surface-overlay` + borda quando desligado, `accent` quando
// ligado; o botão usa `text-tertiary` / `on-accent`.
//
// Uso:
//   <Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Ativar chave" />
//   <Switch label="Janela deslizante" checked={on} onCheckedChange={setOn} />

import { forwardRef, useId, type ReactNode } from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const switchTrackVariants = cva(
  'group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border p-0.5 ' +
    'transition-colors duration-(--transition-fast) outline-hidden ' +
    'border-border-hover bg-surface-overlay ' +
    'data-checked:border-accent data-checked:bg-accent ' +
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-body) ' +
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  {
    variants: {
      size: { sm: 'h-4 w-7', md: 'h-5 w-9' },
    },
    defaultVariants: { size: 'md' },
  },
)

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-text-tertiary shadow-sm ' +
    'transition-transform duration-(--transition-fast) translate-x-0 ' +
    'group-data-checked/switch:bg-(--color-text-on-accent)',
  {
    variants: {
      size: {
        sm: 'h-2.5 w-2.5 group-data-checked/switch:translate-x-3',
        md: 'h-3.5 w-3.5 group-data-checked/switch:translate-x-4',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface SwitchProps {
  /** Estado controlado; use com `onCheckedChange`. */
  checked?: boolean
  /** Estado inicial (não controlado). */
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Texto visível ao lado do controle; vira o nome acessível. */
  label?: ReactNode
  /** Texto de apoio abaixo do rótulo (só com `label`); vira a descrição acessível. */
  description?: ReactNode
  size?: 'sm' | 'md'
  /** Id do input escondido (para um `<label htmlFor>` externo). */
  id?: string
  name?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  className?: string
  'data-testid'?: string
}

export const Switch = forwardRef<HTMLElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked,
    onCheckedChange,
    disabled = false,
    label,
    description,
    size = 'md',
    id,
    name,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'data-testid': testId,
  },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? `${autoId}-switch`
  const descriptionId = `${inputId}-description`
  const describedBy =
    [ariaDescribedBy, label && description ? descriptionId : undefined].filter(Boolean).join(' ') ||
    undefined

  const control = (
    <BaseSwitch.Root
      ref={ref}
      id={inputId}
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange ? (next) => onCheckedChange(next) : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={describedBy}
      data-testid={testId}
      className={cn(switchTrackVariants({ size }), label ? undefined : className)}
    >
      <BaseSwitch.Thumb className={switchThumbVariants({ size })} />
    </BaseSwitch.Root>
  )

  if (!label) return control

  return (
    <div
      data-slot="switch"
      className={cn('inline-flex items-start gap-2.5', disabled && 'opacity-70', className)}
    >
      <span className={cn('inline-flex items-center', size === 'md' ? 'h-5' : 'h-4')}>{control}</span>
      <span className="grid gap-0.5">
        <label
          htmlFor={inputId}
          className={cn(
            'text-body font-medium leading-5 text-text-primary',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
        {description ? (
          <span id={descriptionId} className="text-caption text-text-tertiary">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  )
})
