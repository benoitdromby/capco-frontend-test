import { href, useNavigate } from 'react-router'

import { ApplicationsLayout } from './-applications-layout'

export default function ApplicationsLayoutRoute() {
  const navigate = useNavigate()
  return (
    <ApplicationsLayout
      onLoggedOut={() => {
        void navigate(href('/sign-in'))
      }}
    />
  )
}
