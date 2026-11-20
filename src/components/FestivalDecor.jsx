import { useEffect, useRef, useState } from 'react'
import { emitFx } from '../lib/fxBus'
import { play } from '../lib/sfx'
import { useSpectacle } from '../store/useSpectacleStore'
import { rand, LoyDefs, SkyLantern, SkyLanterns, LoyMoon, Fireflies, Twinkles, Bat, Snow, Heart, ChineseLantern, Balloon, Blossom } from '../festival/parts'
import { GROUNDS, BURSTS } from '../festival/grounds'

// The active festival, drawn in three layers that all sit BEHIND the page content:
//  - sky     : at the top of the page and scrolls away with it (moon, stars, webs,
//              hanging lanterns, string lights, bunting)
//  - ambient : faint particles fixed behind the cards (snow, petals, rising lanterns...)
//  - ground  : a themed, animated scene at the very bottom of every page — found by
//              scrolling down; click it for a little effect. Room is reserved for it
//              below the content, so it never covers anything.
// On the login page everything is a lighter version behind the sign-in card.

/* --------------------------------- sky + ambient per festival --------------------------------- */

const WEB = (
  <svg viewBox="0 0 100 100" fill="none" stroke="rgba(200,180,255,.7)" strokeWidth="1">
    <path d="M0 0 L100 100 M0 0 L70 0 M0 0 L0 70 M0 0 L50 18 M0 0 L18 50" />
    <path d="M18 0 Q22 22 0 18 M40 0 Q46 46 0 40 M64 0 Q70 70 0 64 M88 0 Q92 92 0 88" />
  </svg>
)

function Confetti({ count, colors }) {
  return Array.from({ length: count }, (_, i) => {
    const w = 5 + rand(i + 4) * 5
    return (
      <span
        key={i}
        className="fes-confetti"
        style={{ left: `${rand(i + 2) * 100}%`, width: w, height: w * 0.6, background: colors[i % colors.length], animationDuration: `${5 + rand(i + 9) * 7}s`, animationDelay: `${-rand(i + 5) * 12}s` }}
      />
    )
  })
}

// flowers drifting down (jasmine / canna)
function FallingFlowers({ count, fill, center, edge }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className="fes-flower-fall"
      style={{ left: `${rand(i + 31) * 100}%`, animationDuration: `${10 + rand(i + 33) * 9}s`, animationDelay: `${-rand(i + 35) * 18}s`, opacity: 0.55 + rand(i + 37) * 0.45 }}
    >
      <Blossom fill={fill} center={center} edge={edge} size={12 + Math.round(rand(i + 39) * 8)} />
    </span>
  ))
}

// พวงมาลัยมะลิ — jasmine garland swags across the top, with hanging tassels
function MaalaiSwags({ count }) {
  const P0 = [0, 4]
  const P1 = [120, 70]
  const P2 = [240, 4]
  const pt = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k])
  return (
    <div className="fes-maalai" aria-hidden="true">
      {Array.from({ length: count }, (_, s) => (
        <svg key={s} viewBox="0 0 240 120" preserveAspectRatio="xMidYMin meet">
          <path d="M0 4 Q120 70 240 4" stroke="rgba(120,170,220,.7)" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 17 }, (_, i) => {
            const [x, y] = pt(i / 16)
            return <circle key={i} cx={x} cy={y} r={i % 4 === 2 ? 4.4 : 3.6} fill={i % 4 === 2 ? '#bfe0ff' : '#ffffff'} stroke="#d6e4f2" strokeWidth=".7" />
          })}
          {/* tassel (พู่) at the joint */}
          <g className="fes-tassel" style={{ animationDelay: `${-s * 0.7}s` }}>
            {[14, 24, 34, 44].map((y) => (
              <circle key={y} cx="240" cy={y} r="3.4" fill="#ffffff" stroke="#d6e4f2" strokeWidth=".7" />
            ))}
            <circle cx="240" cy="56" r="7" fill="#fbbf24" />
            <circle cx="240" cy="56" r="3" fill="#f97316" />
            <circle cx="240" cy="67" r="4.4" fill="#e11d48" />
            <path d="M236 71 L233 88 M240 72 V92 M244 71 L247 88" stroke="#8ec5ff" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      ))}
    </div>
  )
}

