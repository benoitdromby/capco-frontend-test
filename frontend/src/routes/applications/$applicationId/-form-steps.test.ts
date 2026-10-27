import { describe, expect, it } from 'vitest'

import { pickStepAnswers, stepFieldKeys } from './-form-steps'

describe('stepFieldKeys', () => {
  it('lists personal-details keys, including the consent checkbox', () => {
    expect(stepFieldKeys('personal-details')).toEqual([
      'name',
      'dateOfBirth',
      'country',
      'nationality',
      'email',
      'phone',
      'consentConfirmed',
    ])
  })

  it('lists identity-and-address keys, excluding personal-details keys', () => {
    const keys = stepFieldKeys('identity-and-address')
    expect(keys).toEqual([
      'documentType',
      'documentNumber',
      'documentCountry',
      'expiry',
      'street',
      'city',
      'postal',
      'residentialCountry',
    ])
    expect(keys).not.toContain('name')
  })
})

describe('pickStepAnswers', () => {
  it('picks only this step keys and ignores values from the other step', () => {
    const answers = {
      name: 'Jane Doe',
      documentType: 'passport',
      consentConfirmed: true,
    }
    expect(pickStepAnswers('personal-details', answers)).toEqual({
      name: 'Jane Doe',
      dateOfBirth: '',
      country: '',
      nationality: '',
      email: '',
      phone: '',
      consentConfirmed: true,
    })
  })

  it('defaults an omitted text field to an empty string and an omitted checkbox to false', () => {
    expect(pickStepAnswers('personal-details', {})).toEqual({
      name: '',
      dateOfBirth: '',
      country: '',
      nationality: '',
      email: '',
      phone: '',
      consentConfirmed: false,
    })
  })
})
