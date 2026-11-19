import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveFestival } from '../store/useFestivalStore'
import { rand, LoyDefs, SkyLantern, SkyLanterns, LoyMoon, Fireflies, Twinkles, Bat, Snow, Heart, ChineseLantern } from '../festival/parts'
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

const THEMES = {
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

function Ground({ festival }) {
  const Scene = GROUNDS[festival]
  const burst = BURSTS[festival]
  const [fx, setFx] = useState([])
  if (!Scene) return null
  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const id = `${Date.now()}-${Math.random()}`
    setFx((f) => [...f.slice(-6), { id, x: e.clientX - r.left, y: e.clientY - r.top }])
    setTimeout(() => setFx((f) => f.filter((p) => p.id !== id)), 3200)
  }
  return (
    <div className={`fes-ground ${festival}`} onClick={onClick} title="คลิกเล่นได้ ✨" aria-hidden="true">
      <div className="fes-ground-scene">
        <Scene />
      </div>
      {fx.map((p) => (
        <Burst key={p.id} x={p.x} y={p.y} burst={burst} />
      ))}
    </div>
  )
}

/* --------------------------------- mounting --------------------------------- */

// Decorations are pure eye-candy, so they mount just AFTER the page has loaded and gone
// idle (the festival colours themselves apply instantly via CSS). Keeps first paint and
// interaction fast — the scene then fades in.
function useAfterLoad() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let idle
    let timer
    const go = () => {
      const ric = window.requestIdleCallback
      if (ric) idle = ric(() => setReady(true), { timeout: 1500 })
      else timer = setTimeout(() => setReady(true), 300)
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle)
      clearTimeout(timer)
    }
  }, [])
  return ready
}

export default function FestivalLayer() {
  const festival = useActiveFestival()
  const { pathname } = useLocation()
  const ready = useAfterLoad()
  const T = THEMES[festival]
  if (!festival || festival === 'none' || !T) return null
  const defs = festival === 'loykrathong' && <LoyDefs />

  // login: one light layer behind the branded content (the login page doesn't scroll)
  if (pathname === '/login') {
    if (!ready) return null
    const Scene = GROUNDS[festival]
    return (
      <div className="fes-layer fes-behind" aria-hidden="true">
        {defs}
        <T.Sky subtle />
        <T.Ambient subtle />
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
      {/* room for the ground scene below the content — present from the first render so
          nothing jumps when the scene fades in */}
      <div className="fes-ground-spacer" aria-hidden="true" />
      {ready && (
        <>
          {defs}
          <div className="fes-ambient" aria-hidden="true">
            <div className={`fes-vignette ${festival}`} />
            <T.Ambient />
          </div>
          <div className="fes-sky" aria-hidden="true">
            <T.Sky />
          </div>
          <Ground festival={festival} />
        </>
      )}
    </>
  )
}
