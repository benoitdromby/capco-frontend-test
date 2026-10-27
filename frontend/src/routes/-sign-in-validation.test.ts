import { describe, expect, it } from 'vitest'

import { validateSignInForm } from './-sign-in-validation'

describe('validateSignInForm', () => {
  it('accepts valid input', () => {
    expect(
      validateSignInForm({ email: 'jane@example.com', password: 'anything' }),
    ).toBeUndefined()
  })

  it('reports an empty email', () => {
    expect(validateSignInForm({ email: '', password: 'anything' })).toEqual({
      email: 'Enter your email address.',
    })
  })

  it('reports an empty password', () => {
    expect(
      validateSignInForm({ email: 'jane@example.com', password: '' }),
    ).toEqual({ password: 'Enter your password.' })
  })

  it('does not apply an email format check', () => {
    expect(
      validateSignInForm({ email: 'not-an-email', password: 'anything' }),
    ).toBeUndefined()
  })

  it('does not apply the registration password policy', () => {
    expect(
      validateSignInForm({ email: 'jane@example.com', password: 'a' }),
    ).toBeUndefined()
  })
})
