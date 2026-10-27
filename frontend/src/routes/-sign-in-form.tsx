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

import {
  apiErrorMessage,
  apiFieldErrors,
  genericMessage,
  type ApiFieldErrors,
} from '../api/error-messages'
import { useApplicantLogin } from '../hooks/useApplicantLogin'

import { accountAccessHref, isSafeJourneyPath } from './-return-target'
import { validateSignInForm } from './-sign-in-validation'
import styles from './account-access.module.css'

export interface SignInFormProps {
  onNavigate?: (href: string) => void
  returnTo?: string
  onSuccess: (href: string) => void
}

export function SignInForm({
  onNavigate,
  returnTo,
  onSuccess,
}: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientFieldErrors, setClientFieldErrors] = useState<ApiFieldErrors>({})
  const [hasUnsafeDestination, setHasUnsafeDestination] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const formErrorRef = useRef<HTMLDivElement>(null)

  const { mutate, isPending, error, reset } = useApplicantLogin()

  const serverFieldErrors = apiFieldErrors(error)
  const fieldErrors: ApiFieldErrors = {
    email: clientFieldErrors.email ?? serverFieldErrors.email,
    password: clientFieldErrors.password ?? serverFieldErrors.password,
  }
  const formErrorMessage = hasUnsafeDestination
    ? genericMessage
    : apiErrorMessage(error)

  useEffect(() => {
    if (fieldErrors.email) emailInputRef.current?.focus()
    else if (fieldErrors.password) passwordInputRef.current?.focus()
  }, [fieldErrors.email, fieldErrors.password])

  useEffect(() => {
    if ((error && error.kind !== 'validation') || hasUnsafeDestination) {
      formErrorRef.current?.focus()
    }
  }, [error, hasUnsafeDestination])

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          <Stack
            component="form"
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              if (isPending) return
              const errors = validateSignInForm({ email, password })
              if (errors) {
                setClientFieldErrors(errors)
                return
              }
              setClientFieldErrors({})
              setHasUnsafeDestination(false)
              mutate(
                { email, password },
                {
                  onSuccess: (href) => {
                    if (!isSafeJourneyPath(href)) {
                      setHasUnsafeDestination(true)
                      return
                    }
                    onSuccess(href)
                  },
                },
              )
            }}
            spacing={3}
          >
            <Stack spacing={1}>
              <Typography component="h1" variant="heading">
                Welcome back
              </Typography>
              <Typography tone="muted">
                Sign in to continue your KYC application.
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
                setHasUnsafeDestination(false)
                reset()
              }}
              required
              type="email"
              value={email}
            />
            <TextField
              autoComplete="current-password"
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
                setHasUnsafeDestination(false)
                reset()
              }}
              required
              type="password"
              value={password}
            />
            <Button
              className={styles.submit}
              fullWidth
              size="large"
              type="submit"
              isPending={isPending}
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            <Typography
              className={styles.footer}
              align="center"
              variant="caption"
            >
              <span>New to KYC? </span>
              <Link
                href={accountAccessHref('/create-account', returnTo)}
                onClick={(event) => {
                  if (onNavigate) {
                    event.preventDefault()
                    onNavigate(accountAccessHref('/create-account', returnTo))
                  }
                }}
              >
                Create account
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </main>
  )
}
