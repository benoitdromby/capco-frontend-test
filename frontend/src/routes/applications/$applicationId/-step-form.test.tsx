import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/server'

import { StepForm, type StepFormProps } from './-step-form'

import type { ApplicantApplicationForm } from '../../../api/applicant-applications'

expect.extend(toHaveNoViolations)

afterEach(() => {
  vi.restoreAllMocks()
})

const defaultForm: ApplicantApplicationForm = {
  id: 'app-1',
  currentStep: 'personal-details',
  steps: [
    { step: 'personal-details', state: 'current' },
    { step: 'identity-and-address', state: 'remaining' },
  ],
  answers: {},
  documentEvidence: { present: false },
  version: 0,
}

async function fillPersonalDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Jane Doe')
  await user.type(screen.getByLabelText('Date of birth'), '1990-01-01')
  await user.type(screen.getByLabelText('Country'), 'FR')
  await user.type(screen.getByLabelText('Nationality'), 'FR')
  await user.type(screen.getByLabelText('Email'), 'jane@example.com')
  await user.type(screen.getByLabelText('Phone'), '+33612345678')
  await user.click(
    screen.getByRole('checkbox', {
      name: 'I confirm these details are accurate and belong to me.',
    }),
  )
}

function renderStepForm(props: Partial<StepFormProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const onNavigate = vi.fn()
  const refetch = vi.fn().mockResolvedValue(undefined)
  return {
    onNavigate,
    refetch,
    ...render(
      <QueryClientProvider client={queryClient}>
        <StepForm
          applicationId="app-1"
          step="personal-details"
          form={defaultForm}
          refetch={refetch}
          onNavigate={onNavigate}
          {...props}
        />
      </QueryClientProvider>,
    ),
  }
}

describe('StepForm', () => {
  it('populates every previously saved answer, including the checkbox', () => {
    renderStepForm({
      form: {
        ...defaultForm,
        answers: {
          name: 'Jane Doe',
          dateOfBirth: '1990-01-01',
          country: 'FR',
          nationality: 'FR',
          email: 'jane@example.com',
          phone: '+33612345678',
          consentConfirmed: true,
        },
      },
    })

    expect(screen.getByLabelText('Name')).toHaveValue('Jane Doe')
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1990-01-01')
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com')
    expect(
      screen.getByRole('checkbox', {
        name: 'I confirm these details are accurate and belong to me.',
      }),
    ).toBeChecked()
  })

  it('shows "Saved at" after a successful save, then "Unsaved changes" on the next edit', async () => {
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(/^Saved at \d{1,2}:\d{2}/),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument()
  })

  it('saves successfully with other required fields still empty — Save never requires completeness', async () => {
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(/^Saved at \d{1,2}:\d{2}/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Date of birth is required.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Date of birth')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('saves successfully but still flags a malformed value already entered, even though other fields are empty', async () => {
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(/^Saved at \d{1,2}:\d{2}/),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('preserves entered values and stays retryable when save fails', async () => {
    server.use(
      http.patch('/api/v1/applicant-applications/:applicationId/form', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '500',
                code: 'internal-error',
                detail: 'Something broke.',
              },
            ],
          },
          { status: 500 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something broke.',
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Jane Doe')
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('shows a Reload action on a version conflict', async () => {
    server.use(
      http.patch('/api/v1/applicant-applications/:applicationId/form', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '409',
                code: 'form-version-conflict',
                detail: 'Reload the form and try again.',
              },
            ],
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByRole('button', { name: 'Reload' }),
    ).toBeInTheDocument()
  })

  it('shows a session-expired notice with the warning when a save fails with 401', async () => {
    server.use(
      http.patch('/api/v1/applicant-applications/:applicationId/form', () =>
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
    const user = userEvent.setup()
    renderStepForm()

    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/session has expired/)).toBeInTheDocument()
    expect(
      screen.getByText(/unsaved changes on this page will be lost/i),
    ).toBeInTheDocument()
  })

  it('navigates to the next step when Continue reports this step complete', async () => {
    server.use(
      http.patch('/api/v1/applicant-applications/:applicationId/form', () =>
        HttpResponse.json({
          data: {
            type: 'applicant-application-forms',
            id: 'app-1',
            attributes: {
              status: 'draft',
              currentStep: 'identity-and-address',
              steps: [
                { step: 'personal-details', state: 'complete' },
                { step: 'identity-and-address', state: 'current' },
              ],
              answers: {},
              documentEvidence: { present: false },
              version: 1,
            },
          },
        }),
      ),
    )
    const user = userEvent.setup()
    const { onNavigate } = renderStepForm()

    await fillPersonalDetails(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onNavigate).toHaveBeenCalledWith(
      '/applications/app-1/identity-and-address',
    )
  })

  it('blocks Continue and shows a field error when a required field is empty, without calling the API', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderStepForm()

    // No PATCH handler override; onUnhandledRequest: 'error' in setup.ts
    // would fail this test if validation didn't actually block the call.
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('stays and shows the server-driven incomplete message when every client-validatable field is filled but the server still reports this step incomplete', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderStepForm()

    // All fields filled (client validation passes); default PATCH handler
    // still echoes the step back as "current", never "complete" — simulating
    // a server-side completeness reason the client can't see on its own.
    await fillPersonalDetails(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      await screen.findByText(
        'Complete all required fields before continuing.',
      ),
    ).toBeInTheDocument()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('shows a pending indicator while uploading and resets the input on success', async () => {
    const user = userEvent.setup()
    renderStepForm({ step: 'identity-and-address' })

    const file = new File(['data'], 'document.png', { type: 'image/png' })
    const input = screen.getByLabelText('Document evidence')
    await user.upload(input, file)

    await screen.findByText('Document evidence not provided yet.')
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the real rejection detail and resets the input when upload fails', async () => {
    server.use(
      http.post(
        '/api/v1/applicant-applications/:applicationId/document-evidence',
        () =>
          HttpResponse.json(
            {
              errors: [
                {
                  status: '422',
                  code: 'unprocessable-form',
                  detail: 'Document media type is not accepted.',
                },
              ],
            },
            { status: 422 },
          ),
      ),
    )
    const user = userEvent.setup()
    renderStepForm({ step: 'identity-and-address' })

    // The server rejects this one regardless of its (accepted) MIME type —
    // the input's `accept` filter would otherwise silently skip a file
    // userEvent.upload() considers disallowed before any handler runs.
    const file = new File(['data'], 'document.png', { type: 'image/png' })
    const input = screen.getByLabelText('Document evidence')
    await user.upload(input, file)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Document media type is not accepted.')
    expect((input as HTMLInputElement).value).toBe('')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Document media type is not accepted.',
    )
  })

  it('has no automated accessibility violations on initial render or after a failed save', async () => {
    server.use(
      http.patch('/api/v1/applicant-applications/:applicationId/form', () =>
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
    const { container } = renderStepForm()

    expect(await axe(container)).toHaveNoViolations()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert')
    expect(await axe(container)).toHaveNoViolations()
  })
})
