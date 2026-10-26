import { apiRequest } from './client'

export interface RegisterApplicantInput {
  email: string
  password: string
}

export function registerApplicant(
  input: RegisterApplicantInput,
): Promise<void> {
  return apiRequest<void>('/api/v1/applicant-accounts', {
    method: 'POST',
    body: {
      data: {
        type: 'applicant-accounts',
        attributes: {
          email: input.email,
          password: input.password,
        },
      },
    },
  })
}
