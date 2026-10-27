import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createOrGetApplicantApplication,
  type ApplicantApplicationSummary,
} from '../api/applicant-applications'

import { currentApplicationQueryKey } from './useCurrentApplication'

import type { ApiError } from '../api/errors'

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation<ApplicantApplicationSummary, ApiError, void>({
    mutationFn: createOrGetApplicantApplication,
    onSuccess: (summary) => {
      queryClient.setQueryData(currentApplicationQueryKey, summary)
    },
  })
}
