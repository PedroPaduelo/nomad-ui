// ── Page — wrapper raiz de tela ────────────────────────────────────────
//
// 11 telas escreveram 6 wrappers raiz diferentes (`space-y-4`, `space-y-5`,
// `flex flex-col gap-5 p-5`, ...). Este componente transforma a escolha do
// wrapper em decisão de variante, não em erro de digitação.
//
// Ver PLANO §2.7 e §3.2 L3 item 3.

import type { ReactNode } from 'react'

export type PageVariant = 'default' | 'split' | 'reader' | 'dashboard'

export interface PageProps {
  /**
   * - `default`   — coluna com gap 20px e padding 20px (telas de listagem/CRUD).
   * - `split`     — mestre-detalhe; os filhos decidem a própria largura.
   * - `reader`    — leitura em tela cheia, sem padding (KnowledgeView).
   * - `dashboard` — coluna com gap 24px (respiro maior entre blocos de KPI).
   */
  variant?: PageVariant
  children: ReactNode
  className?: string
}

const variantMap: Record<PageVariant, string> = {
  default: 'flex h-full min-h-0 flex-col gap-5 p-5',
  split: 'flex h-full min-h-0',
  reader: 'h-dvh overflow-y-auto bg-surface-body',
  dashboard: 'flex h-full min-h-0 flex-col gap-6 p-5',
}

/**
 * Wrapper raiz de uma tela.
 *
 * @example
 * <Page variant="dashboard">
 *   <PageHeader title="Projeto" />
 *   ...
 * </Page>
 */
export function Page({ variant = 'default', children, className = '' }: PageProps) {
  return <div className={`${variantMap[variant]} ${className}`.trim()}>{children}</div>
}
