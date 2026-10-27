import { useNavigate } from 'react-router'

import { pageTitle } from '../-page-title'

import { CurrentApplicationJourney } from './-current-application-journey'

import type { Route } from './+types/current'

export const meta: Route.MetaFunction = () => [
  { title: pageTitle('Your application') },
]

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
