import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { applicationFormQueryKey } from './useApplicationForm'
import { useUploadDocumentEvidence } from './useUploadDocumentEvidence'

import type { ReactNode } from 'react'

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  return {
    queryClient,
    ...renderHook(() => useUploadDocumentEvidence('app-1'), { wrapper }),
  }
}

describe('useUploadDocumentEvidence', () => {
  it('invalidates the form query on a successful upload', async () => {
    const { result, queryClient } = renderWithQueryClient()
    queryClient.setQueryData(applicationFormQueryKey('app-1'), {
      id: 'app-1',
      currentStep: 'identity-and-address',
      steps: [],
      answers: {},
      documentEvidence: { present: false },
      version: 3,
    })

    const file = new File(['data'], 'document.png', { type: 'image/png' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ present: true })
    expect(
      queryClient.getQueryState(applicationFormQueryKey('app-1'))
        ?.isInvalidated,
    ).toBe(true)
  })

  it('surfaces the real unprocessable detail text for a rejected file', async () => {
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
    const { result } = renderWithQueryClient()
    const file = new File(['data'], 'document.txt', { type: 'text/plain' })

    result.current.mutate(file)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('unprocessable')
    expect(result.current.error?.detail).toBe(
      'Document media type is not accepted.',
    )
  })
})
