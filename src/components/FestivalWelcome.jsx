import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useFestivalStore } from '../store/useFestivalStore'
import { FESTIVALS, festivalGreeting, parseAnniversary } from '../festival/festivals'

// A short celebratory popup shown once right after a fresh login, announcing which
// festival is currently active (💖 วาเลนไทน์, 🏮 ตรุษจีน, 🎄 คริสต์มาส, ...).
//  - Triggered by useFestivalStore.announce() (welcomeNonce), which Login.jsx calls on a
//    successful sign-in — so it never pops up on a page reload or a restored session.
//  - Shows nothing when there is no active festival, or when the user has turned the
//    festival theme off (active resolves to 'none').
//  - Auto-dismisses after a few seconds; closable by the user at any time.

const WELCOME_MS = 7000

// vivid per-festival accents for the card (independent of the subtler page palette)
const ACCENT = {
  loykrathong: { from: '#ffb24d', to: '#ff6a00', glow: 'rgba(255,160,60,.55)' },
  halloween: { from: '#ff9248', to: '#7c3aed', glow: 'rgba(255,117,24,.5)' },
  christmas: { from: '#ff5a5a', to: '#22c55e', glow: 'rgba(226,59,75,.5)' },
  newyear: { from: '#ffd27f', to: '#a855f7', glow: 'rgba(255,207,106,.5)' },
  chinesenewyear: { from: '#ffd24d', to: '#ff3b1e', glow: 'rgba(255,90,40,.55)' },
  valentine: { from: '#ff9fc3', to: '#ff2d6f', glow: 'rgba(255,90,140,.55)' },
  songkran: { from: '#8af0ff', to: '#1b9fd6', glow: 'rgba(60,200,245,.5)' },
  mothersday: { from: '#bfe3ff', to: '#3b82f6', glow: 'rgba(120,180,255,.5)' },
  fathersday: { from: '#ffe066', to: '#f59e0b', glow: 'rgba(250,204,21,.55)' },
  anniversary: { from: '#ffd27f', to: '#2563eb', glow: 'rgba(255,200,90,.5)' },
}

export default function FestivalWelcome() {
  const nonce = useFestivalStore((s) => s.welcomeNonce)
  const [fes, setFes] = useState(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!nonce) return // first render (nonce 0) → nothing
    let close, done
    // give the post-sign-in festival sync a moment, so we announce the admin's real choice
    const start = setTimeout(() => {
      const active = useFestivalStore.getState().active
      if (!active || active === 'none') return
      const f = FESTIVALS[active]
      setFes(f ? { ...f, greeting: festivalGreeting(active, parseAnniversary(useFestivalStore.getState().anniversary)) } : null)
      setLeaving(false)
      close = setTimeout(() => setLeaving(true), WELCOME_MS)
      done = setTimeout(() => setFes(null), WELCOME_MS + 320)
    }, 900)
    return () => {
      clearTimeout(start)
      clearTimeout(close)
      clearTimeout(done)
    }
  }, [nonce])

  if (!fes) return null
  const accent = ACCENT[fes.id] || ACCENT.newyear
  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => setFes(null), 320)
  }

  return (
    <div
      className={`fes-welcome-overlay ${leaving ? 'leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`เทศกาล ${fes.label}`}
      onClick={dismiss}
    >
      <div
        className={`fes-welcome-card ${leaving ? 'leaving' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ '--fw-from': accent.from, '--fw-to': accent.to, '--fw-glow': accent.glow }}
      >
        <button type="button" onClick={dismiss} aria-label="ปิด" className="fes-welcome-close">
          <X size={16} />
        </button>

        <div className="fes-welcome-emoji" aria-hidden="true">
          <span>{fes.emoji}</span>
        </div>

        <div className="fes-welcome-kicker">เทศกาลตอนนี้</div>
        <div className="fes-welcome-title">{fes.label}</div>
        <div className="fes-welcome-greeting">{fes.greeting}</div>
        <div className="fes-welcome-desc">{fes.desc}</div>

        <div className="fes-welcome-hint">ปรับการแสดงธีมได้ที่ ตั้งค่า › ธีมเทศกาล</div>
        <div className="fes-welcome-bar" aria-hidden="true">
          <span style={{ animationDuration: `${WELCOME_MS}ms` }} />
        </div>
      </div>
    </div>
  )
}
