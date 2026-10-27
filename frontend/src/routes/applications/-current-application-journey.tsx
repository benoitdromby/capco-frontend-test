import { Alert, Button, Stack, Typography } from '@kyc/ui'
import { useEffect, useRef } from 'react'

import { apiErrorMessage } from '../../api/error-messages'
import { isSessionExpiredError } from '../../api/errors'
import { useCreateApplication } from '../../hooks/useCreateApplication'
import { useCurrentApplication } from '../../hooks/useCurrentApplication'

import {
  ApplicantJourneyPresentation,
  type ApplicantJourneyPresentationFixture,
} from './-applicant-journey-presentation'
import { mapJourneyProgress } from './-journey-progress'
import { SessionExpiredNotice } from './-session-expired-notice'

export interface CurrentApplicationJourneyProps {
  onNavigate: (href: string) => void
}

const startFixture: ApplicantJourneyPresentationFixture = {
  entryState: 'start',
  progress: [
    { step: 'personal-details', state: 'current' },
    { step: 'identity-and-address', state: 'remaining' },
  ],
}

export function CurrentApplicationJourney({
  onNavigate,
}: CurrentApplicationJourneyProps) {
  const query = useCurrentApplication()
  const create = useCreateApplication()
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.isError || create.isError) {
      errorRef.current?.focus()
    }
  }, [query.isError, create.isError])

  if (query.isPending) {
    return (
      <main>
        <Typography component="h1" variant="heading">
          Your KYC application
        </Typography>
        <Typography>Loading your application…</Typography>
      </main>
    )
  }

  if (query.isError) {
    return (
      <main>
        <Typography component="h1" variant="heading">
          Your KYC application
        </Typography>
        {isSessionExpiredError(query.error) ? (
          <SessionExpiredNotice />
        ) : (
          <Stack spacing={2}>
            <Alert ref={errorRef} severity="error" tabIndex={-1}>
              {apiErrorMessage(query.error)}
            </Alert>
            <Button onClick={() => void query.refetch()}>Try again</Button>
          </Stack>
        )}
      </main>
    )
  }

  const { data } = query
  const fixture: ApplicantJourneyPresentationFixture = data
    ? { entryState: 'resume', progress: mapJourneyProgress(data.progress) }
    : startFixture

  return (
    <Stack spacing={2}>
      <ApplicantJourneyPresentation
        {...fixture}
        onPrimaryAction={() => {
          if (data) {
            onNavigate(data.href)
          } else {
            create.mutate(undefined, {
              onSuccess: (created) => onNavigate(created.href),
            })
          }
        }}
      />
      {create.isError ? (
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {apiErrorMessage(create.error)}
        </Alert>
      ) : null}
    </Stack>
  )
}
