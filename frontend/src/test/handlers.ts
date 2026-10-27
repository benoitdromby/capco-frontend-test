import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/health', () => HttpResponse.json({ status: 'ok' })),
  http.post(
    '/api/v1/applicant-accounts',
    () =>
      new HttpResponse(null, {
        status: 201,
        headers: {
          Location:
            '/api/v1/applicant-accounts/00000000-0000-4000-8000-000000000001',
        },
      }),
  ),
  http.post('/api/v1/applicant-sessions', () =>
    HttpResponse.json(
      {
        data: {
          type: 'applicant-sessions',
          id: '00000000-0000-4000-8000-000000000002',
          attributes: { href: '/applications/current' },
        },
      },
      { status: 201 },
    ),
  ),
  http.delete(
    '/api/v1/applicant-sessions/current',
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.get(
    '/api/v1/applicant-applications/current',
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post('/api/v1/applicant-applications', () =>
    HttpResponse.json(
      {
        data: {
          type: 'applicant-applications',
          id: '00000000-0000-4000-8000-000000000003',
          attributes: {
            status: 'draft',
            currentStep: 'personal-details',
            href: '/applications/00000000-0000-4000-8000-000000000003/personal-details',
            progress: [
              { step: 'personal-details', state: 'current' },
              { step: 'identity-and-address', state: 'not-started' },
            ],
          },
        },
      },
      { status: 201 },
    ),
  ),
  http.get('/api/v1/applicant-applications/:applicationId/form', ({ params }) =>
    HttpResponse.json({
      data: {
        type: 'applicant-application-forms',
        id: params.applicationId,
        attributes: {
          status: 'draft',
          currentStep: 'personal-details',
          steps: [
            { step: 'personal-details', state: 'current' },
            { step: 'identity-and-address', state: 'remaining' },
          ],
          answers: { consentConfirmed: false },
          documentEvidence: { present: false },
          version: 0,
        },
      },
    }),
  ),
  http.patch(
    '/api/v1/applicant-applications/:applicationId/form',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        data: { attributes: { step: string; answers: object; version: number } }
      }
      return HttpResponse.json({
        data: {
          type: 'applicant-application-forms',
          id: params.applicationId,
          attributes: {
            status: 'draft',
            currentStep: body.data.attributes.step,
            steps: [
              { step: 'personal-details', state: 'current' },
              { step: 'identity-and-address', state: 'remaining' },
            ],
            answers: body.data.attributes.answers,
            documentEvidence: { present: false },
            version: body.data.attributes.version + 1,
          },
        },
      })
    },
  ),
  http.post(
    '/api/v1/applicant-applications/:applicationId/document-evidence',
    ({ params }) =>
      HttpResponse.json(
        {
          data: {
            type: 'applicant-application-document-evidence',
            id: params.applicationId,
            attributes: { present: true },
          },
        },
        { status: 201 },
      ),
  ),
]