const THEMES = {
  mothersday: {
    Sky: ({ subtle }) => (
      <>
        <MaalaiSwags count={subtle ? 3 : 5} />
        <Twinkles count={subtle ? 8 : 16} colors={['#ffffff', '#bfe0ff']} />
      </>
    ),
    Ambient: ({ subtle }) => <FallingFlowers count={subtle ? 8 : 16} fill="#ffffff" center="#fde68a" edge="rgba(120,160,200,.45)" />,
  },
  fathersday: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-bunting" aria-hidden="true">
          {Array.from({ length: subtle ? 12 : 22 }, (_, i) => (
            <span key={i} style={{ '--c': ['#facc15', '#fde047', '#f59e0b', '#fff3b0'][i % 4], animationDelay: `${(i % 6) * 0.25}s` }} />
          ))}
        </div>
        <div className="fes-sun" style={subtle ? { top: '7%', left: '7%' } : { top: 84, right: '7%' }} aria-hidden="true" />
        <Twinkles count={subtle ? 8 : 14} colors={['#fde68a', '#ffffff']} />
      </>
    ),
    Ambient: ({ subtle }) => <FallingFlowers count={subtle ? 8 : 15} fill="#fde047" center="#ea580c" edge="rgba(202,138,4,.5)" />,
  },
  anniversary: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-bunting" aria-hidden="true">
          {Array.from({ length: subtle ? 12 : 22 }, (_, i) => (
            <span key={i} style={{ '--c': ['#3b82f6', '#fbbf24', '#ffffff', '#f472b6'][i % 4], animationDelay: `${(i % 6) * 0.25}s` }} />
          ))}
        </div>
        {(subtle ? [8, 92] : [6, 13, 87, 94]).map((left, i) => (
          <div key={left} className="fes-float" style={{ top: 30 + rand(i + 61) * 40, left: `${left}%`, animationDuration: `${3.6 + rand(i + 63) * 2}s`, animationDelay: `${-rand(i + 65) * 4}s` }}>
            <Balloon color={['#3b82f6', '#fbbf24', '#f472b6', '#22c55e'][i % 4]} w={22 + Math.round(rand(i + 67) * 10)} />
          </div>
        ))}
        <Twinkles count={subtle ? 8 : 16} colors={['#ffd27f', '#ffffff', '#93c5fd']} />
      </>
    ),
    Ambient: ({ subtle }) => (
      <>
        <Confetti count={subtle ? 12 : 26} colors={['#fbbf24', '#3b82f6', '#f472b6', '#ffffff']} />
        {Array.from({ length: subtle ? 2 : 4 }, (_, i) => (
          <div key={i} className="fes-balloon-rise" style={{ left: `${8 + rand(i + 71) * 84}%`, animationDuration: `${18 + rand(i + 73) * 12}s`, animationDelay: `${-rand(i + 75) * 26}s` }}>
            <Balloon color={['#3b82f6', '#fbbf24', '#f472b6', '#22c55e'][(i + 1) % 4]} w={24} />
          </div>
        ))}
      </>
    ),
  },
  loykrathong: {
    Sky: ({ subtle }) => (
      <>
        <Twinkles count={subtle ? 8 : 18} colors={['#ffffff', '#ffe29a']} />
        <LoyMoon style={subtle ? { top: '4%', left: '6%', width: 150, height: 150 } : { top: 84, right: '6%', width: 170, height: 170 }} />
      </>
    ),
    Ambient: ({ subtle }) => (
      <>
        <SkyLanterns count={subtle ? 4 : 8} />
        <Fireflies count={subtle ? 3 : 6} />
      </>
    ),
  },
  halloween: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-moon" style={{ top: subtle ? '8%' : 96, left: '8%', background: 'radial-gradient(circle at 38% 34%, #fff, #ffd9a0 60%, #e9a94d)' }} />
        <div className="fes-web tl">{WEB}</div>
        <div className="fes-web tr">{WEB}</div>
        <Twinkles count={subtle ? 6 : 14} colors={['#ff8a3d', '#c4a5ff']} />
      </>
    ),
    Ambient: ({ subtle }) =>
      Array.from({ length: subtle ? 2 : 4 }, (_, i) => (
        <Bat
          key={i}
          style={{ top: `${8 + rand(i + 2) * 60}%`, animationDuration: `${14 + rand(i + 4) * 10}s`, animationDelay: `${-rand(i + 6) * 14}s`, transform: `scale(${0.6 + rand(i + 8) * 0.8})` }}
        />
      )),
  },
  christmas: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-garland" aria-hidden="true">
          {Array.from({ length: subtle ? 12 : 22 }, (_, i) => (
            <span key={i} style={{ '--c': ['#ff4d5e', '#ffd93b', '#51cf66', '#4dabf7'][i % 4], animationDelay: `${(i % 6) * 0.3}s` }} />
          ))}
        </div>
        <Twinkles count={subtle ? 6 : 12} colors={['#ffffff', '#cfe8ff']} />
      </>
    ),
    Ambient: ({ subtle }) => <Snow count={subtle ? 18 : 40} />,
  },
  newyear: {
    Sky: ({ subtle }) => (
      <>
        {Array.from({ length: subtle ? 3 : 6 }, (_, i) => (
          <span
            key={i}
            className="fes-firework"
            style={{ top: `${8 + rand(i + 2) * 40}%`, left: `${8 + rand(i + 4) * 84}%`, color: ['#ffd27f', '#ff7eb6', '#7fd0ff', '#b7ff8a'][i % 4], animationDuration: `${2.4 + rand(i + 6) * 1.6}s`, animationDelay: `${-rand(i + 8) * 3}s` }}
          />
        ))}
        <Twinkles count={subtle ? 10 : 22} colors={['#ffd27f', '#ffffff', '#ff9ecb']} />
      </>
    ),
    Ambient: ({ subtle }) => <Confetti count={subtle ? 12 : 26} colors={['#ffd27f', '#ff7eb6', '#7fd0ff']} />,
  },
  chinesenewyear: {
    Sky: ({ subtle }) => (
      <>
        {Array.from({ length: subtle ? 3 : 6 }, (_, i) => (
          <ChineseLantern
            key={i}
            style={{ left: `${4 + rand(i + 1) * 90}%`, top: -6 + rand(i + 3) * 30, animationDuration: `${3.5 + rand(i + 5) * 2.5}s`, animationDelay: `${-rand(i + 7) * 3}s`, transform: `scale(${0.72 + rand(i + 9) * 0.6})` }}
          />
        ))}
        <Twinkles count={subtle ? 8 : 16} colors={['#ffd24d', '#ff8a5a']} />
      </>
    ),
    Ambient: ({ subtle }) => <Confetti count={subtle ? 14 : 30} colors={['#ffd24d', '#ffbf3a', '#ff7a4a']} />,
  },
  valentine: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-heartmoon" style={subtle ? { top: '6%', left: '7%' } : { top: 90, right: '7%' }} aria-hidden="true">
          <svg viewBox="0 0 26 24" width="100%">
            <path d="M13 23S1 15.5 1 7.5A6.5 6.5 0 0 1 13 4.4A6.5 6.5 0 0 1 25 7.5C25 15.5 13 23 13 23Z" fill="#ff7aa5" />
            <path d="M7.5 3.4C9 3.4 10.4 4.3 11 5.8" stroke="#ffe0ec" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <Twinkles count={subtle ? 8 : 16} colors={['#ff9fc3', '#ffffff']} />
      </>
    ),
    Ambient: ({ subtle }) => (
      <>
        {Array.from({ length: subtle ? 3 : 6 }, (_, i) => (
          <Heart key={i} style={{ left: `${6 + rand(i + 1) * 88}%`, animationDuration: `${16 + rand(i + 3) * 12}s`, animationDelay: `${-rand(i + 7) * 24}s`, transform: `scale(${0.7 + rand(i + 5) * 0.9})` }} />
        ))}
        {Array.from({ length: subtle ? 12 : 24 }, (_, i) => (
          <span key={`p${i}`} className="fes-petal" style={{ left: `${rand(i + 2) * 100}%`, animationDuration: `${7 + rand(i + 9) * 8}s`, animationDelay: `${-rand(i + 5) * 12}s`, opacity: 0.5 + rand(i + 11) * 0.5 }} />
        ))}
      </>
    ),
  },
  songkran: {
    Sky: ({ subtle }) => (
      <>
        <div className="fes-bunting" aria-hidden="true">
          {Array.from({ length: subtle ? 12 : 22 }, (_, i) => (
            <span key={i} style={{ '--c': ['#ff5a7a', '#ffd24d', '#3fc1ff', '#5ad67d', '#c084fc'][i % 5], animationDelay: `${(i % 6) * 0.25}s` }} />
          ))}
        </div>
        <div className="fes-sun" style={subtle ? { top: '7%', left: '7%' } : { top: 84, right: '7%' }} aria-hidden="true" />
        <Twinkles count={subtle ? 6 : 10} colors={['#bfefff', '#7fe3ff']} />
      </>
    ),
    Ambient: ({ subtle }) => (
      <>
        {Array.from({ length: subtle ? 14 : 26 }, (_, i) => (
          <span key={i} className="fes-drop" style={{ left: `${rand(i + 2) * 100}%`, animationDuration: `${1.4 + rand(i + 4) * 1.6}s`, animationDelay: `${-rand(i + 6) * 2}s` }} />
        ))}
        {(subtle ? [22, 78] : [14, 40, 66, 90]).map((left, i) => (
          <div key={`f${i}`} className="fes-float" style={{ top: `${20 + rand(i + 50) * 50}%`, left: `${left}%`, animationDuration: `${4 + rand(i) * 2}s`, animationDelay: `${-rand(i + 2) * 4}s` }}>
            <svg width="26" height="26" viewBox="0 0 26 26">
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="13" cy="6" rx="3.4" ry="6" fill="#ffd7e6" transform={`rotate(${a} 13 13)`} />
              ))}
              <circle cx="13" cy="13" r="3" fill="#ffd93b" />
            </svg>
          </div>
        ))}
      </>
    ),
  },
}

