import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import PawLoader from './components/PawLoader'
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
// อันดับทีม & สัตว์เลี้ยงเพื่อนร่วมทีม (hidden in โหมดทำงานล้วน)
const Ranking = lazy(() => import('./pages/Ranking'))
// each user's pet walking along the bottom of every page (signed-in only)
const PetCompanion = lazy(() => import('./components/PetCompanion'))
import UpdatePrompt from './components/UpdatePrompt'
import FestivalLayer from './components/FestivalLayer'
// cursor, trails, click particles, tilt, celebrations — after the page has loaded
const InteractionLayer = lazy(() => import('./components/InteractionLayer'))
import FestivalWelcome from './components/FestivalWelcome'
import FxBoundary from './components/FxBoundary'
import RouteWarp from './components/RouteWarp'
// Supply Drop — EXP from real active time (signed-in only, lazy)
const SupplyDrop = lazy(() => import('./components/SupplyDrop'))
import { usePureWork } from './store/useSpectacleStore'
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
    return <PawLoader text="กำลังโหลดข้อมูล..." skeleton />
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
  const skin = useThemeStore((s) => s.skin)
  // "โหมดทำงานล้วน": no pet, no Supply Drop, no festival scenes, no particles / cursor
  const pureWork = usePureWork()
  // the interaction layer loads once the page is up and idle (keeps first paint fast)
  const [fxReady, setFxReady] = useState(false)
  useEffect(() => {
    let idle
    let t
    const go = () => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(() => setFxReady(true), { timeout: 1800 })
      else t = setTimeout(() => setFxReady(true), 400)
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  // the user's personal theme (classic · japanese · cyber · minimal)
  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
  }, [skin])

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

  // the admin's festival choice: re-read it once signed in (a signed-out read isn't
  // allowed), and again whenever the tab comes back into view
  useEffect(() => {
    if (!approvedUserId) return
    useFestivalStore.getState().onSignedIn()
    const onVis = () => document.visibilityState === 'visible' && useFestivalStore.getState().sync()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [approvedUserId])

  // load this user's own pet (level, streak, outfit) and do today's เติมไฟ check-in
  useEffect(() => {
    if (!approvedUserId) return
    const { session, profile } = useAuthStore.getState()
    // the account's look (theme / skin / cursor) follows the user to this device
    useThemeStore.getState().adoptRemote(session?.user?.user_metadata?.prefs)
    usePetStore.getState().init(session?.user, profile?.username)
    return () => usePetStore.getState().reset()
  }, [approvedUserId])

  return (
    <>
    <Suspense
      fallback={<PawLoader text="กำลังโหลด..." />}
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
        path="/ranking"
        element={
          <ProtectedRoute>
            <RequireData>
              <Ranking />
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
    {/* Everything below except UpdatePrompt is decoration: each piece sits in its own
        FxBoundary (an error just hides that piece) and is left out in โหมดทำงานล้วน. */}
    {/* seasonal decorations (ลอยกระทง / ฮาโลวีน / ...) on every page */}
    {!pureWork && (
      <FxBoundary name="festival">
        <FestivalLayer />
      </FxBoundary>
    )}
    {/* celebratory "which festival" popup shown once after each fresh login */}
    {!pureWork && (
      <FxBoundary name="festival-welcome">
        <FestivalWelcome />
      </FxBoundary>
    )}
    {/* the user's pet companion (hides itself on /login and when the user hides it) */}
    {approvedUserId && !pureWork && (
      <FxBoundary name="pet">
        <Suspense fallback={null}>
          <PetCompanion />
        </Suspense>
      </FxBoundary>
    )}
    {/* Supply Drop: EXP from real active time, in the corner */}
    {approvedUserId && !pureWork && fxReady && (
      <FxBoundary name="supply-drop">
        <Suspense fallback={null}>
          <SupplyDrop />
        </Suspense>
      </FxBoundary>
    )}
    {/* a short warp of light between pages */}
    {!pureWork && (
      <FxBoundary name="route-warp">
        <RouteWarp />
      </FxBoundary>
    )}
    {/* "มีเวอร์ชันใหม่" popup — on every page, including login */}
    <UpdatePrompt />
    {fxReady && !pureWork && (
      <FxBoundary name="interaction">
        <Suspense fallback={null}>
          <InteractionLayer />
        </Suspense>
      </FxBoundary>
    )}
    </>
  )
}
