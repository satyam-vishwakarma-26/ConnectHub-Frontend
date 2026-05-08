import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, accessToken } = useAuthStore()
  const location = useLocation()

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && user.role !== 'PLATFORM_ADMIN') {
    return <Navigate to="/chat" replace />
  }

  return children
}
