import { useSpectacleStore } from '../store/useSpectacleStore'
import { onFx } from './fxBus'

// Micro-sounds made on the fly with the Web Audio API — no audio files to download.
// OFF unless the user turns "เสียงเอฟเฟกต์" on (Settings, or the speaker button). Short,
// soft and quiet by design: a chime for a save, a gentle double-tick for a warning, a
// shimmer when a festival curtain opens. The AudioContext is created on first use, which
// always follows a click / key press, so browsers allow it.

let ctx = null
let master = null

function audio() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12) // MIDI note -> Hz

function tone(c, { at = 0, freq, to, type = 'sine', dur = 0.16, gain = 0.09, attack = 0.006 }) {
  const t0 = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(c, { at = 0, dur = 0.5, gain = 0.05, from = 400, to = 3200 }) {
  const t0 = c.currentTime + at
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.8
  bp.frequency.setValueAtTime(from, t0)
  bp.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur + 0.05)
}

const arp = (c, notes, { step = 0.07, type = 'triangle', dur = 0.22, gain = 0.07, at = 0 } = {}) =>
  notes.forEach((n, i) => tone(c, { at: at + i * step, freq: NOTE(n), type, dur, gain }))

// the sound book
const RECIPES = {
  click: (c) => tone(c, { freq: 1800, to: 1200, type: 'sine', dur: 0.05, gain: 0.04 }),
  save: (c) => arp(c, [84, 91], { step: 0.09 }),
  stockIn: (c) => arp(c, [79, 83, 86, 91], { step: 0.06, gain: 0.06 }),
  stockOut: (c) => {
    tone(c, { freq: NOTE(74), type: 'triangle', dur: 0.12, gain: 0.06 })
    tone(c, { at: 0.11, freq: NOTE(69), type: 'triangle', dur: 0.16, gain: 0.06 })
  },
  warn: (c) => {
    tone(c, { freq: NOTE(69), type: 'square', dur: 0.09, gain: 0.025 })
    tone(c, { at: 0.16, freq: NOTE(69), type: 'square', dur: 0.09, gain: 0.025 })
  },
  stamp: (c) => {
    tone(c, { freq: 140, to: 60, type: 'sine', dur: 0.14, gain: 0.14 })
    noise(c, { dur: 0.08, gain: 0.03, from: 2400, to: 900 })
  },
  curtain: (c) => {
    noise(c, { dur: 0.9, gain: 0.035, from: 300, to: 4200 })
    arp(c, [72, 76, 79, 84, 88], { at: 0.35, step: 0.08, gain: 0.05, dur: 0.35 })
  },
  egg: (c) => arp(c, [76, 79, 83, 88, 91, 95, 100], { step: 0.055, gain: 0.05, dur: 0.3 }),
  levelup: (c) => arp(c, [72, 76, 79, 84], { step: 0.11, type: 'square', gain: 0.03, dur: 0.24 }),
  grand: (c) => {
    arp(c, [72, 76, 79, 84, 88, 91], { step: 0.09, type: 'triangle', gain: 0.06, dur: 0.4 })
    noise(c, { at: 0.5, dur: 0.6, gain: 0.03, from: 800, to: 5200 })
    arp(c, [84, 88, 91, 96], { at: 0.62, step: 0.06, gain: 0.045, dur: 0.3 })
  },
  combo: (c, n = 2) => arp(c, [79 + Math.min(n, 10), 84 + Math.min(n, 10)], { step: 0.05, gain: 0.05 }),
}

export function play(name, arg) {
  const { sound, volume, pureWork } = useSpectacleStore.getState()
  if (!sound || pureWork || !RECIPES[name]) return false
  const c = audio()
  if (!c) return false
  master.gain.setValueAtTime(Math.max(0.0001, volume), c.currentTime)
  try {
    RECIPES[name](c, arg)
  } catch {
    return false
  }
  return true
}

// "ทดลองเสียง" in Settings: plays even right after switching on
export function preview() {
  return play('save')
}

// app moments -> sounds (wired once from App)
let wired = false
export function wireSounds() {
  if (wired) return
  wired = true
  onFx(({ type, detail }) => {
    if (type === 'stock-in' || type === 'stock-import') play('stockIn')
    else if (type === 'stock-out') play('stockOut')
    else if (type === 'product-add') play('save')
    else if (type === 'report-export') play('stamp')
    else if (type === 'low-stock') play('warn')
    else if (type === 'festival-curtain') play('curtain')
    else if (type === 'egg') play('egg')
    else if (type === 'combo') play('combo', detail.n)
    else if (type === 'levelup' || type === 'supply') play('levelup')
  })
}
