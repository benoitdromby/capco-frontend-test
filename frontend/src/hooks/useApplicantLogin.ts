import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  loginApplicant,
  type LoginApplicantInput,
} from '../api/applicant-sessions'

import type { ApiError } from '../api/errors'

export function useApplicantLogin() {
  const queryClient = useQueryClient()
  return useMutation<string, ApiError, LoginApplicantInput>({
    mutationFn: loginApplicant,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
