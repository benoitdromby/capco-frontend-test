import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../test/server'

import { CreateAccountForm } from './-create-account-form'

expect.extend(toHaveNoViolations)

function renderForm(onNavigate = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return {
    onNavigate,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateAccountForm onNavigate={onNavigate} />
      </QueryClientProvider>,
    ),
  }
}

describe('CreateAccountForm', () => {
  it('renders one heading, visible labels, and the password guidance before any input', () => {
    renderForm()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument()
    const email = screen.getByLabelText('Email address')
    const password = screen.getByLabelText('Password')
    const confirmPassword = screen.getByLabelText('Confirm password')
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(password).toHaveAttribute('autocomplete', 'new-password')
    expect(confirmPassword).toHaveAttribute('autocomplete', 'new-password')
    expect(password).toHaveAccessibleDescription(
      /at least six characters.*uppercase.*special character/i,
    )
  })

  it('shows per-field errors and makes no API call when submitted empty', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter your email address.',
    )
    expect(screen.getByLabelText('Email address')).toHaveFocus()
  })

  it('keeps the password guidance visible alongside a password error', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'weak')
    await user.type(screen.getByLabelText('Confirm password'), 'weak')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAccessibleDescription(
      /at least six characters.*uppercase.*special character.*at least six characters.*uppercase.*special character/i,
    )
    expect(password).toHaveFocus()
  })

  it('reports a mismatched confirmation on the confirmation field only', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!2')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAccessibleDescription('Passwords do not match.')
    expect(screen.getByLabelText('Confirm password')).toHaveFocus()
  })

  it('registers, shows a confirmation panel, and focuses its heading', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Account created',
    })
    expect(heading).toHaveFocus()
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Sign in' }))
    expect(onNavigate).toHaveBeenCalledWith('/sign-in')
  })

  it('shows per-field errors from a 400 validation-failed response', async () => {
    server.use(
      http.post('/api/v1/applicant-accounts', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '400',
                code: 'validation-failed',
                detail: 'Enter a valid email address.',
                source: { pointer: '/data/attributes/email' },
              },
              {
                status: '400',
                code: 'validation-failed',
                detail: 'Use at least 6 characters.',
                source: { pointer: '/data/attributes/password' },
              },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a conflict message with a sign-in link, focused, for a duplicate email', async () => {
    server.use(
      http.post('/api/v1/applicant-accounts', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '409',
                code: 'email-already-registered',
                detail: 'Taken.',
              },
            ],
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('already exists')
    expect(alert).toHaveFocus()
    expect(
      within(alert).getByRole('link', { name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('shows the retry delay for a rate-limited response', async () => {
    server.use(
      http.post(
        '/api/v1/applicant-accounts',
        () =>
          new HttpResponse(
            JSON.stringify({
              errors: [
                { status: '429', code: 'rate-limited', detail: 'Slow down.' },
              ],
            }),
            { status: 429, headers: { 'Retry-After': '45' } },
          ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('45 seconds')
  })

  it('shows a generic message and keeps entered values on a network failure', async () => {
    server.use(
      http.post('/api/v1/applicant-accounts', () => HttpResponse.error()),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('connection')
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('has no automated accessibility violations on initial render or after a failed submit', async () => {
    const user = userEvent.setup()
    const { container } = renderForm()

    expect(await axe(container)).toHaveNoViolations()

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
