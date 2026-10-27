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
]
