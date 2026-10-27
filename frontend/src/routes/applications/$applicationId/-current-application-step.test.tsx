import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/server'

import { CurrentApplicationStep } from './-current-application-step'

function renderStep(step: string, onNavigate = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return {
    onNavigate,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CurrentApplicationStep
          applicationId="app-1"
          step={step}
          onNavigate={onNavigate}
        />
      </QueryClientProvider>,
    ),
  }
}

describe('CurrentApplicationStep', () => {
  it('shows a session-expired notice with the unsaved-changes warning on 401', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/:applicationId/form', () =>
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
    renderStep('personal-details')

    expect(await screen.findByText(/session has expired/)).toBeInTheDocument()
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  })

  it('offers to go to the current application on a 404', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/:applicationId/form', () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: '404',
                code: 'application-not-found',
                detail: 'Application not found.',
              },
            ],
          },
          { status: 404 },
        ),
      ),
    )
    const { onNavigate } = renderStep('personal-details')
    const user = userEvent.setup()

    const action = await screen.findByRole('button', {
      name: 'Go to your application',
    })
    await user.click(action)

    expect(onNavigate).toHaveBeenCalledWith('/applications/current')
  })

  it('offers a retry on an unexpected load failure', async () => {
    server.use(
      http.get('/api/v1/applicant-applications/:applicationId/form', () =>
        HttpResponse.error(),
      ),
    )
    renderStep('personal-details')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveFocus()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
  })

  it('renders the unmodified review step without loading form data', () => {
    renderStep('review')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Review application' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Return to form' }),
    ).toBeInTheDocument()
  })

  it('loads and renders the step form once the form query succeeds', async () => {
    renderStep('personal-details')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Personal details',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('reloads from the server and discards local edits after a version conflict', async () => {
    let getCallCount = 0
    server.use(
      http.get('/api/v1/applicant-applications/:applicationId/form', () => {
        getCallCount += 1
        return HttpResponse.json({
          data: {
            type: 'applicant-application-forms',
            id: 'app-1',
            attributes: {
              status: 'draft',
              currentStep: 'personal-details',
              steps: [
                { step: 'personal-details', state: 'current' },
                { step: 'identity-and-address', state: 'remaining' },
              ],
              answers:
                getCallCount === 1
                  ? { consentConfirmed: false }
                  : { name: 'Server Name', consentConfirmed: false },
              documentEvidence: { present: false },
              version: getCallCount === 1 ? 0 : 5,
            },
          },
        })
      }),
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
    renderStep('personal-details')

    await user.type(await screen.findByLabelText('Name'), 'Old Name')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const reloadButton = await screen.findByRole('button', { name: 'Reload' })
    await user.click(reloadButton)

    await waitFor(() =>
      expect(screen.getByLabelText('Name')).toHaveValue('Server Name'),
    )
  })

  it('does not clobber a concurrently edited field when a document upload triggers a background refetch', async () => {
    let getCallCount = 0
    server.use(
      http.get(
        '/api/v1/applicant-applications/:applicationId/form',
        async () => {
          getCallCount += 1
          if (getCallCount > 1) {
            await new Promise((resolve) => setTimeout(resolve, 20))
          }
          return HttpResponse.json({
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
                answers: { documentType: 'server-value' },
                documentEvidence: { present: getCallCount > 1 },
                version: getCallCount,
              },
            },
          })
        },
      ),
    )
    const user = userEvent.setup()
    renderStep('identity-and-address')

    const documentTypeField = await screen.findByLabelText('Document type')
    await user.clear(documentTypeField)
    await user.type(documentTypeField, 'my-in-progress-value')

    const file = new File(['data'], 'document.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Document evidence'), file)

    await screen.findByText('Document evidence provided.')
    expect(documentTypeField).toHaveValue('my-in-progress-value')
  })
})
