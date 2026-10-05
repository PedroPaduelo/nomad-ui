/**
 * CodeBlock do kit (UI-STD-03): região com nome, realce de JSON sem HTML e
 * botão de copiar que chama onCopy.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { CodeBlock } from '../CodeBlock'

describe('CodeBlock', () => {
  it('realça JSON por token e preserva o texto exato', () => {
    const code = JSON.stringify({ model: 'claude', tokens: 12, stream: true, error: null, html: '<b>x</b>' }, null, 2)
    render(<CodeBlock code={code} language="json" aria-label="Request body" copyable={false} />)
    const region = screen.getByRole('region', { name: 'Request body' })
    expect(region.textContent).toBe(code)
    expect(region.querySelector('b')).toBeNull()
    expect(screen.getByText('"model"')).toHaveClass('text-text-accent')
    expect(screen.getByText('"claude"')).toHaveClass('text-status-success')
    expect(screen.getByText('12')).toHaveClass('text-status-info')
    expect(screen.getByText('true')).toHaveClass('text-amber')
  })

  it('copia o código e avisa quem usa', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const onCopy = vi.fn()
    render(<CodeBlock code="hello" aria-label="System prompt" copyLabel="system prompt" onCopy={onCopy} />)
    await user.click(screen.getByRole('button', { name: 'Copiar system prompt' }))
    expect(writeText).toHaveBeenCalledWith('hello')
    await waitFor(() => expect(onCopy).toHaveBeenCalledOnce())
  })
})
