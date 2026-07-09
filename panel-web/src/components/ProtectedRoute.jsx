import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import MainLayout from './Layout/MainLayout'

function ProtectedRoute({ children }) {
  const { autenticado } = useAuth()

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout>{children}</MainLayout>
}

export default ProtectedRoute
