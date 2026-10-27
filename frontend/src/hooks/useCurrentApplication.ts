import { useQuery } from '@tanstack/react-query'

import {
  getCurrentApplicantApplication,
  type ApplicantApplicationSummary,
} from '../api/applicant-applications'

import type { ApiError } from '../api/errors'

export const currentApplicationQueryKey = ['current-application'] as const

export function useCurrentApplication() {
  return useQuery<ApplicantApplicationSummary | null, ApiError>({
    queryKey: currentApplicationQueryKey,
    queryFn: getCurrentApplicantApplication,
  })
}
