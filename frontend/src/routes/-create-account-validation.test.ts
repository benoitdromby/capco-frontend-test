import { describe, expect, it } from 'vitest'

import {
  passwordRequirementsText,
  validateCreateAccountForm,
} from './-create-account-validation'

describe('validateCreateAccountForm', () => {
  it('accepts valid input', () => {
    expect(
      validateCreateAccountForm({
        email: 'jane@example.com',
        password: 'Secret!1',
        confirmPassword: 'Secret!1',
      }),
    ).toBeUndefined()
  })

  it('reports an empty email', () => {
    expect(
      validateCreateAccountForm({
        email: '',
        password: 'Secret!1',
        confirmPassword: 'Secret!1',
      }),
    ).toEqual({ email: 'Enter your email address.' })
  })

  it('reports an invalid email format', () => {
    expect(
      validateCreateAccountForm({
        email: 'not-an-email',
        password: 'Secret!1',
        confirmPassword: 'Secret!1',
      }),
    ).toEqual({ email: 'Enter a valid email address.' })
  })

  it.each([
    ['secret!1', 'missing an uppercase letter'],
    ['Secret11', 'missing a special character'],
    ['Se1!', 'too short'],
  ])('rejects a password %s (%s)', (password) => {
    expect(
      validateCreateAccountForm({
        email: 'jane@example.com',
        password,
        confirmPassword: password,
      }),
    ).toEqual({ password: passwordRequirementsText })
  })

  it('reports a mismatched confirmation only on the confirmation field', () => {
    expect(
      validateCreateAccountForm({
        email: 'jane@example.com',
        password: 'Secret!1',
        confirmPassword: 'Secret!2',
      }),
    ).toEqual({ confirmPassword: 'Passwords do not match.' })
  })
})
