import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  // Portal to <body>: a modal opened from the sidebar would otherwise be trapped inside the
  // sidebar's transformed box and squeezed to its width.
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`anim-modal max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl ${
          wide ? 'max-w-5xl' : 'max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-4 sm:px-6">
          <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
