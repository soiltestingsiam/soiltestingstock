import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function NavCard({ to, icon, title, subtitle, description, glow, floatDelay = '0s' }) {
  const navigate = useNavigate()
  return (
    <div className="group glow-border card-fancy relative rounded-2xl">
      <button
        onClick={() => navigate(to)}
        style={{
          backgroundImage: glow
            ? `radial-gradient(circle at 50% 0%, ${glow}, transparent 65%)`
            : undefined,
        }}
        className="btn-shine relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-8 text-center shadow-card sm:gap-5 sm:px-6 sm:py-10"
      >
        {/* soft glow that blooms on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow ? `radial-gradient(circle at 50% 10%, ${glow}, transparent 60%)` : undefined }}
        />
        <div className="relative flex h-28 items-center justify-center transition duration-300 group-hover:-translate-y-1 group-hover:scale-110 sm:h-32 lg:h-40">
          <div className="float-icon" style={{ animationDelay: floatDelay }}>{icon}</div>
        </div>
        <div className="relative">
          <div className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">{title}</div>
          <div className="mt-1 text-sm font-medium text-[var(--text-muted)]">{subtitle}</div>
          <div className="mt-2 text-xs text-[var(--text-faint)]">{description}</div>
          <div className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-[var(--text-accent)] opacity-0 transition-all duration-300 group-hover:opacity-100">
            เปิด <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </button>
    </div>
  )
}
