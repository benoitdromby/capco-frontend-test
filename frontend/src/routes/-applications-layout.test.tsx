import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../test/server'

import { ApplicationsLayout } from './-applications-layout'

expect.extend(toHaveNoViolations)

function renderLayout(onLoggedOut = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return {
    onLoggedOut,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/applications/current']}>
          <Routes>
            <Route
              path="/applications/current"
              element={<ApplicationsLayout onLoggedOut={onLoggedOut} />}
            >
              <Route index element={<p>Journey content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('ApplicationsLayout', () => {
  it('renders its child route content', () => {
    renderLayout()
    expect(screen.getByText('Journey content')).toBeInTheDocument()
  })

  it('logs out and calls onLoggedOut on success', async () => {
    const user = userEvent.setup()
    const { onLoggedOut } = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(onLoggedOut).toHaveBeenCalledOnce()
  })

  it('shows an inline error and does not call onLoggedOut when logout fails', async () => {
    server.use(
      http.delete('/api/v1/applicant-sessions/current', () =>
        HttpResponse.json(
          {
            errors: [
              { status: '500', code: 'internal-error', detail: 'Broke.' },
            ],
          },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    const { onLoggedOut } = renderLayout()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Broke.')
    expect(onLoggedOut).not.toHaveBeenCalled()
  })

  it('has no automated accessibility violations on initial render or after a failed logout', async () => {
    server.use(
      http.delete('/api/v1/applicant-sessions/current', () =>
        HttpResponse.json(
          {
            errors: [
              { status: '500', code: 'internal-error', detail: 'Broke.' },
            ],
          },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    const { container } = renderLayout()

    expect(await axe(container)).toHaveNoViolations()

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await screen.findByRole('alert')
    expect(await axe(container)).toHaveNoViolations()
  })
})
