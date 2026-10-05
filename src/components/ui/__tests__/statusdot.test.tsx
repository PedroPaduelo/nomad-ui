/**
 * StatusDot do kit (UI-STD-03): nome acessível opcional, tom por token e halo.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { StatusDot } from '../StatusDot'

describe('StatusDot', () => {
  it('com label é uma imagem com nome; tom vira classe de token', () => {
    render(<StatusDot tone="success" pulse label="Live updates Live" />)
    const dot = screen.getByRole('img', { name: 'Live updates Live' })
    expect(dot).toHaveAttribute('data-tone', 'success')
    expect(dot.querySelectorAll('.bg-status-success')).toHaveLength(2)
    expect(dot.querySelector('.animate-ping')).not.toBeNull()
  })

  it('sem label é decorativo', () => {
    const { container } = render(<StatusDot tone="error" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.animate-ping')).toBeNull()
  })
})
