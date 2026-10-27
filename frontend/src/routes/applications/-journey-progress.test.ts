import { describe, expect, it } from 'vitest'

import { mapJourneyProgress } from './-journey-progress'

describe('mapJourneyProgress', () => {
  it('maps not-started to remaining and passes through current/complete', () => {
    expect(
      mapJourneyProgress([
        { step: 'personal-details', state: 'complete' },
        { step: 'identity-and-address', state: 'current' },
      ]),
    ).toEqual([
      { step: 'personal-details', state: 'complete' },
      { step: 'identity-and-address', state: 'current' },
    ])

    expect(
      mapJourneyProgress([
        { step: 'personal-details', state: 'current' },
        { step: 'identity-and-address', state: 'not-started' },
      ]),
    ).toEqual([
      { step: 'personal-details', state: 'current' },
      { step: 'identity-and-address', state: 'remaining' },
    ])
  })
})
