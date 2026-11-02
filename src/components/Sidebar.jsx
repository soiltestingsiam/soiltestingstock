import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Package,
  PackagePlus,
  PackageMinus,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react'
import SettingsModal from './SettingsModal'
import SealLogo from './SealLogo'
import { useAuthStore, useCurrentUser, usePendingCount } from '../store/useAuthStore'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'PRODUCT LIST', icon: Package },
  { to: '/stock-in', label: 'Stock In', icon: PackagePlus },
  { to: '/stock-out', label: 'Stock Out', icon: PackageMinus },
  { to: '/stock', label: 'Stock', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: ClipboardList },
]

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const currentUser = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const pendingCount = usePendingCount()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* backdrop, mobile drawer only */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-card)] transition-transform duration-200 md:sticky md:top-0 md:z-auto md:w-64 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-5 py-5">
          <SealLogo size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-[var(--text-primary)]">Inventory System</div>
            <div className="truncate text-[10px] font-medium tracking-wide text-[var(--text-faint)]">
              STS · SOIL TESTING SIAM
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] md:hidden"
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[var(--bg-hover-strong)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`
                  }
                >
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--border-color)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {currentUser?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {currentUser?.username ?? '-'}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
                <ShieldCheck size={11} />
                {currentUser?.role === 'Admin' ? 'Admin' : 'Staff'}
              </div>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              aria-label="ตั้งค่า"
            >
              <Settings size={15} />
              {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white" title={`รออนุมัติ ${pendingCount} คน`}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
            </button>
            <button
              onClick={handleSignOut}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              aria-label="ออกจากระบบ"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </aside>
    </>
  )
}
