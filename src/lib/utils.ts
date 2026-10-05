/**
 * Utility helpers for the AgentPack frontend.
 */

import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge ensinado sobre a escala própria do `@theme` (src/styles/globals.css).
 *
 * Sem isto ele não reconhece `text-caption`/`text-micro` como TAMANHO de fonte:
 * trata como cor (todo `text-<x>` desconhecido vira cor) e apagaria um
 * `text-text-primary` ao lado deles, ou manteria dois tamanhos juntos. O mesmo
 * vale para os raios (`rounded-chip`, `rounded-modal`), a sombra `accent-glow`
 * e os espaçamentos nomeados (`w-sidebar`, `h-header`). As chaves do `theme`
 * são os namespaces do Tailwind 4 (`--text-*`, `--radius-*`, `--shadow-*`,
 * `--spacing-*`): ao acrescentar uma chave nessas escalas do `@theme`,
 * acrescente aqui também (o teste `ui-primitives.test.tsx` cobre cada uma).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'title', 'subtitle', 'heading', 'body', 'caption', 'micro'],
      radius: ['chip', 'modal'],
      shadow: ['accent-glow'],
      spacing: ['sidebar', 'sidebar-collapsed', 'header'],
    },
  },
})

/**
 * Compõe classes: `clsx` (strings, arrays, objetos condicionais) e depois
 * `tailwind-merge`, que resolve conflitos a favor da ÚLTIMA classe
 * (`cn('p-2', 'p-4') === 'p-4'`). É o que deixa um `className` passado a um
 * primitivo sobrescrever a variante dele de forma previsível.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
