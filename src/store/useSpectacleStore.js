import { create } from 'zustand'

// "ความอลังการ" — how much show the app puts on, per device (localStorage).
//  - level: lite | balanced | grand | showstopper
//      lite        festival colours + still scenes, no particles, simple welcome
//      balanced    today's decorations, light welcome animation
//      grand       + choreographed festival entrance, depth parallax, rim lights (default)
//      showstopper + denser particles, spotlight beams, longest finale
//  - reduceMotion: the user's own "ลดแอนิเมชัน" switch. The OS setting
//    (prefers-reduced-motion) is always honoured as well; either one turns motion down.
//  - sound / volume: Web Audio micro-sounds (src/lib/sfx.js) — OFF by default.
//  - pureWork: "โหมดทำงานล้วน" — one switch that turns every bit of fun off at once for
//    people who'd rather just work: no pet, no Supply Drop, no ranking / kudos, no festival
//    scenes or tint, no particles, no custom cursor, no sounds. Nothing is deleted — XP,
//    streaks and ranking points stay as they are and everything comes back when it's off.
// Applied as <html data-spectacle="…" data-motion="full|reduced" data-pure-work> so CSS
// can follow (pure work also forces the Eco level for CSS).

export const LEVELS = [
  { id: 'lite', label: 'Eco', th: 'ประหยัดพลังงาน', desc: 'สีธีม + ฉากนิ่ง ไม่มีอนุภาค/หางเมาส์ เบาเครื่องที่สุด' },
  { id: 'balanced', label: 'Balanced', th: 'สมดุล', desc: 'ตกแต่งพอดี แอนิเมชันเบา ๆ' },
  { id: 'grand', label: 'Grand Spectacle', th: 'อลังการ', desc: 'ม่านเปิดเทศกาล มิติลึก แสงขอบการ์ด' },
  { id: 'showstopper', label: 'Showstopper', th: 'จัดเต็ม', desc: 'อนุภาคหนาแน่น ลำแสงสปอตไลต์ ฉากปิดสุดอลังการ' },
]
const RANK = { lite: 0, balanced: 1, grand: 2, showstopper: 3 }
const LS = 'sts-spectacle'
const DEFAULTS = { level: 'grand', reduceMotion: false, sound: false, volume: 0.6, pureWork: false }

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(LS) || 'null')
    return { ...DEFAULTS, ...(v && typeof v === 'object' ? v : {}), level: RANK[v?.level] != null ? v.level : DEFAULTS.level, pureWork: v?.pureWork === true }
  } catch {
    return { ...DEFAULTS }
  }
}

const osReduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// The user's switch re-uses the app's own prefers-reduced-motion rules: they are copied
// out of their @media blocks into a <style> tag while the switch is on.
function applyMotionOverride(on) {
  if (typeof document === 'undefined') return
  let el = document.getElementById('sts-reduce-motion')
  if (!on) {
    if (el) {
      // Switching motion back on must not make everything already on screen replay its
      // entrance (fade / pop): keep just those rules until the next page change.
      const settle = [...(el.sheet?.cssRules ?? [])].filter((r) => /anim-|stagger/.test(r.selectorText || '')).map((r) => r.cssText)
      el.id = 'sts-reduce-motion-settle'
      el.textContent = settle.join('\n')
      const clear = () => {
        el.remove()
        window.removeEventListener('hashchange', clear)
      }
      window.addEventListener('hashchange', clear)
    }
    return
  }
  document.getElementById('sts-reduce-motion-settle')?.remove()
  const css = []
  for (const sheet of document.styleSheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const r of rules) {
      const cond = r.conditionText || r.media?.mediaText || ''
      if (r.type === 4 && /prefers-reduced-motion:\s*reduce/.test(cond)) for (const inner of r.cssRules) css.push(inner.cssText)
    }
  }
  if (!el) {
    el = document.createElement('style')
    el.id = 'sts-reduce-motion'
    document.head.appendChild(el)
  }
  el.textContent = css.join('\n')
}

function apply(state) {
  try {
    const root = document.documentElement
    root.setAttribute('data-spectacle', state.pureWork ? 'lite' : state.level)
    if (state.pureWork) root.setAttribute('data-pure-work', '')
    else root.removeAttribute('data-pure-work')
    const reduced = state.reduceMotion || osReduced()
    root.setAttribute('data-motion', reduced ? 'reduced' : 'full')
    applyMotionOverride(state.reduceMotion)
  } catch {
    /* no document (tests) */
  }
}

function save(state) {
  try {
    const { level, reduceMotion, sound, volume, pureWork } = state
    localStorage.setItem(LS, JSON.stringify({ level, reduceMotion, sound, volume, pureWork }))
  } catch {
    /* storage blocked */
  }
}

export const useSpectacleStore = create((set, get) => ({
  ...load(),
  init: () => {
    apply(get())
    // the stylesheet may still be loading on the very first call
    if (document.readyState !== 'complete') window.addEventListener('load', () => apply(get()), { once: true })
    try {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => apply(get()))
    } catch {
      /* old browsers */
    }
  },
  _set: (patch) => {
    set(patch)
    save(get())
    apply(get())
  },
  setLevel: (level) => RANK[level] != null && get()._set({ level }),
  setReduceMotion: (reduceMotion) => get()._set({ reduceMotion: !!reduceMotion }),
  setSound: (sound) => get()._set({ sound: !!sound }),
  toggleSound: () => get()._set({ sound: !get().sound }),
  setVolume: (volume) => get()._set({ volume: Math.max(0, Math.min(1, Number(volume) || 0)) }),
  setPureWork: (pureWork) => get()._set({ pureWork: !!pureWork }),
}))

// is the show at least this big?  atLeast('grand')  (never, in pure work mode)
export const atLeast = (level, state = useSpectacleStore.getState()) => !state.pureWork && RANK[state.level] >= RANK[level]
// "โหมดทำงานล้วน" — all fun off
export const isPureWork = (state = useSpectacleStore.getState()) => !!state.pureWork
export const usePureWork = () => useSpectacleStore((s) => !!s.pureWork)
// motion turned down by the OS or by the user's switch
export const motionReduced = (state = useSpectacleStore.getState()) => !!state.reduceMotion || osReduced()

export function useSpectacle() {
  const level = useSpectacleStore((s) => s.level)
  const reduceMotion = useSpectacleStore((s) => s.reduceMotion)
  const sound = useSpectacleStore((s) => s.sound)
  const pureWork = useSpectacleStore((s) => !!s.pureWork)
  const reduced = reduceMotion || osReduced()
  return { level, reduced, sound: sound && !pureWork, pureWork, atLeast: (l) => !pureWork && RANK[level] >= RANK[l] }
}

export default useSpectacleStore
