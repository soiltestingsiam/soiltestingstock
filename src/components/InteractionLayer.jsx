import { useEffect, useRef } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { useSpectacle } from '../store/useSpectacleStore'
import { useActiveFestival } from '../store/useFestivalStore'
import { resolveCursor, clickEffect } from '../theme/skins'
import { CursorGlyph, HOTSPOT } from '../theme/cursorShapes'
import { onFx } from '../lib/fxBus'
import { play } from '../lib/sfx'

// The interaction engine — one requestAnimationFrame loop, never a React re-render per
// pointer move:
//  - CUSTOM CURSOR: the user's choice (or "auto" = by skin & festival), moved with
//    translate3d; states for links/buttons (pointer), text fields (text) and pressing.
//  - TRAIL + CLICK PARTICLES on one <canvas> (sakura petals, laser light, candle sparks,
//    snow, gold dust…, chosen by skin × festival); capped, and the loop sleeps when idle.
//  - 3D TILT for [data-tilt] cards and MAGNETIC pull for [data-magnetic] buttons.
//  - GRAND CELEBRATION confetti + fireworks on fxBus 'grand' (big import, big receipt,
//    closing a year).
// Everything is pointer-events: none. Off on touch screens (no hover), at the Eco level
// and with reduced motion (the OS setting or the in-app switch) — the system cursor stays.

const MAX_PARTICLES = 280
const INTERACTIVE =
  'a, button, [role="button"], [role="radio"], [role="tab"], [role="option"], select, summary, label, [data-cursor="pointer"], .fes-ground'
const TEXTUAL =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="file"]), textarea, [contenteditable="true"]'
const FIELD = 'input, textarea, select, [contenteditable="true"]'

