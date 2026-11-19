import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import Sidebar from './Sidebar'

// `heading` replaces the plain title (e.g. PRODUCT LIST + รายการสินค้า), `subtitle` sits
// under it, and `backTo` adds the round back button shown in the spec.
export default function SidebarLayout({ title, heading, subtitle, backTo, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)]"
            aria-label="เปิดเมนู"
          >
            <Menu size={18} />
          </button>
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className={`mb-5 items-start gap-3 md:mb-6 ${heading || subtitle ? 'flex' : 'hidden md:flex'}`}>
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                aria-label="ย้อนกลับ"
                className="mt-0.5 hidden h-9 w-9 flex-shrink-0 md:flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-surface-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className={`whitespace-nowrap text-2xl font-bold text-[var(--text-primary)] ${heading ? '' : 'hidden md:block'}`}>
                {heading ?? title}
              </h1>
              {subtitle && <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>}
            </div>
          </div>
          <div className="anim-fade-up">{children}</div>
        </div>
      </div>
    </div>
  )
}
