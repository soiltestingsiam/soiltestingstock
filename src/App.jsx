import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Stock from './pages/Stock'
import Reports from './pages/Reports'
import ProductList from './pages/ProductList'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { useThemeStore } from './store/useThemeStore'
import { useStore } from './store/useStore'
import { useAuthStore } from './store/useAuthStore'

// Gates the data-driven pages behind the initial Supabase fetch so they don't flash an
// empty "ไม่พบสินค้า" state before the first load resolves.
function RequireData({ children }) {
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-page)] px-4 text-center">
        <AlertTriangle className="text-red-400" size={32} />
        <p className="font-semibold text-red-400">เชื่อมต่อฐานข้อมูลไม่สำเร็จ</p>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[var(--bg-page)] text-[var(--text-secondary)]">
        <Loader2 className="animate-spin" size={18} /> กำลังโหลดข้อมูล...
      </div>
    )
  }
  return children
}

export default function App() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Restore the Supabase session (if any) once, then load stock data only while an
  // approved user is signed in — before that RLS returns nothing anyway.
  const approvedUserId = useAuthStore((s) => (s.profile?.status === 'approved' ? s.profile.id : null))

  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  useEffect(() => {
    if (!approvedUserId) return
    useStore.getState().init()
    return () => useStore.getState().reset()
  }, [approvedUserId])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RequireData>
              <Dashboard />
            </RequireData>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-in"
        element={
          <ProtectedRoute>
            <RequireData>
              <StockIn />
            </RequireData>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-out"
        element={
          <ProtectedRoute>
            <RequireData>
              <StockOut />
            </RequireData>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <RequireData>
              <Stock />
            </RequireData>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RequireData>
              <Reports />
            </RequireData>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <RequireData>
              <ProductList />
            </RequireData>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
