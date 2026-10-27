import type {
  Answers,
  ApplicationStep,
} from '../../../api/applicant-applications'

export interface StepFieldConfig {
  key: keyof Answers
  label: string
  kind: 'text' | 'checkbox' | 'date' | 'email'
  /**
   * WCAG 2.2 AA 1.3.5 (Identify Input Purpose). Only set where the field's
   * meaning is unambiguous. Deliberately left unset for `country` (personal
   * details) and `documentCountry` — unlike `residentialCountry`, what each
   * represents isn't defined by the contract, and aliasing either to the same
   * "country" token as `residentialCountry` risks the browser autofilling the
   * wrong remembered value into the wrong field. Also unset for `nationality`,
   * `documentType`, `documentNumber`, and `expiry`, none of which have a
   * standard autocomplete token.
   */
  autoComplete?: string
}

// Derived from the field order of the original frontend stub, which already
// matches the Answers schema. The contract does not define this mapping
// (docs/API-NOTES.md) — this is the one place it's kept.
export const stepFieldConfigs: Record<
  ApplicationStep,
  readonly StepFieldConfig[]
> = {
  'personal-details': [
    { key: 'name', label: 'Name', kind: 'text', autoComplete: 'name' },
    {
      key: 'dateOfBirth',
      label: 'Date of birth',
      kind: 'date',
      autoComplete: 'bday',
    },
    { key: 'country', label: 'Country', kind: 'text' },
    { key: 'nationality', label: 'Nationality', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'email', autoComplete: 'email' },
    { key: 'phone', label: 'Phone', kind: 'text', autoComplete: 'tel' },
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
    { key: 'expiry', label: 'Expiry', kind: 'date' },
    {
      key: 'street',
      label: 'Street',
      kind: 'text',
      autoComplete: 'street-address',
    },
    {
      key: 'city',
      label: 'City',
      kind: 'text',
      autoComplete: 'address-level2',
    },
    {
      key: 'postal',
      label: 'Postal code',
      kind: 'text',
      autoComplete: 'postal-code',
    },
    {
      key: 'residentialCountry',
      label: 'Residential country',
      kind: 'text',
      autoComplete: 'country',
    },
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
