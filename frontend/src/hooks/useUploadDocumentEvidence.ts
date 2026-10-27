import { useMutation, useQueryClient } from '@tanstack/react-query'

import { uploadApplicantApplicationDocumentEvidence } from '../api/applicant-applications'

import { applicationFormQueryKey } from './useApplicationForm'

import type { ApiError } from '../api/errors'

export function useUploadDocumentEvidence(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation<{ present: boolean }, ApiError, File>({
    mutationFn: (file) =>
      uploadApplicantApplicationDocumentEvidence(applicationId, file),
    onSuccess: () => {
      // The upload response omits version/steps entirely; refetching keeps
      // currentStep/steps/documentEvidence consistent in one read instead of
      // hand-splicing a partial update into the cache.
      void queryClient.invalidateQueries({
        queryKey: applicationFormQueryKey(applicationId),
      })
    },
  })
}
