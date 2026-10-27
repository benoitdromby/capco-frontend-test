import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { jsonApiError } from '../test/json-api-error'
import { server } from '../test/server'

import { useCreateApplication } from './useCreateApplication'
import { currentApplicationQueryKey } from './useCurrentApplication'

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
    ...renderHook(() => useCreateApplication(), { wrapper }),
  }
}

describe('useCreateApplication', () => {
  it('seeds the current-application cache with the created draft', async () => {
    const { result, queryClient } = renderWithQueryClient()

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('00000000-0000-4000-8000-000000000003')
    expect(queryClient.getQueryData(currentApplicationQueryKey)).toEqual(
      result.current.data,
    )
  })

  it('surfaces a forbidden error when the CSRF token is missing', async () => {
    server.use(
      http.post('/api/v1/applicant-applications', () =>
        jsonApiError(
          403,
          'access-denied',
          'You do not have permission to access this resource.',
        ),
      ),
    )
    const { result } = renderWithQueryClient()

    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('forbidden')
  })
})
