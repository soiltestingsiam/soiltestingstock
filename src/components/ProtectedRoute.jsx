import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

// Only a signed-in Supabase session whose profile is 'approved' gets through; pending or
// rejected accounts (or an account an admin just rejected) go back to the login page.
export default function ProtectedRoute({ children }) {
  const initialized = useAuthStore((s) => s.initialized)
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[var(--bg-page)] text-[var(--text-secondary)]">
        <Loader2 className="animate-spin" size={18} /> กำลังตรวจสอบการเข้าสู่ระบบ...
      </div>
    )
  }
  if (!session || profile?.status !== 'approved') return <Navigate to="/login" replace />
  return children
}
