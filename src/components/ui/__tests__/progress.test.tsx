/**
 * Progress do kit: `tone` mapeia para os tokens de status do preenchimento
 * (PKG-FIXES #5, reportado pela [LB] NUI-MIG-02).
 *
 * Antes, o `className` ia só na trilha (outer) e o fill era sempre
 * `bg-status-success`. Apps pintavam o fill via className próprio (ex.:
 * `bg-status-warning`), o que parou de funcionar com a mudança de estrutura.
 * Patch aditivo: nova prop `tone?: ProgressTone` resolve em uma classe
 * Tailwind do `bg-status-*` ou `bg-accent` no fill, com `data-tone` para
 * testabilidade e CSS.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Progress } from '../Progress'

describe('Progress', () => {
  it('sem tone: fill usa bg-status-success (default, comportamento atual preservado)', () => {
    render(<Progress value={50} aria-label="uso" />)
    const root = screen.getByRole('progressbar', { name: 'uso' })
    expect(root).toHaveClass('w-full')
    const fill = root.firstElementChild as HTMLElement
    expect(fill).toHaveClass('bg-status-success')
  })

  it('tone="warning": fill usa bg-status-warning e data-tone="warning"', () => {
    render(<Progress value={80} tone="warning" aria-label="uso" />)
    const root = screen.getByRole('progressbar', { name: 'uso' })
    expect(root).toHaveAttribute('data-tone', 'warning')
    const fill = root.firstElementChild as HTMLElement
    expect(fill).toHaveClass('bg-status-warning')
    expect(fill).not.toHaveClass('bg-status-success')
  })

  it('tone="error": fill usa bg-status-error', () => {
    render(<Progress value={100} tone="error" aria-label="uso" />)
    const fill = screen.getByRole('progressbar', { name: 'uso' }).firstElementChild as HTMLElement
    expect(fill).toHaveClass('bg-status-error')
  })

  it('tone="accent": fill usa bg-accent (não bg-status-*)', () => {
    render(<Progress value={40} tone="accent" aria-label="uso" />)
    const fill = screen.getByRole('progressbar', { name: 'uso' }).firstElementChild as HTMLElement
    expect(fill).toHaveClass('bg-accent')
    expect(fill).not.toHaveClass('bg-status-success')
  })

  it('tone="info": fill usa bg-status-info', () => {
    render(<Progress value={60} tone="info" aria-label="uso" />)
    const fill = screen.getByRole('progressbar', { name: 'uso' }).firstElementChild as HTMLElement
    expect(fill).toHaveClass('bg-status-info')
  })

  it('fillClassName extra: vai PARA o fill (não para a trilha) — prop nova', () => {
    render(<Progress value={50} fillClassName="opacity-50" aria-label="uso" />)
    const fill = screen.getByRole('progressbar', { name: 'uso' }).firstElementChild as HTMLElement
    expect(fill).toHaveClass('opacity-50')
  })

  it('className segue indo na trilha (não no fill) — comportamento atual preservado', () => {
    render(<Progress value={50} className="h-3" aria-label="uso" />)
    const root = screen.getByRole('progressbar', { name: 'uso' })
    expect(root).toHaveClass('h-3')
    const fill = root.firstElementChild as HTMLElement
    expect(fill).not.toHaveClass('h-3')
  })

  it('value é clampeado em [0, 100] e aria-valuenow reflete o clamp', () => {
    const { rerender } = render(<Progress value={150} aria-label="uso" />)
    expect(screen.getByRole('progressbar', { name: 'uso' })).toHaveAttribute('aria-valuenow', '100')
    rerender(<Progress value={-10} aria-label="uso" />)
    expect(screen.getByRole('progressbar', { name: 'uso' })).toHaveAttribute('aria-valuenow', '0')
  })
})