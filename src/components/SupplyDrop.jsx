import { useEffect, useRef, useState } from 'react'
import { usePetStore, dayKey } from '../store/usePetStore'
import { useThemeStore } from '../store/useThemeStore'
import { useActiveFestival } from '../store/useFestivalStore'
import { teamClaimSupply } from '../lib/teamApi'
import { emitFx } from '../lib/fxBus'
import { SUPPLY_EVERY_MIN, SUPPLY_AFK_SEC, SUPPLY_DAILY_CAP, SUPPLY_XP, SUPPLY_COINS } from '../pet/petData'

// Supply Drop — "จิ้มรับ EXP ตามเวลาทำงานจริง".
//  - The clock only runs while the user is really working: a click, a key, scrolling, a
//    page change or a real mouse move (tiny jiggles don't count) within the last
//    SUPPLY_AFK_SEC seconds, with the tab visible. Away from the desk → it stops (anti-AFK).
//  - Every SUPPLY_EVERY_MIN minutes of that, a small drop lands in the corner, dressed for
//    the user's theme (a parachute crate · a paper lantern · a holo cube · a gold orb).
//    Tap it: +XP for the pet and 🪙 fashion coins. At most SUPPLY_DAILY_CAP a day.
//  - The server (migration 008) decides whether a claim counts — 6 a day, 8+ minutes
//    apart — so points can't be farmed. Without 008 the same cap is kept on this device.
//  - Never in the way: small, in the corner, slides almost out of view while a form field
//    has focus, sits under dialogs, hidden when printing and in โหมดทำงานล้วน.

const MOVE_PX = 24 // a mouse move counts as activity only past this distance
const SAVE_EVERY = 15 // seconds between saves of the active-time counter
const lsKey = (owner) => `sts-supply-active:${owner || ''}`
const FIELD = 'input, textarea, select, [contenteditable="true"]'

function readActive(owner) {
  try {
    const v = JSON.parse(localStorage.getItem(lsKey(owner)) || 'null')
    return v && v.day === dayKey() ? Math.max(0, Number(v.sec) || 0) : 0
  } catch {
    return 0
  }
}
function writeActive(owner, sec) {
  try {
    localStorage.setItem(lsKey(owner), JSON.stringify({ day: dayKey(), sec: Math.floor(sec) }))
  } catch {
    /* storage blocked — the counter just restarts next visit */
  }
}

function DropArt({ skin }) {
  if (skin === 'japanese') {
    return (
      <svg viewBox="0 0 64 76" width="100%" height="100%" aria-hidden="true">
        <path d="M32 2 V10" stroke="#3b2516" strokeWidth="2" />
        <rect x="22" y="9" width="20" height="5" rx="1.5" fill="#2b1a10" />
        <ellipse cx="32" cy="38" rx="21" ry="25" fill="#e2553b" />
        <path d="M13 30 H51 M12 38 H52 M13 46 H51" stroke="#b8321f" strokeWidth="1.6" />
        <ellipse cx="32" cy="38" rx="11" ry="20" fill="#ffd27a" opacity=".35" />
        <text x="32" y="43" textAnchor="middle" fontSize="14" fontWeight="900" fill="#2b1a10">宝</text>
        <rect x="22" y="62" width="20" height="5" rx="1.5" fill="#2b1a10" />
        <path d="M29 67 V74 M32 67 V75 M35 67 V74" stroke="#f2c14e" strokeWidth="1.6" />
      </svg>
    )
  }
  if (skin === 'cyber') {
    return (
      <svg viewBox="0 0 64 76" width="100%" height="100%" aria-hidden="true">
        <path d="M32 10 L56 23 V51 L32 64 L8 51 V23 Z" fill="rgba(34,211,238,.18)" stroke="#22d3ee" strokeWidth="2" />
        <path d="M8 23 L32 36 L56 23 M32 36 V64" stroke="#d946ef" strokeWidth="1.6" fill="none" />
        <path d="M32 18 L44 25 L32 32 L20 25 Z" fill="#22d3ee" opacity=".55" />
        <text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="800" fill="#e8fbff" fontFamily="Inter, sans-serif">XP</text>
        <ellipse cx="32" cy="72" rx="18" ry="3" fill="#22d3ee" opacity=".35" />
      </svg>
    )
  }
  if (skin === 'minimal') {
    return (
      <svg viewBox="0 0 64 76" width="100%" height="100%" aria-hidden="true">
        <defs>
          <radialGradient id="sd-gold" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#fff6d5" />
            <stop offset="55%" stopColor="#e3c25b" />
            <stop offset="100%" stopColor="#8a6a1c" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="36" r="24" fill="url(#sd-gold)" />
        <circle cx="32" cy="36" r="29" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity=".7" />
        <text x="32" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill="#3b2f0b" fontFamily="Inter, sans-serif">XP</text>
        <ellipse cx="32" cy="72" rx="16" ry="2.5" fill="#000" opacity=".2" />
      </svg>
    )
  }
  // geotech_classic: a parachute crate with the STS stencil
  return (
    <svg viewBox="0 0 64 76" width="100%" height="100%" aria-hidden="true">
      <path d="M6 24 Q32 -6 58 24 Q51 19 45 24 Q38 18 32 24 Q26 18 19 24 Q13 19 6 24 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />
      <path d="M19 24 Q24 10 32 4 M45 24 Q40 10 32 4" stroke="#fde68a" strokeWidth="1.4" fill="none" />
      <path d="M6 24 L20 46 M19 24 L24 46 M45 24 L40 46 M58 24 L44 46" stroke="#94a3b8" strokeWidth="1" />
      <rect x="18" y="44" width="28" height="24" rx="2" fill="#a16207" stroke="#713f12" strokeWidth="1.4" />
      <path d="M18 51 H46 M18 61 H46" stroke="#713f12" strokeWidth="1.2" />
      <rect x="24" y="52.5" width="16" height="7" rx="1" fill="#1e3a8a" />
      <text x="32" y="58.2" textAnchor="middle" fontSize="5.8" fontWeight="900" fill="#fde68a" fontFamily="Inter, sans-serif">STS</text>
    </svg>
  )
}

