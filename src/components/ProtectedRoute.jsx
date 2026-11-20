import { Navigate } from 'react-router-dom'
import PawLoader from './PawLoader'
import { useAuthStore } from '../store/useAuthStore'

// Only a signed-in Supabase session whose profile is 'approved' gets through; pending or
// rejected accounts (or an account an admin just rejected) go back to the login page.
export default function ProtectedRoute({ children }) {
  const initialized = useAuthStore((s) => s.initialized)
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)

  if (!initialized) {
    return <PawLoader text="กำลังตรวจสอบการเข้าสู่ระบบ..." />
  }
  if (!session || profile?.status !== 'approved') return <Navigate to="/login" replace />
  return children
}
