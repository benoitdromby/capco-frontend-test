import type { ApiError } from './errors'
import type { ReactNode } from 'react'

const genericMessage = 'Something went wrong. Please try again.'

/**
 * Maps a non-field API error to a display message, for rendering in an
 * `Alert`. Returns `undefined` for `validation` (shown on the fields
 * themselves, not in a summary banner) and for no error at all, so callers
 * can render an alert only when this is truthy.
 */
export function apiErrorMessage(
  error: ApiError | null | undefined,
): ReactNode | undefined {
  if (!error || error.kind === 'validation') return undefined
  switch (error.kind) {
    case 'rateLimited':
      return `Too many attempts. Try again in ${error.retryAfterSeconds ?? 60} seconds.`
    case 'network':
      return 'Check your connection and try again.'
    case 'malformed':
      return genericMessage
    default:
      return error.detail ?? genericMessage
  }
}
