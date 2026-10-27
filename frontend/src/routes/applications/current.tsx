import { useNavigate } from 'react-router'

import { CurrentApplicationJourney } from './-current-application-journey'

export default function CurrentApplicationJourneyPage() {
  const navigate = useNavigate()
  return (
    <CurrentApplicationJourney
      onNavigate={(href) => {
        void navigate(href)
      }}
    />
  )
}
