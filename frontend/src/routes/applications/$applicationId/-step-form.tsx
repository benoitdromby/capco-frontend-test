import { Alert, Button, Stack, TextField, Typography } from '@kyc/ui'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { SessionExpiredNotice } from '../-session-expired-notice'
import { apiErrorMessage } from '../../../api/error-messages'
import { useSaveApplicationForm } from '../../../hooks/useSaveApplicationForm'
import { useUploadDocumentEvidence } from '../../../hooks/useUploadDocumentEvidence'
import styles from '../../application-step.module.css'

import {
  pickStepAnswers,
  stepFieldConfigs,
  type StepFieldConfig,
} from './-form-steps'
import {
  validateStepFieldFormats,
  validateStepForm,
  type StepFieldErrors,
} from './-step-form-validation'

import type {
  Answers,
  ApplicantApplicationForm,
  ApplicationStep,
} from '../../../api/applicant-applications'
import type { ApiError } from '../../../api/errors'

export interface StepFormProps {
  applicationId: string
  step: ApplicationStep
  form: ApplicantApplicationForm
  refetch: () => Promise<ApplicantApplicationForm | undefined>
  onNavigate: (href: string) => void
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function saveStatusText(savedAt: Date | null, dirty: boolean): string {
  if (savedAt) return `Saved at ${formatTime(savedAt)}.`
  if (dirty) return 'Unsaved changes.'
  return ''
}

function textFieldInputType(kind: StepFieldConfig['kind']): string {
  if (kind === 'date') return 'date'
  if (kind === 'email') return 'email'
  return 'text'
}

function documentEvidenceStatusText(
  isPending: boolean,
  present: boolean,
): string {
  if (isPending) return 'Uploading…'
  return present
    ? 'Document evidence provided.'
    : 'Document evidence not provided yet.'
}

function setAnswer(
  answers: Answers,
  key: keyof Answers,
  value: string | boolean,
): Answers {
  // `key` is always one of stepFieldConfigs' keys (all keyof Answers); TS
  // can't verify that statically for a dynamically computed key.
  return { ...answers, [key]: value } as Answers
}

function MutationErrorAlert({
  error,
  onReload,
  onNavigate,
}: {
  error: ApiError
  onReload: () => void
  onNavigate: (href: string) => void
}) {
  if (error.kind === 'unauthenticated' || error.kind === 'forbidden') {
    return <SessionExpiredNotice warnUnsavedChanges />
  }
  if (error.kind === 'conflict') {
    return (
      <Alert severity="error" tabIndex={-1}>
        {apiErrorMessage(error)}{' '}
        <Button variant="secondary" size="small" onClick={onReload}>
          Reload
        </Button>
      </Alert>
    )
  }
  if (error.kind === 'notFound') {
    return (
      <Alert severity="error" tabIndex={-1}>
        {apiErrorMessage(error)}{' '}
        <Button
          variant="secondary"
          size="small"
          onClick={() => onNavigate('/applications/current')}
        >
          Go to your application
        </Button>
      </Alert>
    )
  }
  return (
    <Alert severity="error" tabIndex={-1}>
      {apiErrorMessage(error)}
    </Alert>
  )
}

export function StepForm({
  applicationId,
  step,
  form,
  refetch,
  onNavigate,
}: StepFormProps) {
  const [answers, setAnswers] = useState<Answers>(() =>
    pickStepAnswers(step, form.answers),
  )
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [incomplete, setIncomplete] = useState(false)
  const [clientFieldErrors, setClientFieldErrors] = useState<StepFieldErrors>(
    {},
  )
  const [validationAttempt, setValidationAttempt] = useState(0)
  const fieldRefs = useRef<Partial<Record<keyof Answers, HTMLInputElement>>>({})

  const saveMutation = useSaveApplicationForm(applicationId)
  const uploadMutation = useUploadDocumentEvidence(applicationId)

  // Only reacts to a failed-Continue attempt, not to clientFieldErrors
  // directly — with a dynamic, per-step field set there's no fixed
  // dependency list, and watching the error object would re-fire (and
  // re-steal focus) on every keystroke as errors clear one at a time.
  useEffect(() => {
    if (validationAttempt === 0) return
    const firstInvalid = stepFieldConfigs[step].find(
      (field) => clientFieldErrors[field.key],
    )
    if (firstInvalid) fieldRefs.current[firstInvalid.key]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationAttempt])

  // Re-seeding only ever happens here, from the value `refetch` resolves to
  // directly — never from an effect watching the `form` prop, which would
  // also fire (incorrectly) on an incidental background refetch, such as a
  // document upload invalidating the query mid-edit.
  async function handleReload() {
    const fresh = await refetch()
    if (!fresh) return
    setAnswers(pickStepAnswers(step, fresh.answers))
    setDirty(false)
    setSavedAt(null)
    setIncomplete(false)
  }

  function handleFieldChange(key: keyof Answers, value: string | boolean) {
    setAnswers((previous) => setAnswer(previous, key, value))
    setDirty(true)
    setSavedAt(null)
    setIncomplete(false)
    setClientFieldErrors((previous) => ({ ...previous, [key]: undefined }))
    saveMutation.reset()
  }

  function handleSave() {
    if (saveMutation.isPending) return
    // Save never requires completeness — leaving fields empty and saving is
    // a supported way to keep partial progress, so only format problems in
    // what's already entered are surfaced here, never "required" (that's a
    // Continue-only concern, see validateStepForm). Also clears any stale
    // "complete all required fields" banner from an earlier Continue attempt,
    // since the user has now chosen to save as-is instead.
    setClientFieldErrors(validateStepFieldFormats(step, answers) ?? {})
    setIncomplete(false)
    saveMutation.mutate(
      { step, answers, version: form.version },
      {
        onSuccess: () => {
          setSavedAt(new Date())
          setDirty(false)
        },
      },
    )
  }

  function handleContinue() {
    if (saveMutation.isPending) return
    const errors = validateStepForm(step, answers)
    if (errors) {
      setClientFieldErrors(errors)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setClientFieldErrors({})
    saveMutation.mutate(
      { step, answers, version: form.version },
      {
        onSuccess: (updated) => {
          setSavedAt(new Date())
          setDirty(false)
          const stepState = updated.steps.find((s) => s.step === step)?.state
          if (stepState === 'complete') {
            const next =
              step === 'personal-details' ? 'identity-and-address' : 'review'
            onNavigate(`/applications/${applicationId}/${next}`)
          } else {
            setIncomplete(true)
          }
        },
      },
    )
  }

  function handleBack() {
    onNavigate(
      step === 'personal-details'
        ? '/applications/current'
        : `/applications/${applicationId}/personal-details`,
    )
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const input = event.target
    uploadMutation.mutate(file, {
      onSuccess: () => {
        input.value = ''
      },
      onError: () => {
        input.value = ''
      },
    })
  }

  return (
    <Stack
      component="form"
      className={styles.stepForm}
      onSubmit={(event) => {
        event.preventDefault()
        handleContinue()
      }}
      spacing={2}
    >
      {stepFieldConfigs[step].map((field) =>
        field.kind === 'checkbox' ? (
          <Stack key={field.key} spacing={0.5}>
            <label className={styles.checkboxField}>
              <input
                ref={(element) => {
                  fieldRefs.current[field.key] = element ?? undefined
                }}
                aria-describedby={
                  clientFieldErrors[field.key]
                    ? `${field.key}-error`
                    : undefined
                }
                aria-invalid={Boolean(clientFieldErrors[field.key])}
                checked={Boolean(answers[field.key])}
                onChange={(event) =>
                  handleFieldChange(field.key, event.target.checked)
                }
                type="checkbox"
              />
              {field.label}
            </label>
            {clientFieldErrors[field.key] ? (
              <span id={`${field.key}-error`} className={styles.fieldError}>
                {clientFieldErrors[field.key]}
              </span>
            ) : null}
          </Stack>
        ) : (
          <TextField
            key={field.key}
            error={Boolean(clientFieldErrors[field.key])}
            fullWidth
            helperText={clientFieldErrors[field.key]}
            inputRef={(element) => {
              fieldRefs.current[field.key] = element ?? undefined
            }}
            label={field.label}
            onChange={(event) =>
              handleFieldChange(field.key, event.target.value)
            }
            type={textFieldInputType(field.kind)}
            value={(answers[field.key] as string | undefined) ?? ''}
          />
        ),
      )}

      {step === 'identity-and-address' ? (
        <Stack spacing={1}>
          <label htmlFor="document-evidence">Document evidence</label>
          <input
            accept="image/jpeg,image/png"
            disabled={uploadMutation.isPending}
            id="document-evidence"
            onChange={handleFileChange}
            type="file"
          />
          <Typography component="p" role="status" tone="muted">
            {documentEvidenceStatusText(
              uploadMutation.isPending,
              form.documentEvidence.present,
            )}
          </Typography>
          {uploadMutation.error ? (
            <MutationErrorAlert
              error={uploadMutation.error}
              onNavigate={onNavigate}
              onReload={() => void handleReload()}
            />
          ) : null}
        </Stack>
      ) : null}

      {incomplete ? (
        <Alert severity="error" tabIndex={-1}>
          Complete all required fields before continuing.
        </Alert>
      ) : null}

      {saveMutation.error ? (
        <MutationErrorAlert
          error={saveMutation.error}
          onNavigate={onNavigate}
          onReload={() => void handleReload()}
        />
      ) : null}

      <Typography component="p" role="status" className={styles.saveStatus}>
        {saveStatusText(savedAt, dirty)}
      </Typography>

      <Stack
        component="div"
        className={styles.formActions}
        direction="row"
        spacing={2}
      >
        <Button type="button" variant="quiet" onClick={handleBack}>
          Back
        </Button>
        <Stack direction="row" spacing={2}>
          <Button
            type="button"
            variant="secondary"
            isPending={saveMutation.isPending}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button type="submit" isPending={saveMutation.isPending}>
            {step === 'personal-details' ? 'Continue' : 'Save and review'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
