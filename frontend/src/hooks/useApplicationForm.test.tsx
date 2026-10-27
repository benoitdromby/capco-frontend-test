import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useApplicationForm } from './useApplicationForm'

import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useApplicationForm', () => {
  it('loads and maps the form for the given application', async () => {
    const { result } = renderHook(() => useApplicationForm('app-1'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('app-1')
    expect(result.current.data?.version).toBe(0)
    expect(result.current.data?.answers).toEqual({ consentConfirmed: false })
  })

  it('does not fetch when the application id is empty', () => {
    const { result } = renderHook(() => useApplicationForm(''), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })
})
