import { useNavigate } from 'react-router'

import { CurrentApplicationStep } from './-current-application-step'

import type { Route } from './+types/$step'

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
