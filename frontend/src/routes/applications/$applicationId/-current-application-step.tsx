import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@kyc/ui'
import { useEffect, useRef, type RefObject } from 'react'

import { SessionExpiredNotice } from '../-session-expired-notice'
import { apiErrorMessage } from '../../../api/error-messages'
import { isSessionExpiredError, type ApiError } from '../../../api/errors'
import { useApplicationForm } from '../../../hooks/useApplicationForm'
import styles from '../../application-step.module.css'

import { StepForm } from './-step-form'

import type { ApplicationStep } from '../../../api/applicant-applications'

export interface CurrentApplicationStepProps {
  applicationId: string
  step: string
  onNavigate: (href: string) => void
}

function normalizeStep(step: string): ApplicationStep {
  return step === 'identity-and-address'
    ? 'identity-and-address'
    : 'personal-details'
}

function LoadErrorNotice({
  error,
  errorRef,
  onNavigate,
  onRetry,
}: {
  error: ApiError
  errorRef: RefObject<HTMLDivElement | null>
  onNavigate: (href: string) => void
  onRetry: () => void
}) {
  if (isSessionExpiredError(error)) {
    return <SessionExpiredNotice warnUnsavedChanges />
  }
  if (error.kind === 'notFound') {
    return (
      <Stack spacing={2}>
        <Alert ref={errorRef} severity="error" tabIndex={-1}>
          {apiErrorMessage(error)}
        </Alert>
        <Button onClick={() => onNavigate('/applications/current')}>
          Go to your application
        </Button>
      </Stack>
    )
  }
  return (
    <Stack spacing={2}>
      <Alert ref={errorRef} severity="error" tabIndex={-1}>
        {apiErrorMessage(error)}
      </Alert>
      <Button onClick={onRetry}>Try again</Button>
    </Stack>
  )
}

export function CurrentApplicationStep({
  applicationId,
  step,
  onNavigate,
}: CurrentApplicationStepProps) {
  const query = useApplicationForm(applicationId)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.isError) errorRef.current?.focus()
  }, [query.isError])

  // Unchanged from the prototype stub — final submission is out of scope.
  if (step === 'review') {
    return (
      <main className={styles.reviewPage}>
        <Card className={styles.reviewCard}>
          <CardContent>
            <Stack spacing={2}>
              <Typography component="h1" variant="heading">
                Review application
              </Typography>
              <Typography>Your application is ready for review.</Typography>
              <label>
                <input type="checkbox" /> I confirm the information is complete
                and accurate.
              </label>
              <Button
                onClick={() =>
                  onNavigate(`/applications/${applicationId}/submitted`)
                }
              >
                Submit
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  onNavigate(
                    `/applications/${applicationId}/identity-and-address`,
                  )
                }
              >
                Return to form
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (query.isPending) {
    return (
      <main className={styles.page}>
        <Typography component="h1" variant="heading">
          Loading your application…
        </Typography>
      </main>
    )
  }

  if (query.isError) {
    return (
      <main className={styles.page}>
        <Typography component="h1" variant="heading">
          Your application
        </Typography>
        <LoadErrorNotice
          error={query.error}
          errorRef={errorRef}
          onNavigate={onNavigate}
          onRetry={() => void query.refetch()}
        />
      </main>
    )
  }

  const normalizedStep = normalizeStep(step)

  return (
    <main className={styles.page}>
      <Box component="div" className={styles.stepContent}>
        <Stack spacing={3}>
          <Typography component="p" variant="eyebrow" tone="accent">
            STEP {normalizedStep === 'personal-details' ? '1' : '2'} OF 2
          </Typography>
          <Typography component="h1" variant="heading">
            {normalizedStep === 'personal-details'
              ? 'Personal details'
              : 'Identity and address'}
          </Typography>
          <StepForm
            key={`${applicationId}:${normalizedStep}`}
            applicationId={applicationId}
            step={normalizedStep}
            form={query.data}
            refetch={async () => (await query.refetch()).data}
            onNavigate={onNavigate}
          />
        </Stack>
      </Box>
    </main>
  )
}
