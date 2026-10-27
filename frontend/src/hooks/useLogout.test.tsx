import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLogout } from './useLogout'

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
  return { queryClient, ...renderHook(() => useLogout(), { wrapper }) }
}

describe('useLogout', () => {
  it('clears the query cache on success', async () => {
    const { result, queryClient } = renderWithQueryClient()
    const clearSpy = vi.spyOn(queryClient, 'clear')

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(clearSpy).toHaveBeenCalledOnce()
  })
})
