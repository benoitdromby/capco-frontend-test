import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../../test/server'

import { CurrentApplicationJourney } from './-current-application-journey'

expect.extend(toHaveNoViolations)

function renderJourney(onNavigate = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    onNavigate,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CurrentApplicationJourney onNavigate={onNavigate} />
      </QueryClientProvider>,
    ),
  }
}

describe('CurrentApplicationJourney', () => {
  it('shows the start state and creates a draft before navigating when none exists', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderJourney()

    const action = await screen.findByRole('button', {
      name: 'Start application',
    })
    await user.click(action)

    expect(onNavigate).toHaveBeenCalledWith(
      '/applications/00000000-0000-4000-8000-000000000003/personal-details',
    )
  })

  it('shows the resume state and navigates directly without creating a draft', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/current', () =>
        HttpResponse.json({
          data: {
            type: 'applicant-applications',
            id: 'app-1',
            attributes: {
              status: 'draft',
              currentStep: 'identity-and-address',
              href: '/applications/app-1/identity-and-address',
              progress: [
                { step: 'personal-details', state: 'complete' },
                { step: 'identity-and-address', state: 'current' },
              ],
            },
          },
        }),
      ),
    )
    const user = userEvent.setup()
    const { onNavigate } = renderJourney()

    const action = await screen.findByRole('button', {
      name: 'Resume application',
    })
    // No POST /api/v1/applicant-applications handler is registered beyond
    // the default; resuming must not call it (onUnhandledRequest: 'error'
    // would fail this test if it did).
    await user.click(action)

    expect(onNavigate).toHaveBeenCalledWith(
      '/applications/app-1/identity-and-address',
    )
  })

  it('shows a session-expired notice without an unsaved-changes warning on a 401', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/current', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '401',
                code: 'authentication-required',
                detail: 'Sign in to continue.',
              },
            ],
          },
          { status: 401 },
        ),
      ),
    )
    renderJourney()

    expect(await screen.findByText(/session has expired/)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
  })

  it('shows a retryable error for an unexpected load failure', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/current', () =>
        HttpResponse.error(),
      ),
    )
    renderJourney()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveFocus()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
  })

  it('shows an inline error and does not navigate when draft creation fails', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '403',
                code: 'access-denied',
                detail: 'You do not have permission to access this resource.',
              },
            ],
          },
          { status: 403 },
        ),
      ),
    )
    const user = userEvent.setup()
    const { onNavigate } = renderJourney()

    const action = await screen.findByRole('button', {
      name: 'Start application',
    })
    await user.click(action)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveFocus()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('has no automated accessibility violations in the start state', async () => {
    const { container } = renderJourney()
    await screen.findByRole('button', { name: 'Start application' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
