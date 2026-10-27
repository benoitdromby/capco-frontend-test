import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createOrGetApplicantApplication,
  getApplicantApplicationForm,
  getCurrentApplicantApplication,
  saveApplicantApplicationFormStep,
  uploadApplicantApplicationDocumentEvidence,
} from './applicant-applications'

afterEach(() => {
  vi.restoreAllMocks()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

const applicationResponse = {
  data: {
    type: 'applicant-applications' as const,
    id: 'app-1',
    attributes: {
      status: 'draft' as const,
      currentStep: 'personal-details' as const,
      href: '/applications/app-1/personal-details',
      progress: [
        { step: 'personal-details' as const, state: 'current' as const },
        {
          step: 'identity-and-address' as const,
          state: 'not-started' as const,
        },
      ],
    },
  },
}

const formResponse = {
  data: {
    type: 'applicant-application-forms' as const,
    id: 'app-1',
    attributes: {
      status: 'draft' as const,
      currentStep: 'personal-details' as const,
      steps: [
        { step: 'personal-details' as const, state: 'current' as const },
        { step: 'identity-and-address' as const, state: 'remaining' as const },
      ],
      answers: { consentConfirmed: false },
      documentEvidence: { present: false },
      version: 0,
    },
  },
}

describe('getCurrentApplicantApplication', () => {
  it('returns null for a 204 no-draft response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    )
    await expect(getCurrentApplicantApplication()).resolves.toBeNull()
  })

  it('maps a 200 response to a flattened summary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(applicationResponse), { status: 200 }),
    )
    await expect(getCurrentApplicantApplication()).resolves.toEqual({
      id: 'app-1',
      href: '/applications/app-1/personal-details',
      currentStep: 'personal-details',
      progress: applicationResponse.data.attributes.progress,
    })
  })
})

describe('createOrGetApplicantApplication', () => {
  it('sends the CSRF header and no body', async () => {
    document.cookie = 'XSRF-TOKEN=token-1'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(applicationResponse), { status: 201 }),
      )

    const result = await createOrGetApplicantApplication()

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/applicant-applications')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('token-1')
    expect(init.body).toBeUndefined()
    expect(result.id).toBe('app-1')
  })
})

describe('getApplicantApplicationForm', () => {
  it('maps the response and defaults a missing version to 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(formResponse), { status: 200 }),
    )
    await expect(getApplicantApplicationForm('app-1')).resolves.toEqual({
      id: 'app-1',
      currentStep: 'personal-details',
      steps: formResponse.data.attributes.steps,
      answers: { consentConfirmed: false },
      documentEvidence: { present: false },
      version: 0,
    })
  })
})

describe('saveApplicantApplicationFormStep', () => {
  it('sends the exact JSON:API body and CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=token-2'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(formResponse), { status: 200 }),
      )

    await saveApplicantApplicationFormStep('app-1', {
      step: 'personal-details',
      answers: { name: 'Jane Doe' },
      version: 0,
    })

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/applicant-applications/app-1/form')
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('token-2')
    expect(JSON.parse(init.body as string)).toEqual({
      data: {
        type: 'applicant-application-forms',
        id: 'app-1',
        attributes: {
          step: 'personal-details',
          answers: { name: 'Jane Doe' },
          version: 0,
        },
      },
    })
  })
})

describe('uploadApplicantApplicationDocumentEvidence', () => {
  it('sends a FormData body with a file field and the CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=token-3'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            type: 'applicant-application-document-evidence',
            id: 'app-1',
            attributes: { present: true },
          },
        }),
        { status: 201 },
      ),
    )
    const file = new File(['data'], 'document.png', { type: 'image/png' })

    const result = await uploadApplicantApplicationDocumentEvidence(
      'app-1',
      file,
    )

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/applicant-applications/app-1/document-evidence')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('token-3')
    expect(new Headers(init.headers).has('Content-Type')).toBe(false)
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('file')).toBe(file)
    expect(result).toEqual({ present: true })
  })
})
