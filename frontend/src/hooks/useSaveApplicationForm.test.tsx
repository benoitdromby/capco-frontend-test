import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { applicationFormQueryKey } from './useApplicationForm'
import { useSaveApplicationForm } from './useSaveApplicationForm'

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
    ...renderHook(() => useSaveApplicationForm('app-1'), { wrapper }),
  }
}

describe('useSaveApplicationForm', () => {
  it('updates the form query cache with the new version on success', async () => {
    const { result, queryClient } = renderWithQueryClient()

    result.current.mutate({
      step: 'personal-details',
      answers: { name: 'Jane Doe' },
      version: 0,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.version).toBe(1)
    expect(queryClient.getQueryData(applicationFormQueryKey('app-1'))).toEqual(
      result.current.data,
    )
  })

  it('surfaces a conflict error and leaves the cache untouched on a stale version', async () => {
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
    const { result, queryClient } = renderWithQueryClient()

    result.current.mutate({
      step: 'personal-details',
      answers: { name: 'Jane Doe' },
      version: 0,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('conflict')
    expect(
      queryClient.getQueryData(applicationFormQueryKey('app-1')),
    ).toBeUndefined()
  })
})
