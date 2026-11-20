import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, Flame, EyeOff, Pencil, Check, AlertTriangle, ChevronRight, Briefcase, Truck, Footprints } from 'lucide-react'
import PetSprite from '../pet/PetSprite'
import Wardrobe from '../pet/Wardrobe'
import { usePetStore, dayKey, TRICKS } from '../store/usePetStore'
import { onFx, emitFx } from '../lib/fxBus'
import { atLeast, motionReduced } from '../store/useSpectacleStore'
import { useStore } from '../store/useStore'
import { useActiveFestival } from '../store/useFestivalStore'
import { useThemeStore } from '../store/useThemeStore'
import { buildStockRows, lowStockRows } from '../utils/stockStatus'
import { formatNumber } from '../utils/format'
import {
  RARITY,
  SPECIES,
  NAME_MAX,
  WORK_XP_DAILY_CAP,
  SLEEP_FROM_HOUR,
  SLEEP_UNTIL_HOUR,
  isSleepyHour,
  auraTier,
  levelInfo,
  pickCoat,
  resolveOutfit,
  sizeForLevel,
} from '../pet/petData'

// The user's own pet, living along the bottom of every page.
//  - walks back and forth on its own (pauses now and then, turns around at the edges)
//  - its eyes follow the mouse; it blinks; hover = it stops and looks at you
//  - click = happy face + hearts, and opens its panel (name / level / เติมไฟ streak /
//    low stock / cat-or-dog / dress-up). It can be hidden from the panel, and brought
//    back in ตั้งค่า.
//  - reacts to work: hops and cheers on every save / import, gives a once-a-day heads-up
//    when stock is running low, and dozes off after hours (19:00–06:00; a click wakes it)
//    or when nobody has touched the mouse / keyboard for a while.
//  - stock health: while anything is low or below zero it carries a checklist and shows
//    an "ภารกิจด่วน" marker — one click goes to รับสินค้า with that product picked; when
//    everything is back to normal it celebrates.
//  - drag it anywhere and it stays there (this device); "ปล่อยให้เดินเล่น" in its panel.
//  - secrets: tap fast 5× / 9×, double-click, and ↑↑↓↓←→←→BA on the keyboard.
// Kept out of the way: small, hugs the bottom edge, stays right of the sidebar on wide
// screens, and only the pet itself takes clicks.

const BASE_W = 66 // px at level 1 (desktop); grows with level
const SPRITE_RATIO = 230 / 200
const SPEED = 34 // px / s

const WAKE_MS = 45 * 1000 // a click after hours keeps it awake this long
const IDLE_MS = 2 * 60 * 1000 // no mouse / keyboard for this long → it dozes off
const DRAG_PX = 6 // a press that moves further than this is a drag, not a click
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
const pinKey = (owner) => `sts-pet-pin:${owner || ''}`
function readPin(owner) {
  try {
    const p = JSON.parse(localStorage.getItem(pinKey(owner)) || 'null')
    return p && Number.isFinite(p.fx) && Number.isFinite(p.y) ? p : null
  } catch {
    return null
  }
}
function writePin(owner, pin) {
  try {
    if (pin) localStorage.setItem(pinKey(owner), JSON.stringify(pin))
    else localStorage.removeItem(pinKey(owner))
  } catch {
    /* storage blocked — the pin just lasts this visit */
  }
}
// unique ids for short-lived effects (two effects can start in the same millisecond)
let fxSeq = 0
const nextFxId = () => (fxSeq += 1)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// stock health from the data already loaded for the pages (same rule as สินค้าคงเหลือ):
// low = at or under the threshold, negative = below zero (the urgent part)
function useLowStock() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  const loading = useStore((s) => s.loading)
  const low = useMemo(() => (loading ? [] : lowStockRows(buildStockRows(products, stockIns, stockOuts))), [loading, products, stockIns, stockOuts])
  const negative = useMemo(() => low.filter((r) => r.qty < 0).length, [low])
  return { low, negative, loading }
}

