import { useMutation } from '@tanstack/react-query'

import {
  registerApplicant,
  type RegisterApplicantInput,
} from '../api/applicant-accounts'

import type { ApiError } from '../api/errors'

export function useRegisterApplicant() {
  return useMutation<void, ApiError, RegisterApplicantInput>({
    mutationFn: registerApplicant,
  })
}
