import { useQuery } from '@tanstack/react-query'

import {
  getApplicantApplicationForm,
  type ApplicantApplicationForm,
} from '../api/applicant-applications'

import type { ApiError } from '../api/errors'

export function applicationFormQueryKey(applicationId: string) {
  return ['application-form', applicationId] as const
}

export function useApplicationForm(applicationId: string) {
  return useQuery<ApplicantApplicationForm, ApiError>({
    queryKey: applicationFormQueryKey(applicationId),
    queryFn: () => getApplicantApplicationForm(applicationId),
    // The form is edited in place; a background refetch on window focus
    // would otherwise reset fields the user is mid-typing.
    refetchOnWindowFocus: false,
    enabled: Boolean(applicationId),
  })
}