/* --------------------------------- click effects on the ground --------------------------------- */

function Burst({ x, y, burst }) {
  if (burst.kind === 'lantern') {
    return (
      <div className="fes-burst-lantern" style={{ left: x, top: y }}>
        <SkyLantern />
      </div>
    )
  }
  if (burst.kind === 'firework') {
    const color = ['#ffd27f', '#ff7eb6', '#7fd0ff', '#b7ff8a'][Math.floor(Math.random() * 4)]
    return <span className="fes-firework fes-once" style={{ left: x, top: y, color }} />
  }
  return (
    <div className="fes-burst" style={{ left: x, top: y }}>
      {burst.text && <span className="fes-burst-text">{burst.text}</span>}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5
        const d = 46 + Math.random() * 44
        return (
          <span key={i} className="fes-burst-p" style={{ '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 34}px` }}>
            {burst.emojis[i % burst.emojis.length]}
          </span>
        )
      })}
    </div>
  )
}

// the surprise greetings behind each festival's secrets
const SECRETS = {
  loykrathong: '🪷 ความลับของสายน้ำ: ขอให้ความเหนื่อยทั้งปีลอยไปกับกระทง!',
  halloween: '🎃 บู้! เจอผีประจำคลังแล้ว — แต่สต็อกไม่หายไปไหนแน่นอน',
  christmas: '🎁 ซานต้าแอบนับสต็อกให้แล้ว ขอให้ยอดตรงทุกบรรทัด!',
  newyear: '🎆 สวัสดีปีใหม่! ขอให้ยอดยกมาปีหน้าสวยงาม',
  chinesenewyear: '🧧 ซินเจียยู่อี่ — ขอให้ของเข้าเยอะ ของออกคล่อง!',
  valentine: '💖 คลังนี้มีแต่ความรัก (และสต็อกที่ครบถ้วน)',
  songkran: '💦 สาดความสดชื่นให้ทีมคลังสินค้าทุกคน!',
  mothersday: '🌼 ขอบคุณแม่ทุกคน — กลับบ้านไปกอดแม่ด้วยนะ',
  fathersday: '💛 ขอบคุณพ่อทุกคน — ขอให้สุขภาพแข็งแรงนะครับ',
  anniversary: '🎉 ขอบคุณทุกคนที่ร่วมสร้าง STS มาด้วยกัน!',
}
const FINALE_CLICKS = 7 // clicks on the ground within FINALE_MS
const FINALE_MS = 4000

