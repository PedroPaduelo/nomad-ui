// ── Spinner — indicador de carregamento ────────────────────────────────
//
// Substitui os `<div className="animate-spin rounded-full border-2 …">`
// montados à mão (cada um com um token de cor diferente, FC-04).
//
// - Com `label`: vira `role="status"` com nome acessível (o leitor de tela
//   anuncia "Carregando o projeto"). Use quando o spinner é o único sinal
//   de que algo está acontecendo.
// - Sem `label`: decorativo (`aria-hidden`). Use dentro de um controle que já
//   diz o estado (Button com `loading` põe `aria-busy`).
//
// Tons: `accent` (padrão, preenchimento do accent) ou `current` (herda a cor
// do texto — dentro de botões).

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const spinnerVariants = cva('inline-block shrink-0 animate-spin rounded-full border-solid', {
  variants: {
    size: {
      xs: 'h-3 w-3 border-[1.5px]',
      sm: 'h-4 w-4 border-2',
      md: 'h-5 w-5 border-2',
      lg: 'h-8 w-8 border-2',
    },
    // `border-t-transparent` depois da cor: o `cn` apagaria o recorte se
    // ele viesse antes (uma cor de borda geral sobrescreve a do topo).
    tone: {
      accent: 'border-accent border-t-transparent',
      current: 'border-current border-t-transparent',
      muted: 'border-text-tertiary border-t-transparent',
    },
  },
  defaultVariants: { size: 'md', tone: 'accent' },
})

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  /** Nome acessível. Sem ele o spinner é decorativo (`aria-hidden`). */
  label?: string
  className?: string
}

export function Spinner({ size, tone, label, className }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(spinnerVariants({ size, tone }), className)}
    />
  )
}
