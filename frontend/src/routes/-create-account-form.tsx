import {
  Alert,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@kyc/ui'
import { useEffect, useRef, useState } from 'react'

import { apiErrorMessage, apiFieldErrors } from '../api/error-messages'
import { useRegisterApplicant } from '../hooks/useRegisterApplicant'

import {
  passwordRequirementsText,
  validateCreateAccountForm,
  type CreateAccountFieldErrors,
} from './-create-account-validation'
import { accountAccessHref } from './-return-target'
import styles from './account-access.module.css'

export interface CreateAccountFormProps {
  onNavigate?: (href: string) => void
  returnTo?: string
}

export function CreateAccountForm({
  onNavigate,
  returnTo,
}: CreateAccountFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clientFieldErrors, setClientFieldErrors] =
    useState<CreateAccountFieldErrors>({})
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null)
  const formErrorRef = useRef<HTMLDivElement>(null)
  const successHeadingRef = useRef<HTMLElement>(null)

  const { mutate, isPending, isSuccess, error, reset } = useRegisterApplicant()

  const serverFieldErrors = apiFieldErrors(error)
  const fieldErrors: CreateAccountFieldErrors = {
    email: clientFieldErrors.email ?? serverFieldErrors.email,
    password: clientFieldErrors.password ?? serverFieldErrors.password,
    confirmPassword: clientFieldErrors.confirmPassword,
  }

  useEffect(() => {
    if (fieldErrors.email) emailInputRef.current?.focus()
    else if (fieldErrors.password) passwordInputRef.current?.focus()
    else if (fieldErrors.confirmPassword)
      confirmPasswordInputRef.current?.focus()
  }, [fieldErrors.email, fieldErrors.password, fieldErrors.confirmPassword])

  useEffect(() => {
    if (error && error.kind !== 'validation') {
      formErrorRef.current?.focus()
    }
  }, [error])

  useEffect(() => {
    if (isSuccess) successHeadingRef.current?.focus()
  }, [isSuccess])

  const formErrorMessage =
    error?.kind === 'conflict' ? (
      <>
        An account for {email} already exists. {signInLink()} instead.
      </>
    ) : (
      apiErrorMessage(error)
    )

  function signInLink() {
    return (
      <Link
        href={accountAccessHref('/sign-in', returnTo)}
        onClick={(event) => {
          if (onNavigate) {
            event.preventDefault()
            onNavigate(accountAccessHref('/sign-in', returnTo))
          }
        }}
      >
        Sign in
      </Link>
    )
  }

  if (isSuccess) {
    return (
      <main className={styles.page}>
        <Card className={styles.card}>
          <CardContent className={styles.cardContent}>
            <Stack spacing={3}>
              <Typography
                ref={successHeadingRef}
                component="h1"
                variant="heading"
                tabIndex={-1}
              >
                Account created
              </Typography>
              <Typography>
                We created an account for {email}. Sign in to start your KYC
                application.
              </Typography>
              {signInLink()}
            </Stack>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          <Stack
            component="form"
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              const errors = validateCreateAccountForm({
                email,
                password,
                confirmPassword,
              })
              if (errors) {
                setClientFieldErrors(errors)
                return
              }
              setClientFieldErrors({})
              mutate({ email, password })
            }}
            spacing={3}
          >
            <Stack spacing={1}>
              <Typography component="h1" variant="heading">
                Create your account
              </Typography>
              <Typography tone="muted">
                Create credentials to begin your KYC application.
              </Typography>
            </Stack>
            {formErrorMessage ? (
              <Alert ref={formErrorRef} severity="error" tabIndex={-1}>
                {formErrorMessage}
              </Alert>
            ) : null}
            <TextField
              autoComplete="email"
              error={Boolean(fieldErrors.email)}
              fullWidth
              helperText={fieldErrors.email}
              id="applicant-email"
              inputRef={emailInputRef}
              label="Email address"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setClientFieldErrors((previous) => ({
                  ...previous,
                  email: undefined,
                }))
                reset()
              }}
              required
              type="email"
              value={email}
            />
            <TextField
              autoComplete="new-password"
              description={passwordRequirementsText}
              error={Boolean(fieldErrors.password)}
              fullWidth
              helperText={fieldErrors.password}
              id="applicant-password"
              inputRef={passwordInputRef}
              label="Password"
              name="password"
              onChange={(event) => {
                setPassword(event.target.value)
                setClientFieldErrors((previous) => ({
                  ...previous,
                  password: undefined,
                }))
                reset()
              }}
              required
              type="password"
              value={password}
            />
            <TextField
              autoComplete="new-password"
              error={Boolean(fieldErrors.confirmPassword)}
              fullWidth
              helperText={fieldErrors.confirmPassword}
              id="applicant-confirm-password"
              inputRef={confirmPasswordInputRef}
              label="Confirm password"
              name="confirmPassword"
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setClientFieldErrors((previous) => ({
                  ...previous,
                  confirmPassword: undefined,
                }))
                reset()
              }}
              required
              type="password"
              value={confirmPassword}
            />
            <Button
              className={styles.submit}
              fullWidth
              size="large"
              type="submit"
              isPending={isPending}
            >
              {isPending ? 'Creating account…' : 'Create account'}
            </Button>
            <Typography
              className={styles.footer}
              align="center"
              variant="caption"
            >
              <span>Already have an account? </span>
              {signInLink()}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}
