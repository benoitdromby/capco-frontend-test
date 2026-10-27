import { describe, expect, it } from 'vitest'

import { apiErrorMessage, apiFieldErrors } from './error-messages'
import { ApiError } from './errors'

describe('apiErrorMessage', () => {
  it('returns undefined when there is no error', () => {
    expect(apiErrorMessage(undefined)).toBeUndefined()
    expect(apiErrorMessage(null)).toBeUndefined()
  })

  it('returns undefined for a validation-kind error (shown on fields instead)', () => {
    expect(
      apiErrorMessage(new ApiError({ kind: 'validation' })),
    ).toBeUndefined()
  })

  it('shows a generic message for a malformed document', () => {
    expect(apiErrorMessage(new ApiError({ kind: 'malformed' }))).toBe(
      'Something went wrong. Please try again.',
    )
  })

  it('shows the retry delay for a rate-limited error', () => {
    expect(
      apiErrorMessage(
        new ApiError({ kind: 'rateLimited', retryAfterSeconds: 45 }),
      ),
    ).toBe('Too many attempts. Try again in 45 seconds.')
  })

  it('shows a connectivity message for a network error', () => {
    expect(apiErrorMessage(new ApiError({ kind: 'network' }))).toBe(
      'Check your connection and try again.',
    )
  })

  it("falls back to the response's detail text for other kinds", () => {
    expect(
      apiErrorMessage(
        new ApiError({ kind: 'server', detail: 'The service is unavailable.' }),
      ),
    ).toBe('The service is unavailable.')
  })

  it('falls back to a generic message when there is no detail', () => {
    expect(apiErrorMessage(new ApiError({ kind: 'unexpected' }))).toBe(
      'Something went wrong. Please try again.',
    )
  })
})

describe('apiFieldErrors', () => {
  it('returns no field errors when there is no error', () => {
    expect(apiFieldErrors(undefined)).toEqual({})
  })

  it('returns no field errors for a non-validation error', () => {
    expect(apiFieldErrors(new ApiError({ kind: 'conflict' }))).toEqual({})
  })

  it('maps email and password field errors from a validation error', () => {
    const error = new ApiError({
      kind: 'validation',
      fieldErrors: [
        {
          field: 'email',
          code: 'validation-failed',
          detail: 'Enter a valid email address.',
        },
        { field: 'password', code: 'validation-failed', detail: 'Too weak.' },
      ],
    })
    expect(apiFieldErrors(error)).toEqual({
      email: 'Enter a valid email address.',
      password: 'Too weak.',
    })
  })
})
