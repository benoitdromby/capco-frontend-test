import { describe, expect, it } from 'vitest'

import {
  validateStepFieldFormats,
  validateStepForm,
} from './-step-form-validation'

describe('validateStepForm', () => {
  it('accepts a fully-filled personal-details step', () => {
    expect(
      validateStepForm('personal-details', {
        name: 'Jane Doe',
        dateOfBirth: '1990-01-01',
        country: 'FR',
        nationality: 'FR',
        email: 'jane@example.com',
        phone: '+33612345678',
        consentConfirmed: true,
      }),
    ).toBeUndefined()
  })

  it('reports one message per empty required text field', () => {
    expect(
      validateStepForm('personal-details', {
        name: '',
        dateOfBirth: '',
        country: '',
        nationality: '',
        email: '',
        phone: '',
        consentConfirmed: true,
      }),
    ).toEqual({
      name: 'Name is required.',
      dateOfBirth: 'Date of birth is required.',
      country: 'Country is required.',
      nationality: 'Nationality is required.',
      email: 'Email is required.',
      phone: 'Phone is required.',
    })
  })

  it('reports a format message for a non-empty but malformed email, distinct from required', () => {
    expect(
      validateStepForm('personal-details', {
        name: 'Jane Doe',
        dateOfBirth: '1990-01-01',
        country: 'FR',
        nationality: 'FR',
        email: 'not-an-email',
        phone: '+33612345678',
        consentConfirmed: true,
      }),
    ).toEqual({ email: 'Enter a valid email address.' })
  })

  it('reports a dedicated message when the consent checkbox is unchecked', () => {
    expect(
      validateStepForm('personal-details', {
        name: 'Jane Doe',
        dateOfBirth: '1990-01-01',
        country: 'FR',
        nationality: 'FR',
        email: 'jane@example.com',
        phone: '+33612345678',
        consentConfirmed: false,
      }),
    ).toEqual({
      consentConfirmed:
        'Confirm that these details are accurate before continuing.',
    })
  })

  it('accepts a fully-filled identity-and-address step', () => {
    expect(
      validateStepForm('identity-and-address', {
        documentType: 'Passport',
        documentNumber: 'X1234567',
        documentCountry: 'FR',
        expiry: '2030-01-01',
        street: '1 Rue de Paris',
        city: 'Paris',
        postal: '75001',
        residentialCountry: 'FR',
      }),
    ).toBeUndefined()
  })

  it('reports one message per empty identity-and-address field', () => {
    expect(
      validateStepForm('identity-and-address', {
        documentType: '',
        documentNumber: '',
        documentCountry: '',
        expiry: '',
        street: '',
        city: '',
        postal: '',
        residentialCountry: '',
      }),
    ).toEqual({
      documentType: 'Document type is required.',
      documentNumber: 'Document number is required.',
      documentCountry: 'Document country is required.',
      expiry: 'Expiry is required.',
      street: 'Street is required.',
      city: 'City is required.',
      postal: 'Postal code is required.',
      residentialCountry: 'Residential country is required.',
    })
  })
})

describe('validateStepFieldFormats', () => {
  it('reports nothing for an entirely empty step — required is a Continue-only concern', () => {
    expect(
      validateStepFieldFormats('personal-details', {
        name: '',
        dateOfBirth: '',
        country: '',
        nationality: '',
        email: '',
        phone: '',
        consentConfirmed: false,
      }),
    ).toBeUndefined()
  })

  it('reports a format message for a non-empty but malformed email', () => {
    expect(
      validateStepFieldFormats('personal-details', {
        name: '',
        dateOfBirth: '',
        country: '',
        nationality: '',
        email: 'not-an-email',
        phone: '',
        consentConfirmed: false,
      }),
    ).toEqual({ email: 'Enter a valid email address.' })
  })

  it('reports nothing for a step with no format-checked fields, however incomplete', () => {
    expect(
      validateStepFieldFormats('identity-and-address', {
        documentType: '',
        documentNumber: '',
        documentCountry: '',
        expiry: '',
        street: '',
        city: '',
        postal: '',
        residentialCountry: '',
      }),
    ).toBeUndefined()
  })
})