const fineHover = () => {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    return false
  }
}
const R = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ---- particle painters (canvas 2D) ----
function star(ctx, r) {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.38 : r
    const a = (i / 8) * Math.PI * 2
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}
function heart(ctx, r) {
  ctx.beginPath()
  ctx.moveTo(0, r * 0.9)
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.2, 0, -r * 0.45)
  ctx.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9)
  ctx.fill()
}
function flower(ctx, r) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, r * 0.32, a, 0, Math.PI * 2)
    ctx.fill()
  }
}
function paw(ctx, r) {
  ctx.beginPath()
  ctx.ellipse(0, r * 0.35, r * 0.62, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ;[
    [-0.62, -0.28],
    [-0.22, -0.66],
    [0.22, -0.66],
    [0.62, -0.28],
  ].forEach(([x, y]) => {
    ctx.beginPath()
    ctx.ellipse(x * r, y * r, r * 0.22, r * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}
function drop(ctx, r) {
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.quadraticCurveTo(r * 0.9, r * 0.2, 0, r)
  ctx.quadraticCurveTo(-r * 0.9, r * 0.2, 0, -r)
  ctx.fill()
}

function draw(ctx, p, a) {
  ctx.save()
  ctx.globalAlpha = a
  ctx.translate(p.x, p.y)
  if (p.rot) ctx.rotate(p.rot)
  ctx.fillStyle = p.color
  ctx.strokeStyle = p.color
  switch (p.shape) {
    case 'star':
      star(ctx, p.size)
      break
    case 'petal':
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'heart':
      heart(ctx, p.size)
      break
    case 'flower':
      flower(ctx, p.size)
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 0.25, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'paw':
      paw(ctx, p.size)
      break
    case 'drop':
      drop(ctx, p.size)
      break
    case 'rect':
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size)
      break
    case 'ring':
      ctx.lineWidth = p.width || 2
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'diamond':
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(0, -p.size)
      ctx.lineTo(p.size * 0.75, 0)
      ctx.lineTo(0, p.size * 1.2)
      ctx.lineTo(-p.size * 0.75, 0)
      ctx.closePath()
      ctx.stroke()
      ctx.globalAlpha = a * 0.25
      ctx.fill()
      break
    case 'lantern': {
      // a glowing lantern body (sky lantern / tōrō / gold)
      ctx.globalAlpha = a * 0.25
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = a
      if (p.square) {
        ctx.fillRect(-p.size * 0.8, -p.size, p.size * 1.6, p.size * 2)
        ctx.strokeStyle = '#5a3a22'
        ctx.lineWidth = 1.4
        ctx.strokeRect(-p.size * 0.8, -p.size, p.size * 1.6, p.size * 2)
      } else {
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 0.8, p.size, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    default: {
      // glowing dot
      ctx.globalAlpha = a * 0.3
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = a
      ctx.beginPath()
      ctx.arc(0, 0, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

// one trail particle at (x, y) moving with velocity (vx, vy)
function trailParticle(kind, x, y, vx, _vy) {
  const base = { x, y, life: 0, rot: R(0, Math.PI * 2), vr: R(-0.08, 0.08), g: 0 }
  switch (kind) {
    case 'petal':
      return { ...base, shape: 'petal', size: R(3.5, 6), color: pick(['#ffc1d9', '#ffd6e6', '#f9a8c9']), vx: vx * 0.1 + R(-0.6, 0.6), vy: R(0.2, 0.9), g: 0.02, max: R(70, 110) }
    case 'sparkle':
      return { ...base, shape: 'star', size: R(2.5, 5), color: pick(['#fff7c2', '#ffd76a', '#ffffff', '#c7d2fe']), vx: R(-0.5, 0.5), vy: R(-0.8, 0.2), max: R(30, 55) }
    case 'dust':
      return { ...base, shape: 'dot', size: R(1, 2), color: pick(['#e3c25b', '#f5e6b8']), vx: R(-0.25, 0.25), vy: R(-0.5, -0.1), max: R(40, 70) }
    case 'candle':
      return { ...base, shape: 'dot', size: R(1.6, 2.8), color: pick(['#ffd27a', '#ffb84d', '#fff2c4']), vx: R(-0.3, 0.3), vy: R(-1, -0.4), max: R(40, 70) }
    case 'spooky':
      return { ...base, shape: 'dot', size: R(1.6, 2.6), color: pick(['#ff9248', '#c084fc', '#a855f7']), vx: R(-0.6, 0.6), vy: R(-0.6, 0.6), max: R(30, 50) }
    case 'snow':
      return { ...base, shape: 'dot', size: R(1.4, 2.8), color: '#ffffff', vx: R(-0.4, 0.4), vy: R(0.3, 1), max: R(60, 90) }
    case 'heart':
      return { ...base, shape: 'heart', size: R(3, 5), rot: R(-0.3, 0.3), vr: 0, color: pick(['#ff5a8a', '#ff9fc3', '#f43f5e']), vx: R(-0.4, 0.4), vy: R(-1, -0.4), max: R(40, 60) }
    case 'droplet':
      return { ...base, shape: 'drop', size: R(2.4, 3.6), rot: 0, vr: 0, color: pick(['#7dd3fc', '#38bdf8', '#bae6fd']), vx: R(-0.5, 0.5), vy: R(0, 0.6), g: 0.12, max: R(30, 45) }
    case 'firework':
      return { ...base, shape: 'star', size: R(2, 3.6), color: pick(['#ffd27f', '#ff7eb6', '#7fd0ff', '#b7ff8a']), vx: R(-1.4, 1.4), vy: R(-1.4, 1.4), max: R(24, 40) }
    case 'gold':
      return { ...base, shape: pick(['star', 'dot']), size: R(1.8, 3.6), color: pick(['#ffd54a', '#fbbf24', '#fde68a']), vx: R(-0.5, 0.5), vy: R(-0.8, 0), max: R(30, 55) }
    case 'confetti':
      return { ...base, shape: 'rect', size: R(2, 3.4), color: pick(['#fbbf24', '#3b82f6', '#f472b6', '#22c55e', '#ffffff']), vx: R(-0.8, 0.8), vy: R(-0.6, 0.4), g: 0.06, vr: R(-0.2, 0.2), max: R(40, 70) }
    case 'jasmine':
      return { ...base, shape: 'flower', size: R(2.6, 4), color: '#ffffff', vx: R(-0.4, 0.4), vy: R(0.2, 0.7), g: 0.01, max: R(60, 90) }
    case 'paw':
      return { ...base, shape: 'paw', size: 5, color: 'rgba(255,154,182,.9)', vx: 0, vy: 0, vr: 0, max: 70 }
    default:
      return null
  }
}

// a click (or a celebration) burst of `kind` at (x, y)
function burstParticles(kind, x, y, n) {
  const out = []
  const ring = (color, size = 6, grow = 1.6, width = 2) => out.push({ x, y, life: 0, max: 34, shape: 'ring', size, grow, width, color, vx: 0, vy: 0 })
  const radial = (shapeKind, count, speed = 3) => {
    for (let i = 0; i < count; i++) {
      const p = trailParticle(shapeKind, x, y, 0, 0)
      if (!p) continue
      const a = (i / count) * Math.PI * 2 + R(-0.2, 0.2)
      const s = R(speed * 0.5, speed)
      p.vx = Math.cos(a) * s
      p.vy = Math.sin(a) * s - 0.6
      out.push(p)
    }
  }
  switch (kind) {
    case 'lantern':
    case 'toro':
    case 'goldlantern':
      out.push({
        x, y, life: 0, max: 200, shape: 'lantern', square: kind === 'toro', size: kind === 'goldlantern' ? 5 : 7,
        color: kind === 'goldlantern' ? '#f0d27a' : kind === 'toro' ? '#ffe2a8' : '#ffb84d', vx: R(-0.3, 0.3), vy: -0.9, rot: 0, vr: 0,
      })
      ring(kind === 'toro' ? 'rgba(255,214,150,.8)' : 'rgba(255,184,77,.7)', 6, 1.2)
      radial('candle', Math.round(n * 0.5), 1.6)
      break
    case 'holo':
      out.push({ x, y, life: 0, max: 160, shape: 'diamond', size: 8, color: '#22d3ee', vx: 0, vy: -1, rot: 0, vr: 0 })
      ring('#d946ef', 5, 2, 1.6)
      radial('sparkle', Math.round(n * 0.5), 2.4)
      break
    case 'neon':
      ring('#22d3ee', 4, 2.2, 2)
      ring('#d946ef', 2, 1.4, 1.4)
      radial('firework', n, 3)
      break
    case 'petals':
      radial('petal', n, 2.4)
      break
    case 'splash':
      ring('rgba(125,211,252,.9)', 4, 1.8)
      radial('droplet', n, 3.4)
      break
    case 'snow':
      radial('snow', n, 2.4)
      break
    case 'hearts':
      radial('heart', Math.round(n * 0.8), 2.6)
      break
    case 'firework':
      radial('firework', n * 1.4, 4)
      break
    case 'confetti':
      radial('confetti', n * 1.2, 3.6)
      break
    case 'spooky':
      radial('spooky', n, 3)
      break
    case 'jasmine':
      radial('jasmine', Math.round(n * 0.8), 2.2)
      break
    case 'gold':
      radial('gold', n, 2.8)
      break
    case 'dust':
      ring('rgba(212,175,55,.85)', 5, 1.3, 1.2)
      radial('dust', n, 1.6)
      break
    default:
      ring('rgba(255,255,255,.7)', 4, 1.4, 1.4)
      radial('sparkle', n, 2.8)
  }
  return out
}

export default function InteractionLayer() {
  const { level, reduced, atLeast } = useSpectacle()
  const cursorChoice = useThemeStore((s) => s.cursor)
  const skin = useThemeStore((s) => s.skin)
  const festival = useActiveFestival()
  const fx = !reduced && atLeast('balanced') // Eco (lite) or reduced motion: nothing here
  const fine = fineHover()
  const { shape, trail } = resolveCursor(cursorChoice, skin, festival)
  const showCursor = fx && fine && !!shape

  const canvasRef = useRef(null)
  const cursorRef = useRef(null)
  const ringRef = useRef(null)
  const cfg = useRef({})
  cfg.current = {
    trail: fx && fine ? trail : null,
    click: fx ? clickEffect(skin, festival) : null,
    density: level === 'showstopper' ? 1.4 : level === 'grand' ? 1 : 0.55,
    shape: showCursor ? shape : null,
  }

  // hide the system cursor while ours is on
  useEffect(() => {
    const root = document.documentElement
    if (showCursor) root.setAttribute('data-custom-cursor', shape)
    else root.removeAttribute('data-custom-cursor')
    return () => root.removeAttribute('data-custom-cursor')
  }, [showCursor, shape])

  useEffect(() => {
    if (!fx) return undefined
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const root = document.documentElement
    let W = 0
    let H = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const parts = []
    const laser = [] // recent pointer points for the laser trail
    let px = -200
    let py = -200
    let ringX = -200
    let ringY = -200
    let lastX = null
    let lastY = null
    let travelled = 0
    let pawSide = 1
    let target = null // the element under the pointer, handled on the next frame
    let state = 'default'
    let tiltEl = null
    let magEl = null
    let raf = 0
    let touchMode = false

    const add = (list) => {
      for (const p of list) if (p) parts.push(p)
      if (parts.length > MAX_PARTICLES) parts.splice(0, parts.length - MAX_PARTICLES)
      kick()
    }

    const resetTilt = () => {
      if (!tiltEl) return
      tiltEl.classList.remove('tilting')
      tiltEl.style.removeProperty('--tilt-x')
      tiltEl.style.removeProperty('--tilt-y')
      tiltEl = null
    }
    const resetMag = () => {
      if (!magEl) return
      magEl.style.removeProperty('--mag-x')
      magEl.style.removeProperty('--mag-y')
      magEl = null
    }

    function handleTarget() {
      const el = target
      target = null
      if (!el || !el.closest) return
      // cursor state
      const next = el.closest(TEXTUAL) ? 'text' : el.closest(INTERACTIVE) ? 'pointer' : 'default'
      if (next !== state) {
        state = next
        cursorRef.current?.setAttribute('data-state', state)
      }
      if (!fine) return
      // 3D tilt
      const t = el.closest('[data-tilt]')
      if (t !== tiltEl) resetTilt()
      if (t) {
        tiltEl = t
        const r = t.getBoundingClientRect()
        const nx = Math.max(-0.5, Math.min(0.5, (px - r.left) / r.width - 0.5))
        const ny = Math.max(-0.5, Math.min(0.5, (py - r.top) / r.height - 0.5))
        t.classList.add('tilting')
        t.style.setProperty('--tilt-x', `${(nx * 12).toFixed(2)}deg`)
        t.style.setProperty('--tilt-y', `${(-ny * 10).toFixed(2)}deg`)
        t.style.setProperty('--mx', `${((nx + 0.5) * 100).toFixed(1)}%`)
        t.style.setProperty('--my', `${((ny + 0.5) * 100).toFixed(1)}%`)
      }
      // magnetic buttons
      const m = el.closest('[data-magnetic]')
      if (m !== magEl) resetMag()
      if (m) {
        magEl = m
        const r = m.getBoundingClientRect()
        const dx = px - (r.left + r.width / 2)
        const dy = py - (r.top + r.height / 2)
        m.style.setProperty('--mag-x', `${Math.max(-6, Math.min(6, dx * 0.18)).toFixed(1)}px`)
        m.style.setProperty('--mag-y', `${Math.max(-4, Math.min(4, dy * 0.25)).toFixed(1)}px`)
      }
    }

    function spawnTrail(x, y) {
      const kind = cfg.current.trail
      if (!kind) return
      if (lastX == null) {
        lastX = x
        lastY = y
        return
      }
      const dx = x - lastX
      const dy = y - lastY
      const d = Math.hypot(dx, dy)
      lastX = x
      lastY = y
      if (kind === 'laser') {
        laser.push({ x, y, life: 0 })
        if (laser.length > 18) laser.shift()
        if (Math.random() < 0.12 * cfg.current.density) add([trailParticle('firework', x, y, 0, 0)])
        kick()
        return
      }
      travelled += d
      const step = kind === 'paw' ? 46 : 16 / cfg.current.density
      while (travelled >= step) {
        travelled -= step
        if (kind === 'paw') {
          const a = Math.atan2(dy, dx) + Math.PI / 2
          const ox = Math.cos(a - Math.PI / 2) * 7 * pawSide
          const oy = Math.sin(a - Math.PI / 2) * 7 * pawSide
          pawSide = -pawSide
          add([{ ...trailParticle('paw', x + ox, y + oy, 0, 0), rot: a }])
        } else {
          add([trailParticle(kind, x + R(-3, 3), y + R(-3, 3), dx, dy)])
        }
      }
    }

    function tick() {
      raf = 0
      const c = cursorRef.current
      if (c && cfg.current.shape) {
        const [hx, hy] = HOTSPOT[cfg.current.shape] || [0, 0]
        c.style.transform = `translate3d(${px - hx}px, ${py - hy}px, 0)`
      }
      let moving = false
      const ring = ringRef.current
      if (ring && cfg.current.shape === 'ring') {
        ringX += (px - ringX) * 0.2
        ringY += (py - ringY) * 0.2
        ring.style.transform = `translate3d(${ringX - 18}px, ${ringY - 18}px, 0)`
        moving = Math.abs(px - ringX) + Math.abs(py - ringY) > 0.5
      }
      if (target) handleTarget()

      ctx.clearRect(0, 0, W, H)
      // laser light: a tapering neon line through the last points
      if (laser.length > 1) {
        for (const pt of laser) pt.life += 1
        while (laser.length && laser[0].life > 14) laser.shift()
        ctx.save()
        ctx.lineCap = 'round'
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 1; i < laser.length; i++) {
          const a = laser[i - 1]
          const b = laser[i]
          const k = i / laser.length
          ctx.strokeStyle = `rgba(${Math.round(34 + (217 - 34) * (1 - k))}, ${Math.round(211 - 141 * (1 - k))}, ${Math.round(238 + (239 - 238) * k)}, ${(0.15 + 0.75 * k).toFixed(2)})`
          ctx.lineWidth = 1 + 3 * k
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        ctx.restore()
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.life += 1
        if (p.life >= p.max) {
          parts.splice(i, 1)
          continue
        }
        p.vy += p.g || 0
        p.x += p.vx
        p.y += p.vy
        p.rot = (p.rot || 0) + (p.vr || 0)
        if (p.shape === 'ring') p.size += p.grow || 1
        if (p.shape === 'petal' || p.shape === 'flower') p.x += Math.sin((p.life + p.size * 10) / 9) * 0.4
        const t = p.life / p.max
        draw(ctx, p, t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85)
      }
      if (parts.length || laser.length > 1 || moving) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      if (touchMode) {
        touchMode = false
        root.removeAttribute('data-cursor-touch')
      }
      px = e.clientX
      py = e.clientY
      target = e.target
      if (cursorRef.current) cursorRef.current.style.opacity = '1'
      spawnTrail(px, py)
      kick()
    }
    const onDown = (e) => {
      if (e.pointerType === 'touch') {
        touchMode = true
        root.setAttribute('data-cursor-touch', '')
      }
      cursorRef.current?.setAttribute('data-pressed', '')
      if (e.button !== 0 || !cfg.current.click) return
      if (e.target?.closest?.(FIELD)) return
      const n = Math.round(12 * cfg.current.density)
      add(burstParticles(cfg.current.click, e.clientX, e.clientY, n))
    }
    const onUp = () => cursorRef.current?.removeAttribute('data-pressed')
    const onLeave = (e) => {
      if (e.relatedTarget) return
      if (cursorRef.current) cursorRef.current.style.opacity = '0'
      resetTilt()
      resetMag()
    }

    // 🎉 grand celebration: confetti from the top and fireworks
    const offFx = onFx(({ type, detail }) => {
      // a Supply Drop opened: a little burst where it was
      if (type === 'supply') {
        const x = Number(detail?.x) || W - 60
        const y = Number(detail?.y) || H - 140
        add(burstParticles(cfg.current.click || 'sparks', x, y, 24))
        add(burstParticles('firework', x, y - 10, 14))
        return
      }
      if (type !== 'grand') return
      play('grand')
      const list = []
      const n = Math.round(110 * cfg.current.density)
      for (let i = 0; i < n; i++) {
        const p = trailParticle('confetti', R(0, W), R(-60, -10), 0, 0)
        p.vy = R(1.5, 4)
        p.vx = R(-1, 1)
        p.max = R(120, 200)
        p.g = 0.03
        p.size = R(3, 5)
        list.push(p)
      }
      add(list)
      for (let k = 0; k < 4; k++) {
        setTimeout(() => add(burstParticles('firework', R(W * 0.15, W * 0.85), R(H * 0.15, H * 0.5), 26)), 180 + k * 320)
      }
    })

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    return () => {
      offFx()
      cancelAnimationFrame(raf)
      resetTilt()
      resetMag()
      root.removeAttribute('data-cursor-touch')
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerout', onLeave)
    }
  }, [fx, fine])

  if (!fx) return null
  return (
    <>
      <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />
      {showCursor && (
        <>
          <div ref={cursorRef} className="fx-cursor" data-shape={shape} data-state="default" aria-hidden="true">
            <span className="fx-cursor-glyph">{shape === 'ring' ? <span className="fx-ring-dot" /> : <CursorGlyph shape={shape} />}</span>
            <span className="fx-cursor-ibeam" />
          </div>
          {shape === 'ring' && (
            <div ref={ringRef} className="fx-ring" aria-hidden="true">
              <CursorGlyph shape="ring" size={36} />
            </div>
          )}
        </>
      )}
    </>
  )
}
