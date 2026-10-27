import { apiRequest } from './client'
import { csrfHeaders } from './csrf'

export interface LoginApplicantInput {
  email: string
  password: string
}

interface ApplicantSessionResponse {
  data: {
    type: 'applicant-sessions'
    id: string
    attributes: { href: string }
  }
}

export async function loginApplicant(
  input: LoginApplicantInput,
): Promise<string> {
  const response = await apiRequest<ApplicantSessionResponse>(
    '/api/v1/applicant-sessions',
    {
      method: 'POST',
      body: {
        data: {
          type: 'applicant-sessions',
          attributes: {
            email: input.email,
            password: input.password,
          },
        },
      },
    },
  )
  return response.data.attributes.href
}

export async function logoutApplicant(): Promise<void> {
  await apiRequest<void>('/api/v1/applicant-sessions/current', {
    method: 'DELETE',
    headers: csrfHeaders(),
  })
}
