import { useMutation, useQueryClient } from '@tanstack/react-query'

import { logoutApplicant } from '../api/applicant-sessions'

import type { ApiError } from '../api/errors'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: logoutApplicant,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
