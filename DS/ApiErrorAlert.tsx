import { forwardRef, type ReactNode } from 'react'

import { Alert } from './Primitives'

export type ApiErrorAlertKind =
  | 'validation'
  | 'malformed'
  | 'invalidCredentials'
  | 'unauthenticated'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'unprocessable'
  | 'rateLimited'
  | 'server'
  | 'network'
  | 'unexpected'

export interface ApiErrorAlertProps {
  kind: ApiErrorAlertKind
  detail?: string
  retryAfterSeconds?: number
  /** Overrides the default message — for cases that need custom content, such as a link. */
  children?: ReactNode
  className?: string
}

const genericMessage = 'Something went wrong. Please try again.'

function defaultMessage(
  kind: ApiErrorAlertKind,
  detail: string | undefined,
  retryAfterSeconds: number | undefined,
): ReactNode {
  switch (kind) {
    case 'rateLimited':
      return `Too many attempts. Try again in ${retryAfterSeconds ?? 60} seconds.`
    case 'network':
      return 'Check your connection and try again.'
    case 'malformed':
      return genericMessage
    default:
      return detail ?? genericMessage
  }
}

/**
 * Displays a non-field API error. Field errors (`kind: 'validation'`) are shown
 * on the fields themselves and render nothing here, so callers can render this
 * unconditionally for whatever error is current.
 */
export const ApiErrorAlert = forwardRef<HTMLDivElement, ApiErrorAlertProps>(
  function ApiErrorAlert(
    { kind, detail, retryAfterSeconds, children, className },
    ref,
  ) {
    if (kind === 'validation') {
      return null
    }
    return (
      <Alert ref={ref} severity="error" tabIndex={-1} className={className}>
        {children ?? defaultMessage(kind, detail, retryAfterSeconds)}
      </Alert>
    )
  },
)