function Ground({ festival, onSecret }) {
  const Scene = GROUNDS[festival]
  const burst = BURSTS[festival]
  const [fx, setFx] = useState([])
  const clicks = useRef([])
  if (!Scene) return null

  const pop = (x, y) => {
    const id = `${Date.now()}-${Math.random()}`
    setFx((f) => [...f.slice(-10), { id, x, y }])
    setTimeout(() => setFx((f) => f.filter((p) => p.id !== id)), 3200)
  }

  // the big finale: bursts all along the ground
  const finale = (r) => {
    for (let i = 0; i < 7; i++) setTimeout(() => pop(r.width * (0.08 + i * 0.14), r.height * (0.35 + (i % 3) * 0.15)), i * 140)
  }

  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    pop(e.clientX - r.left, e.clientY - r.top)
    // a prop that was clicked wiggles
    const prop = e.target.closest?.('.fes-at')
    if (prop) {
      prop.classList.remove('poked')
      void prop.offsetWidth
      prop.classList.add('poked')
      play('click')
    }
    // secret 1: the hidden star
    if (e.target.closest?.('.fes-secret')) {
      finale(r)
      onSecret(SECRETS[festival] || '✨ คุณค้นพบความลับของเทศกาล!', 'star')
      return
    }
    // secret 2: click the ground quickly 7 times
    const now = Date.now()
    clicks.current = [...clicks.current.filter((t) => now - t < FINALE_MS), now]
    if (clicks.current.length >= FINALE_CLICKS) {
      clicks.current = []
      finale(r)
      onSecret('🎇 โหมดฉลองเต็มพิกัด! คุณค้นพบความลับของเทศกาล', 'finale')
    }
  }
  return (
    <div className={`fes-ground ${festival}`} onClick={onClick} title="คลิกเล่นได้ ✨" aria-hidden="true">
      {/* far layer: misty hills tinted by the festival (depth) */}
      <div className="fes-ground-far" />
      <div className="fes-ground-scene">
        <Scene />
      </div>
      {/* near layer: a few motes drifting in front */}
      <div className="fes-ground-near">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ left: `${8 + i * 16 + rand(i + 901) * 6}%`, animationDelay: `${-rand(i + 903) * 6}s`, animationDuration: `${5 + rand(i + 905) * 4}s` }} />
        ))}
      </div>
      {/* a hidden star — click it */}
      <span className="fes-secret" style={{ left: `${86 + rand(festival.length) * 8}%` }}>★</span>
      {fx.map((p) => (
        <Burst key={p.id} x={p.x} y={p.y} burst={burst} />
      ))}
    </div>
  )
}

