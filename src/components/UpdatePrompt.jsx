import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { RELEASE } from '../release'

// Updates WITHOUT a popup.
// Each build writes its version id into the bundle and into /version.json (see
// vite.config.js). While the app is open it re-reads version.json every minute and when
// the tab comes back into view. When a newer deployment is out, the app reloads itself
// quietly at a SAFE moment — never while someone may be in the middle of typing:
//  - as soon as they move to another page (they're done with the previous one), or
//  - when the tab is in the background, or they've been idle for 2 minutes,
//    and nothing has been typed since the last save.
// After the update, a short "what's new / what's fixed" note is shown once (RELEASE).
// Only active in production builds (vite dev has no version.json).

export const UPDATE_AUTHOR = 'WoravitSuwan'
const CHECK_EVERY_MS = 60 * 1000
const IDLE_MS = 2 * 60 * 1000
const RETRY_GUARD_MS = 10 * 60 * 1000 // a CDN still serving the old build won't cause a reload loop
const LS_ATTEMPT = 'sts-update-attempt'
const LS_SEEN = 'sts-release-seen'

function useSilentUpdates() {
  useEffect(() => {
    if (!import.meta.env.PROD) return undefined
    let stopped = false
    let pending = null // version id of a newer deployment
    let dirty = false // something typed and not yet saved
    let lastActivity = Date.now()

    const reloadNow = () => {
      if (!pending) return
      try {
        const prev = JSON.parse(localStorage.getItem(LS_ATTEMPT) || 'null')
        if (prev && prev.version === pending && Date.now() - prev.at < RETRY_GUARD_MS) return
        localStorage.setItem(LS_ATTEMPT, JSON.stringify({ version: pending, at: Date.now() }))
      } catch {
        /* storage blocked — still fine to reload */
      }
      window.location.reload()
    }
    const trySafeReload = () => {
      if (!pending || dirty) return
      if (document.visibilityState === 'hidden' || Date.now() - lastActivity > IDLE_MS) reloadNow()
    }

    async function check() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!stopped && data?.version && data.version !== __APP_VERSION__) {
          pending = data.version
          trySafeReload()
        }
      } catch {
        // offline / deploy in progress — try again on the next tick
      }
    }

    const onInput = (e) => {
      if (e.target?.closest?.('form, input, textarea, select')) dirty = true
    }
    const onSubmit = () => {
      dirty = false
    }
    const onActivity = () => {
      lastActivity = Date.now()
    }
    const onRoute = () => {
      // leaving a page = done with it: the safest moment to switch versions
      dirty = false
      if (pending) reloadNow()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
      else trySafeReload()
    }

    check()
    const timer = setInterval(() => {
      check()
      trySafeReload()
    }, CHECK_EVERY_MS)
    document.addEventListener('input', onInput, true)
    document.addEventListener('submit', onSubmit, true)
    window.addEventListener('hashchange', onRoute)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, onActivity, { passive: true })
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('submit', onSubmit, true)
      window.removeEventListener('hashchange', onRoute)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.removeEventListener(ev, onActivity)
    }
  }, [])
}

// "อัปเดตระบบแล้ว ✓" — once per device per release, for signed-in users, after any
// festival welcome popup has gone.
function ReleaseNote() {
  const { pathname } = useLocation()
  const signedIn = useAuthStore((s) => !!s.session && s.profile?.status === 'approved')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!signedIn || pathname === '/login') return undefined
    let seen = null
    try {
      seen = localStorage.getItem(LS_SEEN)
    } catch {
      /* ignore */
    }
    if (seen === RELEASE.id) return undefined
    let timer
    const tryShow = () => {
      if (document.querySelector('.fes-welcome-overlay')) timer = setTimeout(tryShow, 1000)
      else setShow(true)
    }
    timer = setTimeout(tryShow, 1500)
    return () => clearTimeout(timer)
  }, [signedIn, pathname])

  if (!show) return null
  const close = () => {
    try {
      localStorage.setItem(LS_SEEN, RELEASE.id)
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  return (
    <div className="anim-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="release-title" onClick={close}>
      <div className="anim-modal w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#22c55e,#38bdf8,#6366f1)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Sparkles size={22} />
            </span>
            <h2 id="release-title" className="text-lg font-bold text-[var(--text-primary)]">
              {RELEASE.title}
            </h2>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {RELEASE.items.map((t) => (
              <li key={t} className="flex gap-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={close}
            autoFocus
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UpdatePrompt() {
  useSilentUpdates()
  return <ReleaseNote />
}
