// Full-screen "loading" — a trail of little paw prints walking across, instead of a plain
// spinner. Pure CSS + tiny inline SVG so it costs nothing to show.

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

export default function PawLoader({ text = 'กำลังโหลด...' }) {
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
