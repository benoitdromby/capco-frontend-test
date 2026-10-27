import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './client'
import { ApiError } from './errors'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiRequest', () => {
  it('sends the JSON:API Accept header, and Content-Type only with a body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    await apiRequest('/api/v1/example')
    const [, getInit] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(new Headers(getInit.headers).get('Accept')).toBe(
      'application/vnd.api+json',
    )
    expect(new Headers(getInit.headers).has('Content-Type')).toBe(false)

    await apiRequest('/api/v1/example', { method: 'POST', body: { a: 1 } })
    const [, postInit] = fetchSpy.mock.calls[1] as [string, RequestInit]
    expect(new Headers(postInit.headers).get('Content-Type')).toBe(
      'application/vnd.api+json',
    )
    expect(postInit.body).toBe(JSON.stringify({ a: 1 }))
  })

  it('sends a FormData body untouched, with no Content-Type set', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }))
    const formData = new FormData()
    formData.append('file', new Blob(['data']), 'test.png')

    await apiRequest('/api/v1/example', { method: 'POST', body: formData })

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(formData)
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
  })

  it('resolves an empty 2xx body to undefined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 201 }),
    )

    await expect(apiRequest<void>('/api/v1/example')).resolves.toBeUndefined()
  })

  it('parses a non-empty 2xx body as JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    await expect(
      apiRequest<{ ok: boolean }>('/api/v1/example'),
    ).resolves.toEqual({ ok: true })
  })

  it('wraps a thrown fetch failure as a network ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))

    await expect(apiRequest('/api/v1/example')).rejects.toMatchObject({
      kind: 'network',
    })
  })

  it('throws a typed ApiError for a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ code: 'malformed-document' }] }),
        { status: 400 },
      ),
    )

    const error = await apiRequest('/api/v1/example').catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe('malformed')
  })
})
