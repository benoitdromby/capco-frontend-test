import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { jsonApiError } from '../test/json-api-error'
import { server } from '../test/server'

import { useApplicantLogin } from './useApplicantLogin'

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
  return { queryClient, ...renderHook(() => useApplicantLogin(), { wrapper }) }
}

describe('useApplicantLogin', () => {
  it('resolves the href and clears the query cache on success', async () => {
    const { result, queryClient } = renderWithQueryClient()
    const clearSpy = vi.spyOn(queryClient, 'clear')

    result.current.mutate({ email: 'jane@example.com', password: 'Secret!1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('/applications/current')
    expect(clearSpy).toHaveBeenCalledOnce()
  })

  it('surfaces an invalidCredentials error and does not clear the cache', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () =>
        jsonApiError(401, 'invalid-credentials', 'Invalid email or password'),
      ),
    )
    const { result, queryClient } = renderWithQueryClient()
    const clearSpy = vi.spyOn(queryClient, 'clear')

    result.current.mutate({ email: 'jane@example.com', password: 'wrong' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('invalidCredentials')
    expect(clearSpy).not.toHaveBeenCalled()
  })

  it('surfaces a network error when the request fails to reach the server', async () => {
    server.use(
      http.post('/api/v1/applicant-sessions', () => HttpResponse.error()),
    )
    const { result } = renderWithQueryClient()

    result.current.mutate({ email: 'jane@example.com', password: 'Secret!1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('network')
  })
})
