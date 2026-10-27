import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'

import { useCurrentApplication } from './useCurrentApplication'

import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCurrentApplication', () => {
  it('resolves null for a 204 no-draft response', async () => {
    const { result } = renderHook(() => useCurrentApplication(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('resolves the draft summary for a 200 response', async () => {
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
    const { result } = renderHook(() => useCurrentApplication(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('app-1')
    expect(result.current.data?.currentStep).toBe('identity-and-address')
  })

  it('surfaces an unauthenticated error for an expired session', async () => {
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
    const { result } = renderHook(() => useCurrentApplication(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.kind).toBe('unauthenticated')
  })
})
