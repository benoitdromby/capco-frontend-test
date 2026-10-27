import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../test/server'

import { SignInForm } from './-sign-in-form'

expect.extend(toHaveNoViolations)

function sessionResponse(href: string) {
  return HttpResponse.json(
    {
      data: {
        type: 'applicant-sessions',
        id: '00000000-0000-4000-8000-000000000002',
        attributes: { href },
      },
    },
    { status: 201 },
  )
}

function renderForm(props: { returnTo?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const onSuccess = vi.fn()
  const onNavigate = vi.fn()
  return {
    onSuccess,
    onNavigate,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SignInForm
          onNavigate={onNavigate}
          onSuccess={onSuccess}
          returnTo={props.returnTo}
        />
      </QueryClientProvider>,
    ),
  }
}

describe('SignInForm', () => {
  it('renders one heading and correct autocomplete values', () => {
    renderForm()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveAttribute(
      'autocomplete',
      'email',
    )
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    )
  })

  it('shows required-field errors and makes no API call when submitted empty', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter your email address.',
    )
    expect(screen.getByLabelText('Email address')).toHaveFocus()
  })

  it('shows a generic invalid-credentials message without attaching it to the email field', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '401',
                code: 'invalid-credentials',
                detail: 'Invalid email or password',
              },
            ],
          },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    const { onSuccess } = renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid email or password')
    expect(alert).toHaveFocus()
    expect(screen.getByLabelText('Email address')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      '',
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows per-field errors from a 400 validation-failed response', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '400',
                code: 'validation-failed',
                detail: 'Enter a valid email address.',
                source: { pointer: '/data/attributes/email' },
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
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    )
  })

  it('shows the retry delay for a rate-limited response', async () => {
    server.use(
      http.post(
        '/api/v1/applicant-sessions',
        () =>
          new HttpResponse(
            JSON.stringify({
              errors: [
                { status: '429', code: 'rate-limited', detail: 'Slow down.' },
              ],
            }),
            { status: 429, headers: { 'Retry-After': '30' } },
          ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('30 seconds')
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    )
  })

  it('shows a generic, focused alert and keeps entered values for an unrecognized error with no detail', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        HttpResponse.json(
          { errors: [{ status: '500', code: 'some-unrecognized-code' }] },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveFocus()
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('shows a generic message and keeps both entered values on a network failure', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () => HttpResponse.error()),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('connection')
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'jane@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('Secret!1')
  })

  it('exposes the pending state accessibly and prevents a duplicate submission while a login is pending', async () => {
    let callCount = 0
    server.use(
      http.post('/api/v1/applicant-sessions', async () => {
        callCount += 1
        await new Promise((resolve) => setTimeout(resolve, 30))
        return sessionResponse('/applications/current')
      }),
    )
    const user = userEvent.setup()
    const { container } = renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // The request is still in flight (artificial delay above). The button's
    // accessible name changes and it reports aria-disabled (not the native
    // `disabled` attribute, so it stays focusable/announceable) while pending.
    const pendingButton = await screen.findByRole('button', {
      name: 'Signing in…',
    })
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true')

    // Submitting again — however it might be triggered in a real browser (a
    // second click, or Enter in a field) — must not start a second request.
    const form = container.querySelector('form')
    if (!form) throw new Error('expected a form element')
    fireEvent.submit(form)

    await screen.findByRole('button', { name: 'Sign in' })
    expect(callCount).toBe(1)
  })

  it('calls onSuccess with the API href, not returnTo', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        sessionResponse('/applications/current'),
      ),
    )
    const user = userEvent.setup()
    const { onSuccess } = renderForm({ returnTo: '/applications/other' })

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('/applications/current'),
    )
  })

  it('refuses to navigate and shows a generic error for an unsafe href', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        sessionResponse('https://attacker.example/phish'),
      ),
    )
    const user = userEvent.setup()
    const { onSuccess } = renderForm()

    await user.type(screen.getByLabelText('Email address'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret!1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveFocus()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('has no automated accessibility violations on initial render or after a failed submit', async () => {
    const user = userEvent.setup()
    const { container } = renderForm()

    expect(await axe(container)).toHaveNoViolations()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
