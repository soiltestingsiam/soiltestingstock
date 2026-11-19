import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Lock, Flame, EyeOff, Sparkles } from 'lucide-react'
import PetSprite from '../pet/PetSprite'
import { usePetStore } from '../store/usePetStore'
import { useActiveFestival } from '../store/useFestivalStore'
import { ACCESSORIES, RARITY, SPECIES, SLOTS, levelInfo, pickCoat, resolveOutfit, sizeForLevel } from '../pet/petData'

// The user's own pet, living along the bottom of every page.
//  - walks back and forth on its own (pauses now and then, turns around at the edges)
//  - its eyes follow the mouse; it blinks; hover = it stops and looks at you
//  - click = happy face + hearts, and opens its panel (level / เติมไฟ streak / cat-or-dog /
//    dress-up). It can be hidden from the panel, and brought back in ตั้งค่า.
// Kept out of the way: small, hugs the bottom edge, stays right of the sidebar on wide
// screens, and only the pet itself takes clicks.

const BASE_W = 66 // px at level 1 (desktop); grows with level
const SPRITE_RATIO = 230 / 200
const SPEED = 34 // px / s

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function PetCompanion() {
  const { pathname } = useLocation()
  const ready = usePetStore((s) => s.ready)
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const events = usePetStore((s) => s.events)
  const festival = useActiveFestival()

  const [open, setOpen] = useState(false)
  const [walking, setWalking] = useState(false)
  const [happy, setHappy] = useState(false)
  const [hearts, setHearts] = useState([])
  const [levelFx, setLevelFx] = useState(false)

  const outerRef = useRef(null)
  const flipRef = useRef(null)
  const st = useRef({ x: -1, dir: -1, mode: 'idle', until: 0, hover: false, mx: null, my: null, lastMove: 0 })

  const visible = ready && !pet.hidden && pathname !== '/login'
  const level = levelInfo(pet.xp).level
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  const width = Math.round((narrow ? 54 : BASE_W) * sizeForLevel(level))
  const height = Math.round(width * SPRITE_RATIO)
  const coat = pickCoat(pet.species, owner)
  const outfit = resolveOutfit(festival, pet.equipped)

  // level-up → a little jump + sparkle ring
  const lastLevelEvent = events.filter((e) => e.type === 'levelup').slice(-1)[0]?.id
  useEffect(() => {
    if (!lastLevelEvent) return
    setLevelFx(true)
    const t = setTimeout(() => setLevelFx(false), 1300)
    return () => clearTimeout(t)
  }, [lastLevelEvent])

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
      const minX = vw >= 768 ? 272 : 10
      const maxX = Math.max(minX, vw - width - 14)
      if (s.x < 0) s.x = maxX
      s.x = clamp(s.x, minX, maxX)

      const paused = s.hover || open || reduce
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
      if (el) el.style.transform = `translateX(${s.x}px)`

      // eyes: follow the mouse while it moves; otherwise look where it's going / ahead
      const flip = flipRef.current
      if (flip) {
        const facing = s.dir > 0 ? -1 : 1 // sprite is drawn tail-right; flip when heading right
        flip.style.transform = `scaleX(${facing})`
        let gx = isWalking ? s.dir * 0.7 : 0
        let gy = 0.15
        if (s.mx != null && now - s.lastMove < 4500) {
          const cx = s.x + width / 2
          const cy = window.innerHeight - 4 - height * 0.62
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

  if (!visible) return null

  function pat() {
    setHappy(true)
    const id = Date.now()
    setHearts((h) => [...h.slice(-4), id])
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1100)
    setTimeout(() => setHappy(false), 1400)
    setOpen((o) => !o)
  }

  // bubbles grow toward the middle of the screen so they never run off the edge
  const anchorRight = st.current.x > window.innerWidth / 2

  return (
    <>
      <div ref={outerRef} className="pet-companion" style={{ width, height }}>
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
        <button
          type="button"
          className={`pet-body ${levelFx ? 'levelup' : ''}`}
          aria-label={`สัตว์เลี้ยงของฉัน ${SPECIES[pet.species]?.label || ''}${coat.name} เลเวล ${level} — กดเพื่อดูและแต่งตัว`}
          aria-expanded={open}
          onClick={pat}
          onPointerEnter={() => (st.current.hover = true)}
          onPointerLeave={() => (st.current.hover = false)}
        >
          <div ref={flipRef} className="pet-flip">
            <div className={`pet-waddle ${walking ? 'walking' : ''}`}>
              <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="walk" walking={walking} happy={happy} />
            </div>
          </div>
        </button>
      </div>
      {open && <PetPanel x={st.current.x} petH={height} coat={coat} outfit={outfit} onClose={() => setOpen(false)} />}
    </>
  )
}

function PetPanel({ x, petH, coat, outfit, onClose }) {
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const { setSpecies, equip, setHidden } = usePetStore.getState()
  const info = levelInfo(pet.xp)
  const rar = RARITY[coat.rarity]
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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
  const W = Math.min(330, vw - 16)
  const left = clamp(x - W / 2 + 30, 8, vw - W - 8)

  return (
    <div
      ref={ref}
      className="pet-panel anim-pop"
      role="dialog"
      aria-label="สัตว์เลี้ยงของฉัน"
      style={{ left, bottom: petH + 18, width: W }}
    >
      <button type="button" onClick={onClose} aria-label="ปิด" className="pet-panel-x">
        <X size={15} />
      </button>

      <div className="flex items-center gap-3">
        <div className="pet-panel-preview" style={{ '--gx': 0, '--gy': 0.2 }}>
          <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="walk" happy />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-[var(--text-primary)]">
            {SPECIES[pet.species].emoji} {coat.name}
          </div>
          <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: rar.color, background: `${rar.color}22`, border: `1px solid ${rar.color}55` }}>
            ★ {rar.label}
          </span>
          <div className="mt-1 truncate text-xs text-[var(--text-muted)]">น้องของ {owner} · สีขนสุ่มจากชื่อผู้ใช้</div>
        </div>
      </div>

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
      </div>

      {/* เติมไฟ streak */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-alt)] px-3 py-2">
        <Flame size={18} className="pet-flame flex-shrink-0 text-orange-500" />
        <div className="min-w-0 text-xs text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--text-primary)]">สตรีค {pet.streak || 0} วัน</span>
          {pet.lastDay === todayKey ? ' · วันนี้เติมไฟแล้ว ✓' : ' · เข้าใช้วันนี้เพื่อเติมไฟ'}
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

      {/* dress-up */}
      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
        <Sparkles size={13} /> แต่งตัว (ปลดล็อกตามเลเวล)
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {ACCESSORIES.map((a) => {
          const locked = info.level < a.level
          const on = pet.equipped?.[a.slot] === a.id
          return (
            <button
              key={a.id}
              type="button"
              disabled={locked}
              onClick={() => equip(a.slot, on ? null : a.id)}
              title={locked ? `ปลดล็อกที่ Lv.${a.level}` : `${a.name} (${SLOTS[a.slot]})`}
              className={`relative flex flex-col items-center rounded-lg border px-1 py-1.5 text-center transition ${
                on
                  ? 'border-[var(--text-accent)] bg-[var(--bg-card-alt)]'
                  : 'border-[var(--border-color)] hover:bg-[var(--bg-card-alt)]'
              } ${locked ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              <span className="text-lg leading-none">{a.emoji}</span>
              <span className="mt-1 w-full truncate text-[10.5px] leading-tight text-[var(--text-secondary)]">{locked ? `Lv.${a.level}` : a.name}</span>
              {locked && <Lock size={10} className="absolute right-1 top-1 text-[var(--text-muted)]" />}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
        ชุดเทศกาลใส่ให้อัตโนมัติ — ของที่สวมเองจะแทนชุดเทศกาลในช่องเดียวกัน · ได้ XP จากเติมไฟรายวัน, บันทึกรับ/จ่ายสินค้า, เพิ่มสินค้า
      </p>

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
