import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { ApiErrorAlert } from './ApiErrorAlert'

describe('ApiErrorAlert', () => {
  it('renders nothing for a validation-kind error', () => {
    const { container } = render(<ApiErrorAlert kind="validation" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a generic message for a malformed document', () => {
    render(<ApiErrorAlert kind="malformed" />)
    expect(screen.getByRole('alert').textContent).toContain(
      'Something went wrong. Please try again.',
    )
  })

  it('shows the retry delay for a rate-limited error', () => {
    render(<ApiErrorAlert kind="rateLimited" retryAfterSeconds={45} />)
    expect(screen.getByRole('alert').textContent).toContain('45 seconds')
  })

  it('shows a connectivity message for a network error', () => {
    render(<ApiErrorAlert kind="network" />)
    expect(screen.getByRole('alert').textContent).toContain('connection')
  })

  it("falls back to the response's detail text for other kinds", () => {
    render(<ApiErrorAlert kind="server" detail="The service is unavailable." />)
    expect(screen.getByRole('alert').textContent).toContain(
      'The service is unavailable.',
    )
  })

  it('lets a caller override the default message for a peculiar case', () => {
    render(
      <ApiErrorAlert kind="conflict">
        An account already exists. <a href="/sign-in">Sign in</a> instead.
      </ApiErrorAlert>,
    )
    expect(screen.getByRole('alert').textContent).toContain('already exists')
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeDefined()
  })

  it('forwards a ref so the alert can receive focus', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ApiErrorAlert ref={ref} kind="malformed" />)
    ref.current?.focus()
    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })
})
