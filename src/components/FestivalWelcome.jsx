import { useEffect, useMemo, useRef, useState } from 'react'
import { X, SkipForward } from 'lucide-react'
import { useFestivalStore } from '../store/useFestivalStore'
import { FESTIVALS, festivalGreeting, parseAnniversary } from '../festival/festivals'
import { atLeast, motionReduced } from '../store/useSpectacleStore'
import { emitFx } from '../lib/fxBus'

// The festival greeting shown once right after a fresh login.
//  - Triggered by useFestivalStore.announce() (welcomeNonce), which Login.jsx calls on a
//    successful sign-in — never on a page reload or a restored session.
//  - Nothing when there is no active festival or the user turned the theme off.
//  - Grand / Showstopper levels: a choreographed GRAND ENTRANCE — curtains part, spotlight
//    beams sweep in, the badge pops, the title reveals letter by letter (Thai-safe:
//    split by grapheme), then the greeting and the festival's particles.
//    Lite / Balanced: the simple card. Reduced motion: shown still.
//  - "ข้าม · เข้าสู่ระบบทันที" works at every moment (also Esc, or clicking outside);
//    it closes on its own after a few seconds.

const DURATION = { lite: 5000, balanced: 6000, grand: 7000, showstopper: 8000 }

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

const PARTICLES = {
  loykrathong: ['🪷', '🏮', '✨', '🌕'],
  halloween: ['🎃', '🦇', '👻', '✨'],
  christmas: ['❄️', '🎁', '⭐', '🎄'],
  newyear: ['🎆', '🎉', '✨', '🥂'],
  chinesenewyear: ['🧧', '🏮', '🍊', '✨'],
  valentine: ['💖', '🌹', '💕', '✨'],
  songkran: ['💦', '🌸', '💧', '✨'],
  mothersday: ['🌼', '🤍', '💙', '✨'],
  fathersday: ['💛', '🌟', '⭐', '✨'],
  anniversary: ['🎉', '🎈', '🎊', '✨'],
}

// Thai vowels / tone marks must stay with their letter: split by grapheme cluster
function graphemes(text) {
  try {
    return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((s) => s.segment)
  } catch {
    return [text]
  }
}

export default function FestivalWelcome() {
  const nonce = useFestivalStore((s) => s.welcomeNonce)
  const [fes, setFes] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])
  const skipRef = useRef(null)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => {
    if (!nonce) return undefined // first render (nonce 0) → nothing
    // give the post-sign-in festival sync a moment, so we announce the admin's real choice
    const start = setTimeout(() => {
      const active = useFestivalStore.getState().active
      if (!active || active === 'none') return
      const f = FESTIVALS[active]
      if (!f) return
      const grand = atLeast('grand') && !motionReduced()
      const level = ['showstopper', 'grand', 'balanced', 'lite'].find((l) => atLeast(l)) || 'balanced'
      const ms = DURATION[level]
      setFes({ ...f, greeting: festivalGreeting(active, parseAnniversary(useFestivalStore.getState().anniversary)), grand, ms, dense: atLeast('showstopper') })
      setLeaving(false)
      emitFx('festival-curtain', { festival: active })
      timers.current.push(setTimeout(() => setLeaving(true), ms))
      timers.current.push(setTimeout(() => setFes(null), ms + 320))
    }, 900)
    return () => {
      clearTimeout(start)
      clearTimers()
    }
  }, [nonce])

  const dismiss = () => {
    clearTimers()
    setLeaving(true)
    timers.current.push(setTimeout(() => setFes(null), 320))
  }

  // Esc skips; the skip button takes focus so Enter / Space skip too
  useEffect(() => {
    if (!fes) return undefined
    skipRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fes])

  const particles = useMemo(() => {
    if (!fes?.grand) return []
    const set = PARTICLES[fes.id] || ['✨']
    const n = fes.dense ? 26 : 16
    return Array.from({ length: n }, (_, i) => ({
      e: set[i % set.length],
      left: `${(i * 37) % 100}%`,
      delay: `${1.1 + ((i * 13) % 17) * 0.09}s`,
      dur: `${3.2 + ((i * 7) % 11) * 0.22}s`,
      size: 14 + ((i * 11) % 14),
    }))
  }, [fes])

  if (!fes) return null
  const accent = ACCENT[fes.id] || ACCENT.newyear
  const vars = { '--fw-from': accent.from, '--fw-to': accent.to, '--fw-glow': accent.glow }

  return (
    <div
      className={`fes-welcome-overlay ${fes.grand ? 'grand' : ''} ${leaving ? 'leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`เทศกาล ${fes.label}`}
      onClick={dismiss}
      style={vars}
    >
      {fes.grand && (
        <>
          <div className="fw-curtain left" aria-hidden="true" />
          <div className="fw-curtain right" aria-hidden="true" />
          <div className="fw-beam l" aria-hidden="true" />
          <div className="fw-beam r" aria-hidden="true" />
          <div className="fw-particles" aria-hidden="true">
            {particles.map((p, i) => (
              <span key={i} style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, fontSize: p.size }}>
                {p.e}
              </span>
            ))}
          </div>
        </>
      )}

      <div className={`fes-welcome-card ${leaving ? 'leaving' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={dismiss} aria-label="ปิด" className="fes-welcome-close">
          <X size={16} />
        </button>

        <div className="fes-welcome-emoji" aria-hidden="true">
          <span>{fes.emoji}</span>
        </div>

        <div className="fes-welcome-kicker">เทศกาลตอนนี้</div>
        <div className="fes-welcome-title">
          {fes.grand ? (
            <span>
              <span className="sr-only">{fes.label}</span>
              {graphemes(fes.label).map((g, i, all) => (
                <span key={i} className="fw-ch" aria-hidden="true" style={{ animationDelay: `${0.95 + i * 0.045}s`, '--t': all.length > 1 ? i / (all.length - 1) : 0 }}>
                  {g === ' ' ? ' ' : g}
                </span>
              ))}
            </span>
          ) : (
            fes.label
          )}
        </div>
        <div className="fes-welcome-greeting">{fes.greeting}</div>
        <div className="fes-welcome-desc">{fes.desc}</div>

        <div className="fes-welcome-hint">ปรับการแสดงธีมได้ที่ ตั้งค่า › ธีมเทศกาล · ระดับความอลังการ</div>
        <div className="fes-welcome-bar" aria-hidden="true">
          <span style={{ animationDuration: `${fes.ms}ms` }} />
        </div>
      </div>

      <button
        ref={skipRef}
        type="button"
        className="fw-skip"
        onClick={(e) => {
          e.stopPropagation()
          dismiss()
        }}
      >
        ข้าม · เข้าสู่ระบบทันที <SkipForward size={14} />
      </button>
    </div>
  )
}
