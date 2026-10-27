import { z } from 'zod'

export const passwordRequirementsText =
  'Use at least six characters, including one uppercase letter and one special character.'

// The contract (docs/API-NOTES.md) does not define "special character"; this
// treats it as "not a letter or digit." The server remains the final authority.
const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/

export interface CreateAccountFormValues {
  email: string
  password: string
  confirmPassword: string
}

export interface CreateAccountFieldErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

const createAccountSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Enter your email address.')
      .email('Enter a valid email address.'),
    password: z
      .string()
      .min(1, 'Enter a password.')
      .regex(passwordPolicy, passwordRequirementsText),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export function validateCreateAccountForm(
  values: CreateAccountFormValues,
): CreateAccountFieldErrors | undefined {
  const result = createAccountSchema.safeParse(values)
  if (result.success) return undefined

  const errors: CreateAccountFieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (
      (field === 'email' ||
        field === 'password' ||
        field === 'confirmPassword') &&
      !errors[field]
    ) {
      errors[field] = issue.message
    }
  }
  return errors
}
