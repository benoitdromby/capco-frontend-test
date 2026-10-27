import { z } from 'zod'

import { stepFieldConfigs } from './-form-steps'

import type {
  Answers,
  ApplicationStep,
} from '../../../api/applicant-applications'

export type StepFieldErrors = Partial<Record<keyof Answers, string>>

// A hand-written message, not templated from the checkbox's label — the
// label is a first-person statement ("I confirm..."), not an instruction,
// so templating it into "X is required." would read oddly.
const checkboxMessages: Partial<Record<keyof Answers, string>> = {
  consentConfirmed:
    'Confirm that these details are accurate before continuing.',
}

// Required only — the contract defines no format for any Answers field
// (confirmed live for dateOfBirth/expiry: the server accepts any string).
// The server remains the final authority on completeness.
function buildStepSchema(step: ApplicationStep) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of stepFieldConfigs[step]) {
    if (field.kind === 'checkbox') {
      shape[field.key] = z.boolean().refine((value) => value === true, {
        message: checkboxMessages[field.key] ?? 'This must be confirmed.',
      })
      continue
    }
    let schema = z.string().min(1, `${field.label} is required.`)
    // The contract defines no format for this field either, but a plainly
    // malformed email is worth catching client-side as a convenience check,
    // same as registration's account email — the server is still authoritative.
    if (field.kind === 'email') {
      schema = schema.email('Enter a valid email address.')
    }
    shape[field.key] = schema
  }
  return z.object(shape)
}

export function validateStepForm(
  step: ApplicationStep,
  answers: Answers,
): StepFieldErrors | undefined {
  const result = buildStepSchema(step).safeParse(answers)
  if (result.success) return undefined

  const errors: StepFieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (typeof field !== 'string') continue
    const key = field as keyof Answers
    if (!errors[key]) errors[key] = issue.message
  }
  return errors
}

// Save deliberately never requires completeness — leaving fields empty and
// saving is a supported way to keep partial progress, so "required" isn't an
// error on Save, only on Continue (validateStepForm above). But a value that
// IS entered and has a wrong format (currently just email) is still worth
// flagging immediately, since that's a genuine problem with the data itself,
// not merely "not done yet".
export function validateStepFieldFormats(
  step: ApplicationStep,
  answers: Answers,
): StepFieldErrors | undefined {
  const errors: StepFieldErrors = {}
  for (const field of stepFieldConfigs[step]) {
    if (field.kind !== 'email') continue
    const value = answers[field.key]
    if (typeof value !== 'string' || value === '') continue
    if (!z.string().email().safeParse(value).success) {
      errors[field.key] = 'Enter a valid email address.'
    }
  }
  return Object.keys(errors).length > 0 ? errors : undefined
}
