import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

// "มีเวอร์ชันใหม่" popup. Each build writes its version id into the bundle and into
// /version.json (see vite.config.js). While the app is open it re-reads version.json
// every minute and whenever the tab comes back into view; once the deployed version
// differs from the one running here, people are asked to reload into the new version.
// Only active in production builds (vite dev has no version.json).

export const UPDATE_AUTHOR = 'WoravitSuwan'
const CHECK_EVERY_MS = 60 * 1000
const SNOOZE_MS = 5 * 60 * 1000 // "ภายหลัง" hides the popup for 5 minutes

export default function UpdatePrompt() {
  const [latest, setLatest] = useState(null) // { version, builtAt, seenAt } of a newer deployment
  const [snoozedUntil, setSnoozedUntil] = useState(0)

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined
    let stopped = false

    async function check() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        // a fresh object each check also re-evaluates the snooze below
        if (!stopped && data?.version && data.version !== __APP_VERSION__) setLatest({ ...data, seenAt: Date.now() })
      } catch {
        // offline / deploy in progress — try again on the next tick
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }

    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!latest || latest.seenAt < snoozedUntil) return null

  const builtAt = latest.builtAt ? new Date(latest.builtAt) : null
  const builtText =
    builtAt && !Number.isNaN(builtAt.getTime())
      ? builtAt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
      : null

  return (
    <div className="anim-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="anim-modal w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
          <RefreshCw size={26} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">มีเวอร์ชันใหม่ของระบบ</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          มีการอัปเดตโค้ดใหม่จาก dev <span className="font-semibold text-[var(--text-primary)]">{UPDATE_AUTHOR}</span>
        </p>
        {builtText && <p className="mt-1 text-xs text-[var(--text-faint)]">อัปเดตเมื่อ {builtText}</p>}
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          กด "อัปเดตเป็นเวอร์ชันใหม่" เพื่อโหลดระบบเวอร์ชันล่าสุด ถ้ากำลังกรอกข้อมูลค้างอยู่ ให้บันทึกก่อนแล้วค่อยอัปเดต
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <RefreshCw size={15} /> อัปเดตเป็นเวอร์ชันใหม่
          </button>
          <button
            onClick={() => setSnoozedUntil(Date.now() + SNOOZE_MS)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            ภายหลัง (เตือนอีกครั้งใน 5 นาที)
          </button>
        </div>
      </div>
    </div>
  )
}
