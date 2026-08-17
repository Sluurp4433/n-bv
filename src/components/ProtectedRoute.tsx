import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { LoadingState, Alert, Button } from './ui'

export function ProtectedRoute({
  children,
  adminOnly,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const { loading, session, profile, isActive, isAdmin, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Kontrollerar behörighet…" />

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  // Inloggad men kontot är inaktiverat eller saknar profil
  if (profile && !isActive) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Alert variant="warning">
          <p className="font-semibold">Kontot är inaktiverat</p>
          <p className="mt-1">
            Ditt konto är inte aktivt. Kontakta en administratör i föreningen för att få tillgång.
          </p>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => signOut()}>
            Logga ut
          </Button>
        </div>
      </div>
    )
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/hem" replace />
  }

  return <>{children}</>
}
