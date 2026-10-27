import { Alert, Button } from '@kyc/ui'
import { Outlet } from 'react-router'

import { apiErrorMessage } from '../api/error-messages'
import { useLogout } from '../hooks/useLogout'

import styles from './applications.module.css'

export interface ApplicationsLayoutProps {
  onLoggedOut: () => void
}

export function ApplicationsLayout({ onLoggedOut }: ApplicationsLayoutProps) {
  const logout = useLogout()

  return (
    <div>
      <header className={styles.header}>
        <Button
          variant="quiet"
          size="small"
          isPending={logout.isPending}
          onClick={() => {
            logout.mutate(undefined, { onSuccess: onLoggedOut })
          }}
        >
          Log out
        </Button>
      </header>
      {logout.isError ? (
        <Alert severity="error" tabIndex={-1}>
          {apiErrorMessage(logout.error)}
        </Alert>
      ) : null}
      <Outlet />
    </div>
  )
}
