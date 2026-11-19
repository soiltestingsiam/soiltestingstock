import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

// Heavy, auth-gated pages are code-split so the public login/entry page never downloads
// the report/export (xlsx, jspdf, html2canvas) or QR libraries. Big win for first-load
// performance, especially on mobile; each page's chunk loads on demand after sign-in.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const StockIn = lazy(() => import('./pages/StockIn'))
const StockOut = lazy(() => import('./pages/StockOut'))
const Stock = lazy(() => import('./pages/Stock'))
const Reports = lazy(() => import('./pages/Reports'))
const ProductList = lazy(() => import('./pages/ProductList'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
// each user's pet walking along the bottom of every page (signed-in only)
const PetCompanion = lazy(() => import('./components/PetCompanion'))
import UpdatePrompt from './components/UpdatePrompt'
import FestivalLayer from './components/FestivalLayer'
import FestivalWelcome from './components/FestivalWelcome'
import { useFestivalStore } from './store/useFestivalStore'
import { useThemeStore } from './store/useThemeStore'
import { useStore } from './store/useStore'
import { usePetStore } from './store/usePetStore'
import { useAuthStore, isAdminState } from './store/useAuthStore'

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

// Admin-only pages: everyone else is sent back to Home (the owner counts as admin only
// while admin mode is on).
function AdminOnly({ children }) {
  const isAdmin = useAuthStore(isAdminState)
  return isAdmin ? children : <Navigate to="/" replace />
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
    useFestivalStore.getState().init()
  }, [])

  useEffect(() => {
    if (!approvedUserId) return
    useStore.getState().init()
    return () => useStore.getState().reset()
  }, [approvedUserId])

  // load this user's own pet (level, streak, outfit) and do today's เติมไฟ check-in
  useEffect(() => {
    if (!approvedUserId) return
    const { session, profile } = useAuthStore.getState()
    usePetStore.getState().init(session?.user, profile?.username)
    return () => usePetStore.getState().reset()
  }, [approvedUserId])

  return (
    <>
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center gap-2 bg-[var(--bg-page)] text-[var(--text-secondary)]">
          <Loader2 className="animate-spin" size={18} /> กำลังโหลด...
        </div>
      }
    >
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
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AdminOnly>
              <AuditLog />
            </AdminOnly>
          </ProtectedRoute>
        }
      />
    </Routes>
    </Suspense>
    {/* seasonal decorations (ลอยกระทง / ฮาโลวีน / ...) on every page */}
    <FestivalLayer />
    {/* celebratory "which festival" popup shown once after each fresh login */}
    <FestivalWelcome />
    {/* the user's pet companion (hides itself on /login and when the user hides it) */}
    {approvedUserId && (
      <Suspense fallback={null}>
        <PetCompanion />
      </Suspense>
    )}
    {/* "มีเวอร์ชันใหม่" popup — on every page, including login */}
    <UpdatePrompt />
    </>
  )
}
