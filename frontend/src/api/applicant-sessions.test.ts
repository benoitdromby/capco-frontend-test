import { afterEach, describe, expect, it, vi } from 'vitest'

import { loginApplicant } from './applicant-sessions'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loginApplicant', () => {
  it('posts the JSON:API session document', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            type: 'applicant-sessions',
            id: '00000000-0000-4000-8000-000000000002',
            attributes: { href: '/applications/current' },
          },
        }),
        { status: 201 },
      ),
    )

    await loginApplicant({ email: 'jane@example.com', password: 'Secret!1' })

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/applicant-sessions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      data: {
        type: 'applicant-sessions',
        attributes: { email: 'jane@example.com', password: 'Secret!1' },
      },
    })
  })

  it('resolves to the href from the response body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            type: 'applicant-sessions',
            id: '00000000-0000-4000-8000-000000000002',
            attributes: { href: '/applications/current' },
          },
        }),
        { status: 201 },
      ),
    )

    await expect(
      loginApplicant({ email: 'jane@example.com', password: 'Secret!1' }),
    ).resolves.toBe('/applications/current')
  })
})