// Gentle pointer parallax for the festival layers: each layer drifts a few px the other
// way from the pointer (further = less). Capped, eased, desktop + Grand level only, never
// with reduced motion. Writes two CSS variables; the layers use `translate`.
function useParallax(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    const root = document.documentElement
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    let raf = 0
    const step = () => {
      x += (tx - x) * 0.07
      y += (ty - y) * 0.07
      root.style.setProperty('--fx-px', x.toFixed(3))
      root.style.setProperty('--fx-py', y.toFixed(3))
      raf = Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0
    }
    const onMove = (e) => {
      tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
      ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
      if (!raf) raf = requestAnimationFrame(step)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
      root.style.removeProperty('--fx-px')
      root.style.removeProperty('--fx-py')
    }
  }, [enabled])
}

function canParallax() {
  try {
    return window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 768
  } catch {
    return false
  }
}

// a short surprise message (role=status, outside the decorative layers)
function SecretToast({ toast }) {
  if (!toast) return null
  return (
    <div key={toast.id} className="fes-toast" role="status">
      {toast.text}
    </div>
  )
}

/* --------------------------------- the layers --------------------------------- */

// Loaded lazily by FestivalLayer once the page has loaded and gone idle.
export default function FestivalDecor({ festival, login }) {
  const T = THEMES[festival]
  const { atLeast, reduced } = useSpectacle()
  const [toast, setToast] = useState(null)
  useParallax(!login && !reduced && atLeast('grand') && canParallax())
  if (!T) return null
  const defs = festival === 'loykrathong' && <LoyDefs />
  const particles = atLeast('balanced') // Lite: still scenes, no particles
  const dense = atLeast('showstopper')

  const onSecret = (text) => {
    const id = Date.now()
    setToast({ id, text })
    emitFx('egg', { festival })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 4500)
  }

  // login: one light layer behind the branded content (the login page doesn't scroll)
  if (login) {
    const Scene = GROUNDS[festival]
    return (
      <div className="fes-layer fes-behind" aria-hidden="true">
        {defs}
        <T.Sky subtle />
        {particles && <T.Ambient subtle />}
        {Scene && (
          <div className="fes-ground on-login">
            <div className="fes-ground-scene">
              <Scene subtle />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {defs}
      <div className="fes-ambient" aria-hidden="true">
        <div className={`fes-vignette ${festival}`} />
        {particles && <T.Ambient />}
      </div>
      {/* Showstopper: a mirrored second particle layer for a denser show */}
      {dense && (
        <div className="fes-ambient fes-extra" aria-hidden="true">
          <T.Ambient />
        </div>
      )}
      <div className="fes-sky" aria-hidden="true">
        <T.Sky />
      </div>
      <Ground festival={festival} onSecret={onSecret} />
      <SecretToast toast={toast} />
    </>
  )
}
