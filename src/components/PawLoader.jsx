// Full-screen "loading" — a trail of little paw prints walking across, instead of a plain
// spinner. Pure CSS + tiny inline SVG so it costs nothing to show.
// With `skeleton`, the page's shape (header + bento cards + rows) is sketched underneath
// with a soft shimmer and faint paw-print watermarks, so the screen doesn't jump when the
// data arrives.

function Paw() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="12" cy="16" rx="5.6" ry="4.8" />
      <ellipse cx="5.2" cy="10.4" rx="2.3" ry="2.8" transform="rotate(-18 5.2 10.4)" />
      <ellipse cx="9.6" cy="6.4" rx="2.3" ry="2.9" transform="rotate(-6 9.6 6.4)" />
      <ellipse cx="14.4" cy="6.4" rx="2.3" ry="2.9" transform="rotate(6 14.4 6.4)" />
      <ellipse cx="18.8" cy="10.4" rx="2.3" ry="2.8" transform="rotate(18 18.8 10.4)" />
    </svg>
  )
}

function SkeletonCard({ wide = false, rows = 0 }) {
  return (
    <div className={`paw-skel-card ${wide ? 'wide' : ''}`}>
      <span className="paw-skel-mark">
        <Paw />
      </span>
      <span className="paw-skel-line w-1/3" />
      <span className="paw-skel-line w-2/3" style={{ height: 22 }} />
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="paw-skel-line" style={{ width: `${88 - i * 9}%` }} />
      ))}
    </div>
  )
}

export default function PawLoader({ text = 'กำลังโหลด...', skeleton = false }) {
  if (!skeleton) {
    return (
      <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-page)] px-4 text-center">
        <div className="paw-trail" aria-hidden="true">
          <Paw />
          <Paw />
          <Paw />
          <Paw />
          <Paw />
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">{text}</p>
      </div>
    )
  }
  return (
    <div role="status" aria-busy="true" className="paw-skel min-h-screen bg-[var(--bg-page)] px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="paw-trail" aria-hidden="true">
            <Paw />
            <Paw />
            <Paw />
            <Paw />
            <Paw />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{text}</p>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-5">
          <div className="paw-skel-head">
            <span className="paw-skel-line w-2/5" style={{ height: 26 }} />
            <span className="paw-skel-line w-1/4" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard wide rows={2} />
            <SkeletonCard rows={1} />
            <SkeletonCard rows={1} />
            <SkeletonCard rows={2} />
          </div>
          <div className="paw-skel-card">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="paw-skel-dot" />
                <span className="paw-skel-line flex-1" style={{ maxWidth: `${70 - i * 7}%` }} />
                <span className="paw-skel-line w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
