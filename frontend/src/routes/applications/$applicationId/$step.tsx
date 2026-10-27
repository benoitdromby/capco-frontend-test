import { useNavigate } from 'react-router'

import { pageTitle } from '../../-page-title'

import { CurrentApplicationStep } from './-current-application-step'

import type { Route } from './+types/$step'

const stepTitles: Record<string, string> = {
  'personal-details': 'Personal details',
  'identity-and-address': 'Identity and address',
  review: 'Review application',
}

export const meta: Route.MetaFunction = ({ params }) => [
  { title: pageTitle(stepTitles[params.step] ?? 'Your application') },
]

export default function CurrentApplicationStepPage({
  params,
}: Route.ComponentProps) {
  const navigate = useNavigate()
  return (
    <CurrentApplicationStep
      applicationId={params.applicationId}
      step={params.step}
      onNavigate={(href) => {
        void navigate(href)
      }}
    />
  )
}
