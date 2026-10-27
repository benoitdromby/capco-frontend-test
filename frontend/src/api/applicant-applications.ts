import { apiRequest } from './client'
import { csrfHeaders } from './csrf'

export type ApplicationStep = 'personal-details' | 'identity-and-address'
export type JourneyProgressState = 'not-started' | 'current' | 'complete'
export type FormStepState = 'current' | 'complete' | 'remaining'

export interface Answers {
  name?: string
  dateOfBirth?: string
  country?: string
  nationality?: string
  email?: string
  phone?: string
  consentConfirmed?: boolean
  documentType?: string
  documentNumber?: string
  documentCountry?: string
  expiry?: string
  street?: string
  city?: string
  postal?: string
  residentialCountry?: string
}

export interface ApplicantApplicationSummary {
  id: string
  href: string
  currentStep: ApplicationStep
  progress: { step: ApplicationStep; state: JourneyProgressState }[]
}

export interface ApplicantApplicationForm {
  id: string
  currentStep: ApplicationStep
  steps: { step: ApplicationStep; state: FormStepState }[]
  answers: Answers
  documentEvidence: { present: boolean }
  version: number
}

interface ApplicantApplicationResponse {
  data: {
    type: 'applicant-applications'
    id: string
    attributes: {
      status: 'draft'
      currentStep: ApplicationStep
      href: string
      progress: { step: ApplicationStep; state: JourneyProgressState }[]
    }
  }
}

interface FormResponse {
  data: {
    type: 'applicant-application-forms'
    id: string
    attributes: {
      status: 'draft'
      currentStep: ApplicationStep
      steps: { step: ApplicationStep; state: FormStepState }[]
      answers: Answers
      documentEvidence: { present: boolean }
      version?: number
    }
  }
}

interface DocumentEvidenceResponse {
  data: {
    type: 'applicant-application-document-evidence'
    id: string
    attributes: { present: boolean }
  }
}

function toSummary(
  response: ApplicantApplicationResponse,
): ApplicantApplicationSummary {
  return {
    id: response.data.id,
    href: response.data.attributes.href,
    currentStep: response.data.attributes.currentStep,
    progress: response.data.attributes.progress,
  }
}

function toForm(response: FormResponse): ApplicantApplicationForm {
  return {
    id: response.data.id,
    currentStep: response.data.attributes.currentStep,
    steps: response.data.attributes.steps,
    answers: response.data.attributes.answers,
    documentEvidence: response.data.attributes.documentEvidence,
    version: response.data.attributes.version ?? 0,
  }
}

export async function getCurrentApplicantApplication(): Promise<ApplicantApplicationSummary | null> {
  const response = await apiRequest<ApplicantApplicationResponse | undefined>(
    '/api/v1/applicant-applications/current',
  )
  return response ? toSummary(response) : null
}

export async function createOrGetApplicantApplication(): Promise<ApplicantApplicationSummary> {
  const response = await apiRequest<ApplicantApplicationResponse>(
    '/api/v1/applicant-applications',
    { method: 'POST', headers: csrfHeaders() },
  )
  return toSummary(response)
}

export async function getApplicantApplicationForm(
  applicationId: string,
): Promise<ApplicantApplicationForm> {
  const response = await apiRequest<FormResponse>(
    `/api/v1/applicant-applications/${applicationId}/form`,
  )
  return toForm(response)
}

export interface SaveApplicantApplicationFormStepInput {
  step: ApplicationStep
  answers: Answers
  version: number
}

export async function saveApplicantApplicationFormStep(
  applicationId: string,
  input: SaveApplicantApplicationFormStepInput,
): Promise<ApplicantApplicationForm> {
  const response = await apiRequest<FormResponse>(
    `/api/v1/applicant-applications/${applicationId}/form`,
    {
      method: 'PATCH',
      headers: csrfHeaders(),
      body: {
        data: {
          type: 'applicant-application-forms',
          id: applicationId,
          attributes: {
            step: input.step,
            answers: input.answers,
            version: input.version,
          },
        },
      },
    },
  )
  return toForm(response)
}

export async function uploadApplicantApplicationDocumentEvidence(
  applicationId: string,
  file: File,
): Promise<{ present: boolean }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiRequest<DocumentEvidenceResponse>(
    `/api/v1/applicant-applications/${applicationId}/document-evidence`,
    { method: 'POST', headers: csrfHeaders(), body: formData },
  )
  return response.data.attributes
}
