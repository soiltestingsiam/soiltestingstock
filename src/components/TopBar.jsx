import { useState } from 'react'
import { Settings, LogOut, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SealLogo from './SealLogo'
import SettingsModal from './SettingsModal'
import { useAuthStore, useCurrentUser, usePendingCount } from '../store/useAuthStore'

export default function TopBar() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const pendingCount = usePendingCount()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative">
      {/* faint gold accent line behind the header content */}
      <div
        className="pointer-events-none absolute left-24 right-0 top-10 h-px opacity-40"
        style={{
          background: 'linear-gradient(90deg, rgba(212,175,55,0.9) 0%, rgba(212,175,55,0.15) 70%, transparent 100%)',
        }}
      />

      <div className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <SealLogo size={44} />
          <div className="min-w-0">
            <div className="text-2xl font-extrabold tracking-wide text-sky-400 sm:text-3xl">STS</div>
            <div className="-mt-1 truncate text-[10px] font-medium tracking-[0.15em] text-[var(--text-faint)] sm:text-[11px] sm:tracking-[0.2em]">
              SOIL TESTING SIAM
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-2.5 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
            <UserCircle2 size={26} className="text-[var(--text-secondary)] sm:h-[30px] sm:w-[30px]" />
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {currentUser?.username ?? '-'}
              </div>
              <div className="text-[11px] text-[var(--text-faint)]">
                {currentUser?.role === 'Admin' ? 'administrator' : 'user profile'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-surface-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] sm:h-10 sm:w-10"
            aria-label="ตั้งค่า"
          >
            <Settings size={18} />
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white" title={`รออนุมัติ ${pendingCount} คน`}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={handleSignOut}
            className="flex flex-shrink-0 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-2.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] sm:px-4"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
