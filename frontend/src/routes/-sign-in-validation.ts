import { z } from 'zod'

import type { ApiFieldErrors } from '../api/error-messages'

export interface SignInFormValues {
  email: string
  password: string
}

// Required fields only — no email-format check, no password policy.
// docs/API-NOTES.md: "Do not apply the registration password policy at login."
const signInSchema = z.object({
  email: z.string().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export function validateSignInForm(
  values: SignInFormValues,
): ApiFieldErrors | undefined {
  const result = signInSchema.safeParse(values)
  if (result.success) return undefined

  const errors: ApiFieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if ((field === 'email' || field === 'password') && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}
