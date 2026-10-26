import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { useRegisterApplicant } from './useRegisterApplicant'

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
  return renderHook(() => useRegisterApplicant(), { wrapper })
}

describe('useRegisterApplicant', () => {
  it('succeeds without throwing on the no-body 201 response', async () => {
    const { result } = renderWithQueryClient()

    result.current.mutate({ email: 'jane@example.com', password: 'Secret!1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it('surfaces a conflict error for a duplicate email', async () => {
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
    const { result } = renderWithQueryClient()

    result.current.mutate({ email: 'jane@example.com', password: 'Secret!1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('conflict')
  })

  it('surfaces a network error when the request fails to reach the server', async () => {
    server.use(
      http.post('/api/v1/applicant-accounts', () => HttpResponse.error()),
    )
    const { result } = renderWithQueryClient()

    result.current.mutate({ email: 'jane@example.com', password: 'Secret!1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('network')
  })
})
