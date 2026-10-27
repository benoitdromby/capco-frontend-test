import type { ApplicantJourneyProgressItem } from './-applicant-journey-presentation'
import type {
  ApplicantApplicationSummary,
  JourneyProgressState,
} from '../../api/applicant-applications'

// docs/API-NOTES.md §5: ApplicantApplicationDocument.progress uses
// not-started|current|complete, while the presentation component (matching
// FormAttributes.steps) uses current|complete|remaining. Maps one to the other.
function mapState(
  state: JourneyProgressState,
): ApplicantJourneyProgressItem['state'] {
  return state === 'not-started' ? 'remaining' : state
}

export function mapJourneyProgress(
  progress: ApplicantApplicationSummary['progress'],
): ApplicantJourneyProgressItem[] {
  return progress.map(({ step, state }) => ({ step, state: mapState(state) }))
}
