import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)

  // Safety: if auth takes > 8s to resolve, treat as unauthenticated
  // This guards against edge cases where onAuthStateChange never fires
  useEffect(() => {
    if (!loading) {
      setTimedOut(false) // reset if loading resolves naturally
      return
    }
    const timer = setTimeout(() => {
      console.warn('[ProtectedRoute] Auth resolution timed out after 8s')
      setTimedOut(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading])

  // Show spinner while auth resolves (and hasn't timed out)
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-text-dim text-sm animate-pulse">Loading your account...</p>
      </div>
    )
  }

  // Auth timed out or no user → redirect to login
  if (!user) return <Navigate to="/login" replace />

  // Admin-only route guard
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
