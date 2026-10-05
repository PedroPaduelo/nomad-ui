// ── Label — rótulo de seção (eyebrow) ──────────────────────────────────
//
// O rótulo miúdo em caixa alta que aparece acima de listas e grupos
// ("PROJETOS", "RECENTES"). Antes era escrito à mão em três grafias
// diferentes (`tracking-wide` × `tracking-wider`, `text-xs` × `text-[11px]`,
// FC-04). A escala é a `text-micro` do `@theme` (globals.css), que já traz o
// tracking e o peso.
//
// - `as`: o elemento (span por padrão). Use `h2`/`h3` quando o rótulo for o
//   título do grupo, `label` com `htmlFor` quando nomear um campo, `legend`
//   dentro de `fieldset`.
// - `tone`: `muted` (padrão, text-3) ou `default` (text-2, mais contraste).
//
// Rótulo de CAMPO de formulário (texto normal, com obrigatório/ajuda) é o
// `Field`; título de seção com ação é o `SectionTitle` (que usa este Label
// no eyebrow).

import { createElement, type HTMLAttributes, type LabelHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const labelVariants = cva('text-micro uppercase', {
  variants: {
    tone: { muted: 'text-text-tertiary', default: 'text-text-secondary' },
  },
  defaultVariants: { tone: 'muted' },
})

type LabelElement = 'span' | 'p' | 'div' | 'h2' | 'h3' | 'h4' | 'label' | 'legend'

export interface LabelProps
  extends
    HTMLAttributes<HTMLElement>,
    Pick<LabelHTMLAttributes<HTMLLabelElement>, 'htmlFor'>,
    VariantProps<typeof labelVariants> {
  as?: LabelElement
}

export function Label({ as = 'span', tone, className, htmlFor, ...props }: LabelProps) {
  return createElement(as, {
    'data-slot': 'label',
    ...props,
    ...(as === 'label' ? { htmlFor } : {}),
    className: cn(labelVariants({ tone }), className),
  })
}
