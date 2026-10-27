import type {
  Answers,
  ApplicationStep,
} from '../../../api/applicant-applications'

export interface StepFieldConfig {
  key: keyof Answers
  label: string
  kind: 'text' | 'checkbox'
}

// Derived from the field order of the original frontend stub, which already
// matches the Answers schema. The contract does not define this mapping
// (docs/API-NOTES.md) — this is the one place it's kept.
export const stepFieldConfigs: Record<
  ApplicationStep,
  readonly StepFieldConfig[]
> = {
  'personal-details': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'dateOfBirth', label: 'Date of birth', kind: 'text' },
    { key: 'country', label: 'Country', kind: 'text' },
    { key: 'nationality', label: 'Nationality', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'text' },
    { key: 'phone', label: 'Phone', kind: 'text' },
    {
      key: 'consentConfirmed',
      label: 'I confirm these details are accurate and belong to me.',
      kind: 'checkbox',
    },
  ],
  'identity-and-address': [
    { key: 'documentType', label: 'Document type', kind: 'text' },
    { key: 'documentNumber', label: 'Document number', kind: 'text' },
    { key: 'documentCountry', label: 'Document country', kind: 'text' },
    { key: 'expiry', label: 'Expiry', kind: 'text' },
    { key: 'street', label: 'Street', kind: 'text' },
    { key: 'city', label: 'City', kind: 'text' },
    { key: 'postal', label: 'Postal code', kind: 'text' },
    { key: 'residentialCountry', label: 'Residential country', kind: 'text' },
  ],
}

export function stepFieldKeys(step: ApplicationStep): (keyof Answers)[] {
  return stepFieldConfigs[step].map((field) => field.key)
}

/** Picks this step's keys from the full answers, applying the server's own defaults. */
export function pickStepAnswers(
  step: ApplicationStep,
  answers: Answers,
): Answers {
  const picked: Record<string, string | boolean> = {}
  for (const field of stepFieldConfigs[step]) {
    picked[field.key] =
      field.kind === 'checkbox'
        ? ((answers[field.key] as boolean | undefined) ?? false)
        : ((answers[field.key] as string | undefined) ?? '')
  }
  // Built key-by-key from stepFieldConfigs, whose keys are all keyof Answers;
  // TS can't verify that statically for a dynamically-keyed loop.
  return picked as Answers
}
