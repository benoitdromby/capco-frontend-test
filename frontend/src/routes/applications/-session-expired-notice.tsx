import { Alert, Link } from '@kyc/ui'
import { forwardRef } from 'react'

import { accountAccessHref } from '../-return-target'

export interface SessionExpiredNoticeProps {
  /** Shown when there may be unsaved local edits that will be lost. */
  warnUnsavedChanges?: boolean
}

export const SessionExpiredNotice = forwardRef<
  HTMLDivElement,
  SessionExpiredNoticeProps
>(function SessionExpiredNotice({ warnUnsavedChanges = false }, ref) {
  return (
    <Alert ref={ref} severity="error" tabIndex={-1}>
      Your session has expired.{' '}
      <Link href={accountAccessHref('/sign-in')}>Sign in</Link> to continue.
      {warnUnsavedChanges
        ? ' Unsaved changes on this page will be lost.'
        : null}
    </Alert>
  )
})
