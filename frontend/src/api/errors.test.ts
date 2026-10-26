import { describe, expect, it } from 'vitest'

import { parseApiErrorResponse } from './errors'

function jsonApiErrorResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), { status, headers })
}

describe('parseApiErrorResponse', () => {
  it('collects every field error from a validation-failed response', async () => {
    const response = jsonApiErrorResponse(400, {
      errors: [
        {
          status: '400',
          code: 'validation-failed',
          title: 'Invalid attribute',
          detail: 'Enter a valid email address.',
          source: { pointer: '/data/attributes/email' },
        },
        {
          status: '400',
          code: 'validation-failed',
          title: 'Invalid attribute',
          detail: 'Use at least 6 characters.',
          source: { pointer: '/data/attributes/password' },
        },
      ],
    })

    const error = await parseApiErrorResponse(response)

    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual([
      {
        field: 'email',
        code: 'validation-failed',
        detail: 'Enter a valid email address.',
      },
      {
        field: 'password',
        code: 'validation-failed',
        detail: 'Use at least 6 characters.',
      },
    ])
  })

  it.each([
    ['malformed-document', 'malformed'],
    ['invalid-credentials', 'invalidCredentials'],
    ['authentication-required', 'unauthenticated'],
    ['access-denied', 'forbidden'],
    ['application-not-found', 'notFound'],
    ['email-already-registered', 'conflict'],
    ['form-version-conflict', 'conflict'],
    ['unprocessable-form', 'unprocessable'],
    ['internal-error', 'server'],
    ['submission-unavailable', 'server'],
  ] as const)('maps code %s to kind %s', async (code, kind) => {
    const response = jsonApiErrorResponse(400, {
      errors: [
        { status: '400', code, title: 'Error', detail: 'Something failed.' },
      ],
    })

    const error = await parseApiErrorResponse(response)

    expect(error.kind).toBe(kind)
    expect(error.detail).toBe('Something failed.')
  })

  it('reads the retry delay from the Retry-After header for a rate-limited error', async () => {
    const response = jsonApiErrorResponse(
      429,
      {
        errors: [{ status: '429', code: 'rate-limited', detail: 'Slow down.' }],
      },
      { 'Retry-After': '45' },
    )

    const error = await parseApiErrorResponse(response)

    expect(error.kind).toBe('rateLimited')
    expect(error.retryAfterSeconds).toBe(45)
  })

  it('falls back to unexpected for an unrecognized code', async () => {
    const response = jsonApiErrorResponse(400, {
      errors: [{ status: '400', code: 'something-new', detail: 'Unknown.' }],
    })

    expect((await parseApiErrorResponse(response)).kind).toBe('unexpected')
  })

  it('falls back to unexpected for a non-JSON body', async () => {
    const response = new Response('not json', { status: 500 })

    expect((await parseApiErrorResponse(response)).kind).toBe('unexpected')
  })

  it('falls back to unexpected for a JSON body with no errors array', async () => {
    const response = new Response(JSON.stringify({ data: {} }), { status: 500 })

    expect((await parseApiErrorResponse(response)).kind).toBe('unexpected')
  })
})