// nobody has moved the mouse / typed for IDLE_MS → true; any activity → false at once
function useIdle(enabled) {
  const [idle, setIdle] = useState(false)
  const idleRef = useRef(false)
  useEffect(() => {
    if (!enabled) return undefined
    let last = Date.now()
    const onAct = () => {
      last = Date.now()
      if (idleRef.current) {
        idleRef.current = false
        setIdle(false)
      }
    }
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true }))
    const t = setInterval(() => {
      if (!idleRef.current && document.visibilityState === 'visible' && Date.now() - last > IDLE_MS) {
        idleRef.current = true
        setIdle(true)
      }
    }, 5000)
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct))
      clearInterval(t)
    }
  }, [enabled])
  return idle
}

// after-hours: checked every minute; a click keeps it awake for a while
function useSleepy() {
  const [late, setLate] = useState(() => isSleepyHour())
  const [awakeUntil, setAwakeUntil] = useState(0)
  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setLate(isSleepyHour()), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!awakeUntil) return undefined
    const t = setTimeout(() => force((n) => n + 1), Math.max(0, awakeUntil - Date.now()) + 50)
    return () => clearTimeout(t)
  }, [awakeUntil])
  const sleeping = late && Date.now() > awakeUntil
  return { sleeping, late, wake: () => setAwakeUntil(Date.now() + WAKE_MS) }
}

