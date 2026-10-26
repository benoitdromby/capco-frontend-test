import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerApplicant } from './applicant-accounts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registerApplicant', () => {
  it('posts the JSON:API registration document, never the confirm-password value', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }))

    await registerApplicant({ email: 'jane@example.com', password: 'Secret!1' })

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/applicant-accounts')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      data: {
        type: 'applicant-accounts',
        attributes: { email: 'jane@example.com', password: 'Secret!1' },
      },
    })
  })
})