export default function SupplyDrop() {
  const ready = usePetStore((s) => s.ready)
  const owner = usePetStore((s) => s.owner)
  const supplyDay = usePetStore((s) => s.pet.supplyDay)
  const supplyCount = usePetStore((s) => s.pet.supplyCount)
  const skin = useThemeStore((s) => s.skin)
  const festival = useActiveFestival()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [note, setNote] = useState('')
  const btnRef = useRef(null)
  const claimedToday = supplyDay === dayKey() ? supplyCount || 0 : 0
  const claimedRef = useRef(claimedToday)
  claimedRef.current = claimedToday

  // the active-time clock (one interval, cleaned up on unmount)
  useEffect(() => {
    if (!ready || !owner) return undefined
    let sec = readActive(owner)
    let day = dayKey()
    let lastAct = Date.now()
    let lx = null
    let ly = null
    let sinceSave = 0
    const act = () => {
      lastAct = Date.now()
    }
    const onMove = (e) => {
      if (lx == null || Math.hypot(e.clientX - lx, e.clientY - ly) >= MOVE_PX) {
        lx = e.clientX
        ly = e.clientY
        act()
      }
    }
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    evs.forEach((ev) => window.addEventListener(ev, act, { passive: true }))
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('hashchange', act)
    const tick = setInterval(() => {
      if (dayKey() !== day) {
        day = dayKey()
        sec = 0
      }
      const working = document.visibilityState === 'visible' && Date.now() - lastAct <= SUPPLY_AFK_SEC * 1000
      if (!working) return
      sec += 1
      sinceSave += 1
      if (sinceSave >= SAVE_EVERY) {
        sinceSave = 0
        writeActive(owner, sec)
      }
      const claimed = claimedRef.current
      if (claimed < SUPPLY_DAILY_CAP && sec >= (claimed + 1) * SUPPLY_EVERY_MIN * 60) setShow(true)
    }, 1000)
    return () => {
      clearInterval(tick)
      writeActive(owner, sec)
      evs.forEach((ev) => window.removeEventListener(ev, act))
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('hashchange', act)
    }
  }, [ready, owner])

  // out of the way while typing in a form
  useEffect(() => {
    let t = 0
    const onFocus = () => setTucked(!!document.activeElement?.matches?.(FIELD))
    const onBlur = () => {
      clearTimeout(t)
      t = setTimeout(onFocus, 0)
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => {
      clearTimeout(t)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [])

  // a short note fades by itself
  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(() => setNote(''), 3200)
    return () => clearTimeout(t)
  }, [note])

  if (!ready || (!show && !note)) return null

  async function claim() {
    if (busy) return
    setBusy(true)
    const r = btnRef.current?.getBoundingClientRect()
    const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : {}
    try {
      const { data } = await teamClaimSupply()
      const store = usePetStore.getState()
      if (data && data.ok) {
        store.rewardSupply({ festival: data.festival || null, todayClaims: data.today_claims })
        emitFx('supply', at)
        setShow(false)
      } else if (data && data.reason === 'cap') {
        store.syncSupplyCount(SUPPLY_DAILY_CAP)
        setNote(`วันนี้รับครบ ${SUPPLY_DAILY_CAP} กล่องแล้ว — พรุ่งนี้มาใหม่นะ`)
        setShow(false)
      } else if (data && data.reason === 'too_soon') {
        setNote(`อีกประมาณ ${Math.max(1, Math.ceil((Number(data.wait_s) || 60) / 60))} นาทีถึงจะรับกล่องถัดไปได้`)
        setShow(false)
      } else if (data && data.reason === 'not_allowed') {
        setShow(false)
      } else if (store.canClaimLocal()) {
        // the team database (008) isn't installed / reachable: same reward, same daily cap,
        // kept on this device only (it doesn't count in the ranking)
        store.rewardSupply({ festival: festival !== 'none' ? festival : null })
        emitFx('supply', at)
        setShow(false)
      } else {
        setNote(`วันนี้รับครบ ${SUPPLY_DAILY_CAP} กล่องแล้ว — พรุ่งนี้มาใหม่นะ`)
        setShow(false)
      }
    } catch {
      setShow(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`supply-wrap ${tucked ? 'tucked' : ''}`} data-skin={skin}>
      {show && (
        <button
          ref={btnRef}
          type="button"
          className="supply-drop"
          onClick={claim}
          disabled={busy}
          aria-label={`รับ Supply Drop: +${SUPPLY_XP} XP และ +${SUPPLY_COINS} เหรียญแฟชั่น (วันนี้ ${claimedToday}/${SUPPLY_DAILY_CAP})`}
          title={`Supply Drop จากเวลาทำงานจริง — กดรับ +${SUPPLY_XP} XP · +${SUPPLY_COINS} 🪙 (วันนี้ ${claimedToday}/${SUPPLY_DAILY_CAP})`}
        >
          <span className="supply-art">
            <DropArt skin={skin} />
          </span>
          <span className="supply-tag">+{SUPPLY_XP} XP</span>
        </button>
      )}
      {note && (
        <div className="supply-note" role="status">
          {note}
        </div>
      )}
    </div>
  )
}
