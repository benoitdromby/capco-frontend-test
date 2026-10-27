import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  saveApplicantApplicationFormStep,
  type ApplicantApplicationForm,
  type SaveApplicantApplicationFormStepInput,
} from '../api/applicant-applications'

import { applicationFormQueryKey } from './useApplicationForm'

import type { ApiError } from '../api/errors'

export function useSaveApplicationForm(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    ApplicantApplicationForm,
    ApiError,
    SaveApplicantApplicationFormStepInput
  >({
    mutationFn: (input) =>
      saveApplicantApplicationFormStep(applicationId, input),
    onSuccess: (form) => {
      // Required for correctness, not just caching: the next save must send
      // this version, or it fails with a false 409 form-version-conflict.
      queryClient.setQueryData(applicationFormQueryKey(applicationId), form)
    },
  })
}