export default function PetCompanion() {
  const { pathname } = useLocation()
  const ready = usePetStore((s) => s.ready)
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const events = usePetStore((s) => s.events)
  const festival = useActiveFestival()
  const skin = useThemeStore((s) => s.skin)

  const [open, setOpen] = useState(false)
  const [walking, setWalking] = useState(false)
  const [happy, setHappy] = useState(false)
  const [hearts, setHearts] = useState([])
  const [levelFx, setLevelFx] = useState(false)
  const [cheer, setCheer] = useState(false)
  const [mood, setMood] = useState(null) // { kind, id } celebrate | alert | paper | stamp | spin | gold | dance
  const [sparks, setSparks] = useState([]) // little burst around the pet
  const [combo, setCombo] = useState(null) // { n, id }
  const [dragging, setDragging] = useState(false)
  const [pinned, setPinned] = useState(null) // { fx, y } — where it was dropped (this device)
  const comboRef = useRef({ n: 0, last: 0 })
  const tapsRef = useRef([])
  const dragRef = useRef(null)
  const skipClick = useRef(false)
  const { sleeping: nightNap, late, wake } = useSleepy()
  const { low, negative, loading } = useLowStock()

  const visible = ready && !pet.hidden && pathname !== '/login'
  const idle = useIdle(visible)
  const sleeping = (nightNap || idle) && !dragging

  const outerRef = useRef(null)
  const flipRef = useRef(null)
  const st = useRef({ x: -1, y: 0, dir: -1, mode: 'idle', until: 0, hover: false, mx: null, my: null, lastMove: 0, sleeping: false, pinned: null, dragging: false })
  st.current.sleeping = sleeping
  st.current.pinned = pinned
  st.current.dragging = dragging

  // where the user left it on this device
  useEffect(() => {
    if (ready && owner) setPinned(readPin(owner))
  }, [ready, owner])
  const level = levelInfo(pet.xp).level
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const width = Math.round((narrow ? 54 : BASE_W) * sizeForLevel(level))
  const height = Math.round(width * SPRITE_RATIO)
  const coat = pickCoat(pet.species, owner)
  const hasLow = low.length > 0
  // the engineer-in-training carries its checklist while there is a stock quest
  const baseOutfit = resolveOutfit(festival, pet.wardrobe || pet.equipped, skin)
  const outfit = hasLow && !baseOutfit.prop ? { ...baseOutfit, prop: 'clipboard' } : baseOutfit
  const petName = pet.name || coat.name
  const aura = auraTier(level)
  const health = negative > 0 ? 'urgent' : hasLow ? 'watch' : 'ok'

  // level-up → a little jump + sparkle ring
  const lastLevelEvent = events.filter((e) => e.type === 'levelup').slice(-1)[0]?.id
  useEffect(() => {
    if (!lastLevelEvent) return
    setLevelFx(true)
    const t = setTimeout(() => setLevelFx(false), 1300)
    return () => clearTimeout(t)
  }, [lastLevelEvent])

  // a save anywhere in the app → a happy hop (the bubble says what was saved)
  const lastCheer = events.filter((e) => e.type === 'xp' || e.type === 'cheer').slice(-1)[0]?.id
  useEffect(() => {
    if (!lastCheer) return undefined
    setCheer(true)
    setHappy(true)
    const id = nextFxId()
    setHearts((h) => [...h.slice(-4), id])
    const t1 = setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1100)
    const t2 = setTimeout(() => {
      setCheer(false)
      setHappy(false)
    }, 1300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      setCheer(false)
      setHappy(false)
    }
  }, [lastCheer])

  // low stock: a gentle heads-up once a day (the list is in the panel)
  useEffect(() => {
    if (!visible || loading || !hasLow) return undefined
    const t = setTimeout(() => usePetStore.getState().warnLowStock(low.length, negative), 2500)
    return () => clearTimeout(t)
    // re-run only when data first arrives / low stock appears, not on every change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, loading, hasLow])

  // the quest: fewer items left → a cheer; none left → the big celebration
  const questRef = useRef(null)
  useEffect(() => {
    if (loading || !ready) return
    const prev = questRef.current
    questRef.current = low.length
    if (prev == null || !visible || low.length >= prev) return
    const say = (t, text, ms) => usePetStore.getState()._emit(t, text, ms)
    if (low.length === 0) {
      say('trick', '🏆 ภารกิจสำเร็จ! สต็อกกลับมาปกติครบทุกรายการแล้ว', 4200)
      // the quest's reward: the checklist clipboard for the wardrobe (once)
      setTimeout(() => usePetStore.getState().grant('clipboard', 'ภารกิจสำเร็จ'), 2200)
      // after the save's own hop, then the victory dance
      setTimeout(() => showMood('dance', 2600), 600)
      burst(['🏆', '✨', '📦', '🎉'], 12)
      emitFx('grand', { reason: 'quest-clear' })
    } else {
      say('xp', `เยี่ยมเลย! ภารกิจเหลืออีก ${formatNumber(low.length)} รายการ 💪`, 3200)
      showMood('celebrate')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [low.length, loading, ready])

  // a new day may start while the app stays open; also push the account copy on hide
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') usePetStore.getState().flush()
      else usePetStore.getState().checkIn()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [])

  // walking + gaze loop (transform / CSS vars are written directly — no re-render per frame)
  useEffect(() => {
    if (!visible) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const s = st.current
    const onMove = (e) => {
      s.mx = e.clientX
      s.my = e.clientY
      s.lastMove = performance.now()
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    let raf = 0
    let prev = performance.now()
    let shownWalking = null
    const tick = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const vw = window.innerWidth
      const vh = window.innerHeight
      const free = s.pinned || s.dragging // dropped somewhere / being carried: anywhere on screen
      const minX = free ? 4 : vw >= 768 ? 272 : 10
      const maxX = Math.max(minX, vw - width - (free ? 4 : 14))
      if (s.pinned && !s.dragging) {
        s.x = s.pinned.fx * vw
        s.y = s.pinned.y
      } else if (!s.dragging) s.y = 0
      if (s.x < 0) s.x = maxX
      s.x = clamp(s.x, minX, maxX)
      s.y = clamp(s.y, 0, Math.max(0, vh - height - 12))

      const paused = s.hover || open || reduce || s.sleeping || free
      if (!paused && s.mode === 'walk') {
        s.x += s.dir * SPEED * dt
        if (s.x <= minX || s.x >= maxX) {
          s.x = clamp(s.x, minX, maxX)
          s.mode = 'idle'
          s.until = now + 1400 + Math.random() * 2200
          s.turn = true
        } else if (Math.random() < dt * 0.09) {
          s.mode = 'idle'
          s.until = now + 1200 + Math.random() * 2400
          s.turn = Math.random() < 0.35
        }
      } else if (!paused && s.mode === 'idle' && now > s.until) {
        if (s.turn) s.dir = -s.dir
        s.turn = false
        s.mode = 'walk'
      }

      const isWalking = !paused && s.mode === 'walk'
      if (isWalking !== shownWalking) {
        shownWalking = isWalking
        setWalking(isWalking)
      }

      const el = outerRef.current
      if (el) el.style.transform = `translate3d(${s.x}px, ${-s.y}px, 0)`

      // eyes: follow the mouse while it moves; otherwise look where it's going / ahead
      const flip = flipRef.current
      if (flip) {
        const facing = s.dir > 0 ? -1 : 1 // sprite is drawn tail-right; flip when heading right
        flip.style.transform = `scaleX(${facing})`
        let gx = isWalking ? s.dir * 0.7 : 0
        let gy = 0.15
        if (!s.sleeping && s.mx != null && now - s.lastMove < 4500) {
          const cx = s.x + width / 2
          const cy = window.innerHeight - 4 - s.y - height * 0.62
          gx = clamp((s.mx - cx) / 220, -1, 1)
          gy = clamp((s.my - cy) / 170, -1, 1)
        }
        flip.style.setProperty('--gx', (gx * facing).toFixed(3))
        flip.style.setProperty('--gy', gy.toFixed(3))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [visible, open, width, height])

  // ---- moods: the pet reacts to what really happens in the app (see lib/fxBus) ----
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const lateRef = useRef(late)
  lateRef.current = late

  function burst(emojis, count = 8) {
    if (motionReduced() || !atLeast('balanced')) return
    const id = nextFxId()
    const n = atLeast('showstopper') ? count + 4 : count
    const parts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
      const d = 34 + Math.random() * 30
      return { e: emojis[i % emojis.length], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 26 }
    })
    setSparks((s) => [...s.slice(-2), { id, parts }])
    setTimeout(() => setSparks((s) => s.filter((x) => x.id !== id)), 1200)
  }

  function showMood(kind, ms = 1800) {
    const id = nextFxId()
    setMood({ kind, id })
    setTimeout(() => setMood((m) => (m && m.id === id ? null : m)), ms)
  }

  useEffect(
    () =>
      onFx(({ type, detail }) => {
        if (!visibleRef.current) return
        if (type === 'egg' && String(detail?.kind || '').startsWith('pet-')) return // its own trick
        // after hours, what the user does wakes it up — the automatic stock heads-up doesn't
        if (lateRef.current && type !== 'low-stock') wake()
        const say = (t, text, ms) => usePetStore.getState()._emit(t, text, ms)
        if (type === 'stock-in' || type === 'product-add') {
          showMood('celebrate')
          burst(['✨', '📦', '⭐', '🎉'])
        } else if (type === 'stock-import') {
          showMood('celebrate', 2200)
          burst(['📥', '📦', '✨', '🎉'], 10)
          say('xp', `นำเข้าเรียบร้อย ${formatNumber(detail?.rows || 0)} รายการ 📥 ตรวจครบแล้ว!`, 3400)
        } else if (type === 'stock-out') {
          showMood('alert', 1600)
          burst(['🔍', '✔️', '✨'], 6)
        } else if (type === 'low-stock') {
          showMood('alert', 2400)
        } else if (type === 'report-open') {
          showMood('paper', 2000)
          say('doc', 'เตรียมเอกสารให้แล้ว 📑', 2600)
        } else if (type === 'report-export') {
          showMood('stamp', 2200)
          say('doc', 'ปั๊ม! เอกสารพร้อมแล้ว ✅', 2800)
        } else if (type === 'egg') {
          showMood('spin', 1400)
          burst(['🌟', '✨', '💫', '🎊'], 12)
        }
        // combo: work done back-to-back (within 90 s of the last one)
        if (type === 'stock-in' || type === 'stock-out' || type === 'product-add') {
          const c = comboRef.current
          const now = Date.now()
          c.n = now - c.last < 90000 ? c.n + 1 : 1
          c.last = now
          if (c.n >= 2) {
            const cid = nextFxId()
            setCombo({ n: c.n, id: cid })
            setTimeout(() => setCombo((x) => (x && x.id === cid ? null : x)), 2600)
            emitFx('combo', { n: c.n })
            if (c.n === 5) {
              usePetStore.getState().unlock('dance')
              setTimeout(() => showMood('dance', 2600), 900)
              burst(['💃', '🎶', '✨', '⚡'], 12)
            }
          }
        }
      }),
    [],
  )

  // ↑ ↑ ↓ ↓ ← → ← → B A — the explorer's secret code (not while typing in a field)
  useEffect(() => {
    if (!visible) return undefined
    let pos = 0
    const onKey = (e) => {
      const t = e.target
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const k = String(e.key || '').toLowerCase()
      pos = k === KONAMI[pos] ? pos + 1 : k === KONAMI[0] ? 1 : 0
      if (pos < KONAMI.length) return
      pos = 0
      if (lateRef.current) wake()
      usePetStore.getState().unlock('konami')
      showMood('flip', 1000)
      setTimeout(() => showMood('gold', 6000), 1000)
      burst(['🎮', '⭐', '🧭', '✨'], 14)
      emitFx('grand', { reason: 'konami' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  // ---- drag & drop: press, move a few px, carry it anywhere, let go → it stays there ----
  // The move / release are followed on the window, so a quick flick that leaves the pet
  // in one step still carries it.
  function onDown(e) {
    if (e.button !== 0 || dragRef.current) return
    const d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: st.current.x, oy: st.current.y, moved: false }
    const move = (ev) => {
      if (ev.pointerId !== d.id) return
      const dx = ev.clientX - d.sx
      const dy = ev.clientY - d.sy
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_PX) return
        d.moved = true
        if (lateRef.current) wake()
        setOpen(false)
        setDragging(true)
        st.current.dragging = true
      }
      st.current.x = d.ox + dx
      st.current.y = d.oy - dy
    }
    const up = (ev) => {
      if (ev.pointerId !== d.id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      dragRef.current = null
      if (!d.moved) return
      // the click that follows this release is not a pat
      skipClick.current = true
      setTimeout(() => (skipClick.current = false), 60)
      const vw = window.innerWidth
      const pin = { fx: clamp(st.current.x, 4, vw - width - 4) / vw, y: Math.max(0, Math.round(st.current.y)) }
      st.current.pinned = pin
      st.current.dragging = false
      setDragging(false)
      setPinned(pin)
      writePin(owner, pin)
      showMood('land', 700)
    }
    dragRef.current = d
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  function unpin() {
    setPinned(null)
    st.current.pinned = null
    writePin(owner, null)
    usePetStore.getState()._emit('cheer', 'ไปเดินเล่นต่อแล้วนะ 🐾', 2400)
  }

  function onDouble() {
    setOpen(false)
    usePetStore.getState().unlock('flip')
    showMood('flip', 950)
    burst(['💫', '✨', '⭐'], 8)
  }

  function pat() {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    if (late) wake()
    setHappy(true)
    const id = Date.now()
    const hid = nextFxId()
    setHearts((h) => [...h.slice(-4), hid])
    setTimeout(() => setHearts((h) => h.filter((x) => x !== hid)), 1100)
    setTimeout(() => setHappy(false), 1400)
    // secret: tapping fast (each tap within 1 s of the last) doesn't flap the panel — it
    // does tricks instead: 5 in a row = spin, 9 in a row = golden form
    const last = tapsRef.current[tapsRef.current.length - 1]
    const taps = last && id - last < 1000 ? [...tapsRef.current, id] : [id]
    tapsRef.current = taps
    if (taps.length >= 3) setOpen(false)
    else setOpen((o) => !o)
    if (taps.length === 5) {
      usePetStore.getState().unlock('spin')
      showMood('spin', 1300)
      burst(['🌀', '✨', '💫'], 10)
      emitFx('egg', { kind: 'pet-spin' })
    } else if (taps.length === 9) {
      tapsRef.current = []
      usePetStore.getState().unlock('gold')
      showMood('gold', 8000)
      burst(['👑', '✨', '🌟', '💛'], 14)
      emitFx('egg', { kind: 'pet-gold' })
    }
  }

  // bubbles grow toward the middle of the screen so they never run off the edge
  const anchorRight = st.current.x > window.innerWidth / 2
  const quest = hasLow && pathname !== '/stock-in' && !dragging
  const questTo = low[0]?.id ? `/stock-in?product=${encodeURIComponent(low[0].id)}` : '/stock-in'

  return (
    <>
      <div
        ref={outerRef}
        className={`pet-companion ${dragging ? 'dragging' : ''} ${pinned ? 'pinned' : ''}`}
        data-aura={aura || undefined}
        data-health={health}
        style={{ width, height }}
      >
        {aura > 0 && <span className="pet-aura-ring" aria-hidden="true" />}
        {quest && (
          <Link
            to={questTo}
            className={`pet-quest ${health}`}
            onPointerEnter={() => (st.current.hover = true)}
            onPointerLeave={() => (st.current.hover = false)}
            title={negative > 0 ? `สต็อกติดลบ ${negative} รายการ — ไปรับสินค้าเข้า` : `สินค้าใกล้หมด ${low.length} รายการ — ไปรับสินค้าเข้า`}
            aria-label={`ภารกิจด่วน: ${negative > 0 ? `สต็อกติดลบ ${negative} รายการ` : `สินค้าใกล้หมด ${low.length} รายการ`} — ไปหน้ารับสินค้า`}
          >
            <span className="pet-quest-mark">{negative > 0 ? '!!' : '!'}</span>
            <span className="pet-quest-n">{formatNumber(low.length)}</span>
          </Link>
        )}
        <div className="pet-bubbles" style={anchorRight ? { right: 0, alignItems: 'flex-end' } : { left: 0, alignItems: 'flex-start' }}>
          {events.map((e) => (
            <div key={e.id} className={`pet-bubble ${e.type}`}>
              {e.text}
            </div>
          ))}
        </div>
        {hearts.map((h, i) => (
          <span key={h} className="pet-heart" style={{ left: `${30 + ((i * 17) % 40)}%` }}>
            💗
          </span>
        ))}
        {levelFx && <span className="pet-ring" />}
        {sparks.map((s) => (
          <span key={`sparks-${s.id}`} className="pet-sparks" aria-hidden="true">
            {s.parts.map((p, i) => (
              <span key={i} style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${i * 18}ms` }}>
                {p.e}
              </span>
            ))}
          </span>
        ))}
        {combo && (
          <span key={`combo-${combo.id}`} className={`pet-combo ${combo.n >= 5 ? 'hot' : ''}`} aria-hidden="true">
            คอมโบ ×{combo.n} ⚡
          </span>
        )}
        {mood?.kind === 'alert' && (
          <span key={`alert-${mood.id}`} className="pet-alert-mark" aria-hidden="true">
            !
          </span>
        )}
        {(mood?.kind === 'paper' || mood?.kind === 'stamp') && (
          <span key={`doc-${mood.id}`} className={`pet-doc ${mood.kind}`} aria-hidden="true">
            <svg viewBox="0 0 40 46" width="100%" height="100%">
              <path d="M4 3 H28 L36 11 V43 H4 Z" fill="#fffdf6" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M28 3 V11 H36" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M9 17 H30 M9 22 H30 M9 27 H24" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
              <g className="pet-doc-seal">
                <circle cx="27" cy="35" r="6.5" fill="none" stroke="#dc2626" strokeWidth="1.8" />
                <path d="M24 35 l2.2 2.2 L30.5 32.6" stroke="#dc2626" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </g>
            </svg>
            {mood.kind === 'stamp' && <span className="pet-stamp" />}
          </span>
        )}
        <button
          type="button"
          className={`pet-body ${levelFx ? 'levelup' : ''} ${cheer ? 'cheer' : ''} ${mood ? `mood-${mood.kind}` : ''} ${dragging ? 'held' : ''}`}
          aria-label={`สัตว์เลี้ยงของฉัน ${petName} (${SPECIES[pet.species]?.label || ''}${coat.name}) เลเวล ${level}${sleeping ? ' กำลังงีบ' : ''}${hasLow ? ` · สินค้าใกล้หมด ${low.length} รายการ` : ''} — กดเพื่อดูและแต่งตัว ลากเพื่อย้ายที่`}
          aria-expanded={open}
          onClick={pat}
          onDoubleClick={onDouble}
          onPointerDown={onDown}
          onPointerEnter={() => (st.current.hover = true)}
          onPointerLeave={() => (st.current.hover = false)}
        >
          <div ref={flipRef} className="pet-flip">
            <div className={`pet-waddle ${walking ? 'walking' : ''} ${sleeping && !happy ? 'sleeping' : ''}`}>
              <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="walk" walking={walking} happy={happy || dragging} sleepy={sleeping} />
            </div>
          </div>
          {health === 'urgent' && !sleeping && (
            <span className="pet-sweat" aria-hidden="true">
              💧
            </span>
          )}
          {sleeping && !happy && (
            <span className="pet-zzz" aria-hidden="true">
              <span>z</span>
              <span>z</span>
              <span>z</span>
            </span>
          )}
        </button>
      </div>
      {open && (
        <PetPanel
          x={st.current.x}
          y={st.current.y}
          petH={height}
          coat={coat}
          outfit={outfit}
          low={low}
          negative={negative}
          questTo={questTo}
          festival={festival}
          late={late}
          pinned={!!pinned}
          onUnpin={unpin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function PetPanel({ x, y = 0, petH, coat, outfit, low, negative = 0, questTo = '/stock-in', festival = 'none', late, pinned, onUnpin, onClose }) {
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const { setSpecies, setHidden } = usePetStore.getState()
  const info = levelInfo(pet.xp)
  const rar = RARITY[coat.rarity]
  const todayKey = dayKey()
  const workUsed = pet.workDay === todayKey ? pet.workXp || 0 : 0
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.pet-body')) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [onClose])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const W = Math.min(330, vw - 16)
  const left = clamp(x - W / 2 + 30, 8, vw - W - 8)
  // above the pet; if it was dropped high up, open below it instead
  const above = y + petH + 18 + 260 < vh
  const place = above ? { bottom: y + petH + 18 } : { top: clamp(vh - y + 10, 8, vh - 200) }

  return (
    <div
      ref={ref}
      className="pet-panel anim-pop"
      role="dialog"
      aria-label="สัตว์เลี้ยงของฉัน"
      style={{ left, width: W, ...place, maxHeight: above ? `calc(100vh - ${y + petH + 36}px)` : undefined }}
    >
      <button type="button" onClick={onClose} aria-label="ปิด" className="pet-panel-x">
        <X size={15} />
      </button>

      <div className="flex items-center gap-3">
        <div className="pet-panel-preview" style={{ '--gx': 0, '--gy': 0.2 }}>
          <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="walk" happy />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <PetName coat={coat} />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: rar.color, background: `${rar.color}22`, border: `1px solid ${rar.color}55` }}>
              ★ {rar.label}
            </span>
            {pet.name && <span className="truncate text-[11px] text-[var(--text-muted)]">{coat.name}</span>}
          </div>
          <div className="mt-1 truncate text-xs text-[var(--text-muted)]">น้องของ {owner} · สีขนสุ่มจากชื่อผู้ใช้</div>
        </div>
      </div>

      {late && (
        <p className="mt-3 rounded-lg bg-[var(--bg-card-alt)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          😴 นอกเวลางาน ({SLEEP_FROM_HOUR}:00–{String(SLEEP_UNTIL_HOUR).padStart(2, '0')}:00) น้องขอแอบงีบ — กดที่น้องเพื่อปลุก
        </p>
      )}

      {/* level + XP */}
      <div className="mt-4">
        <div className="flex items-end justify-between">
          <span className="pet-lv text-lg font-extrabold">Lv.{info.level}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {info.into}/{info.need} XP · อีก {info.need - info.into} → Lv.{info.level + 1}
          </span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
          <div className="pet-xpbar h-full rounded-full" style={{ width: `${Math.round(info.pct * 100)}%` }} />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Briefcase size={12} className="flex-shrink-0" />
          XP จากงานวันนี้ {workUsed}/{WORK_XP_DAILY_CAP}
          {workUsed >= WORK_XP_DAILY_CAP ? ' · ครบแล้ว พรุ่งนี้มาต่อนะ' : ''}
        </div>
      </div>

      {/* เติมไฟ streak */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-alt)] px-3 py-2">
        <Flame size={18} className="pet-flame flex-shrink-0 text-orange-500" />
        <div className="min-w-0 text-xs text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--text-primary)]">สตรีค {pet.streak || 0} วัน</span>
          {pet.lastDay === todayKey ? ' · วันนี้เติมไฟแล้ว ✓' : ' · เข้าใช้วันนี้เพื่อเติมไฟ'}
        </div>
      </div>

      {/* the urgent quest: low / below-zero stock — same rule as the สินค้าคงเหลือ page */}
      {low.length > 0 && (
        <div className={`pet-quest-card mt-3 rounded-xl border px-3 py-2.5 ${negative > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <AlertTriangle size={14} className={`flex-shrink-0 ${negative > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            ภารกิจด่วน · สินค้าเหลือน้อย {formatNumber(low.length)} รายการ
          </div>
          {negative > 0 && (
            <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              ติดลบ {formatNumber(negative)} รายการ — อาจยังไม่ได้บันทึกรับเข้า ตรวจสอบด่วน
            </p>
          )}
          <ul className="mt-1.5 flex flex-col gap-1">
            {low.slice(0, 3).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-[var(--text-primary)]">{r.code}</span> {r.name}
                </span>
                <span className={`flex-shrink-0 font-bold ${r.qty <= 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                  {r.qty <= 0 ? 'หมด' : `${formatNumber(r.qty)} ${r.unit || ''}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              to={questTo}
              onClick={onClose}
              className="btn-shimmer inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500"
            >
              <Truck size={14} /> ไปเติมสต็อกเลย
            </Link>
            <Link to="/stock" onClick={onClose} className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--text-accent)] hover:underline">
              ดูทั้งหมด <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* secret tricks */}
      <div className="mt-3">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">ท่าลับ</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.entries(TRICKS).map(([id, t]) => {
            const on = (pet.unlocked || []).includes(id)
            return (
              <span
                key={id}
                title={on ? t.name : `ยังไม่ปลดล็อก — ${t.how}`}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  on ? 'border-amber-400/60 bg-amber-400/10 text-[var(--text-primary)]' : 'border-dashed border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {on ? `${t.emoji} ${t.name}` : `🔒 ${t.how}`}
              </span>
            )
          })}
        </div>
      </div>

      {/* cat / dog */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(SPECIES).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSpecies(k)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              pet.species === k
                ? 'border-[var(--text-accent)] bg-[var(--bg-card-alt)] text-[var(--text-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-alt)]'
            }`}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      {/* dress-up: 4-slot wardrobe */}
      <div className="mt-3">
        <Wardrobe festival={festival} />
      </div>
      <Link to="/ranking" onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-accent)] hover:underline">
        🏆 อันดับทีม & แต่งโปรไฟล์ <ChevronRight size={13} />
      </Link>
      <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
        ชุดตามธีมและเทศกาลใส่ให้อัตโนมัติ — ของที่เลือกเองจะแทนในช่องนั้น · 🪙 ได้จาก Supply Drop · ลากน้องไปวางที่ไหนก็ได้ · ได้ XP จากเติมไฟรายวัน และจากการบันทึกรับ/จ่าย/เพิ่มสินค้า (วันละไม่เกิน {WORK_XP_DAILY_CAP} XP)
      </p>

      {pinned && (
        <button
          type="button"
          onClick={() => {
            onUnpin()
            onClose()
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-card-alt)]"
        >
          <Footprints size={13} /> ปล่อยให้เดินเล่นตามเดิม
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setHidden(true)
          onClose()
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-alt)]"
      >
        <EyeOff size={13} /> ซ่อนสัตว์เลี้ยง (เปิดกลับได้ที่ ตั้งค่า)
      </button>
    </div>
  )
}

// the pet's name — tap the pencil to rename (empty = back to the coat name)
function PetName({ coat }) {
  const pet = usePetStore((s) => s.pet)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const save = () => {
    usePetStore.getState().setName(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={NAME_MAX * 2}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setEditing(false)
            }
          }}
          placeholder={coat.name}
          aria-label={`ตั้งชื่อสัตว์เลี้ยง (ไม่เกิน ${NAME_MAX} ตัวอักษร)`}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-alt)] px-2 py-1 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--text-accent)]"
        />
        <button type="submit" aria-label="บันทึกชื่อ" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500">
          <Check size={15} />
        </button>
      </form>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-base font-bold text-[var(--text-primary)]">
        {SPECIES[pet.species].emoji} {pet.name || coat.name}
      </span>
      <button
        type="button"
        onClick={() => {
          setDraft(pet.name || '')
          setEditing(true)
        }}
        aria-label={pet.name ? 'เปลี่ยนชื่อสัตว์เลี้ยง' : 'ตั้งชื่อสัตว์เลี้ยง'}
        title={pet.name ? 'เปลี่ยนชื่อ' : 'ตั้งชื่อให้น้อง'}
        className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-primary)]"
      >
        <Pencil size={12} /> {pet.name ? '' : 'ตั้งชื่อ'}
      </button>
    </div>
  )
}
