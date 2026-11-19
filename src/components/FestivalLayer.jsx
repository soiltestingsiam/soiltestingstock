import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveFestival } from '../store/useFestivalStore'

// Full-screen decorative overlay for the active festival. Fixed, pointer-events-none,
// sits above the page background but below modals. Each festival renders its own set of
// softly-animated, translucent decorations so content stays readable.

const rand = (seed) => {
  // tiny deterministic pseudo-random so SSR/hydration and re-renders are stable per index
  const x = Math.sin(seed * 999.13) * 10000
  return x - Math.floor(x)
}

/* ---------------- ลอยกระทง · ยี่เป็ง — a moonlit river scene ----------------
   Full moon + its path of light on the water, a softly rippling river, lotus krathongs
   (folded banana-leaf บายศรี, lotus petals, marigolds, candle + incense) drifting with their
   reflections, Yi Peng sky lanterns rising at different depths, and fireflies. */

// gradients shared by every krathong / lantern on the page (one copy in the DOM)
function LoyDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="lk-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2701b" />
          <stop offset="55%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#ffe9a8" />
        </linearGradient>
        <radialGradient id="lk-glow" cx="50%" cy="78%" r="62%">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity=".95" />
          <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lk-halo">
          <stop offset="0%" stopColor="#ffc96b" stopOpacity=".5" />
          <stop offset="100%" stopColor="#ffc96b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kt-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f9b5e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="kt-leaf2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86cf97" />
          <stop offset="100%" stopColor="#2f7a49" />
        </linearGradient>
        <linearGradient id="kt-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff2f7" />
          <stop offset="55%" stopColor="#ffb6d0" />
          <stop offset="100%" stopColor="#ec6b9c" />
        </linearGradient>
        <linearGradient id="kt-petal2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffd5e5" />
        </linearGradient>
        <linearGradient id="kt-candle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f3e2c0" />
          <stop offset="50%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#e6d0a6" />
        </linearGradient>
        <radialGradient id="kt-flame" cx="50%" cy="70%" r="65%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="45%" stopColor="#ffd34d" />
          <stop offset="100%" stopColor="#ff7a1a" />
        </radialGradient>
        <radialGradient id="kt-halo">
          <stop offset="0%" stopColor="#ffd88a" stopOpacity=".8" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="kt-water">
          <stop offset="0%" stopColor="#ffcf7a" stopOpacity=".5" />
          <stop offset="100%" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kt-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".6" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="kt-reflect" maskUnits="userSpaceOnUse" x="0" y="73" width="120" height="62">
          <rect x="0" y="73" width="120" height="62" fill="url(#kt-fade)" />
        </mask>
        <radialGradient id="moon-face" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fffdf3" />
          <stop offset="70%" stopColor="#fff1c9" />
          <stop offset="100%" stopColor="#f0d48e" />
        </radialGradient>
        <radialGradient id="moon-halo">
          <stop offset="0%" stopColor="#fff1c4" stopOpacity=".55" />
          <stop offset="38%" stopColor="#ffe3a0" stopOpacity=".18" />
          <stop offset="100%" stopColor="#ffe3a0" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function KrathongBody() {
  return (
    <g>
      {[-80, -63, -46, -29, -12, 12, 29, 46, 63, 80].map((a) => (
        <path key={a} d="M60 66 L54.5 48.5 Q60 41.5 65.5 48.5 Z" fill="url(#kt-leaf2)" stroke="#1d6b3c" strokeWidth=".7" transform={`rotate(${a} 60 66)`} />
      ))}
      <path d="M8 62 Q60 84 112 62 Q104 75 60 78 Q16 75 8 62 Z" fill="url(#kt-leaf)" />
      <path d="M15 64.5 Q60 80 105 64.5" stroke="#6fca8b" strokeWidth="1" fill="none" opacity=".55" />
      {[-66, -44, -22, 0, 22, 44, 66].map((a) => (
        <path key={a} d="M60 63 C51 51 53 36 60 27 C67 36 69 51 60 63 Z" fill="url(#kt-petal)" stroke="#df5f8e" strokeWidth=".6" transform={`rotate(${a} 60 63)`} />
      ))}
      {[-34, -12, 12, 34].map((a) => (
        <path key={a} d="M60 61 C55 52 56 42 60 35 C64 42 65 52 60 61 Z" fill="url(#kt-petal2)" stroke="#f3a3c2" strokeWidth=".5" transform={`rotate(${a} 60 61)`} />
      ))}
      {[[46, 58], [74, 58], [39, 62], [81, 62]].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="3.9" fill="#ffa62b" />
          <circle cx={x} cy={y} r="1.6" fill="#f07800" />
        </g>
      ))}
    </g>
  )
}

function KrathongSVG() {
  return (
    <svg viewBox="0 0 120 100" overflow="visible" className="fes-kt-svg" aria-hidden="true">
      {/* reflection on the water, fading out */}
      <g mask="url(#kt-reflect)">
        <g transform="translate(0 147) scale(1 -1)">
          <KrathongBody />
          <circle cx="60" cy="27" r="14" fill="url(#kt-halo)" />
        </g>
      </g>
      <ellipse className="fes-kt-ripple" cx="60" cy="75" rx="44" ry="5" fill="none" stroke="rgba(255,226,170,.5)" strokeWidth="1.2" style={{ transformOrigin: '60px 75px' }} />
      <ellipse className="fes-kt-pulse" cx="60" cy="76" rx="54" ry="8" fill="url(#kt-water)" style={{ transformOrigin: '60px 76px' }} />
      <KrathongBody />
      {/* incense */}
      <path d="M66 58 L72 31 M69 58 L77 34 M63 58 L66 30" stroke="#7a4a24" strokeWidth="1.2" strokeLinecap="round" />
      <g fill="#ff5a2e">
        <circle cx="72" cy="31" r="1.4" />
        <circle cx="77" cy="34" r="1.4" />
        <circle cx="66" cy="30" r="1.4" />
      </g>
      <path className="fes-kt-smoke" d="M72 30 C69 23 76 19 72 11" stroke="rgba(255,255,255,.4)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* candle + flame */}
      <rect x="55.5" y="36" width="9" height="22" rx="2.5" fill="url(#kt-candle)" />
      <ellipse cx="60" cy="36.5" rx="4.5" ry="1.4" fill="#fff6e0" />
      <circle className="fes-kt-halo" cx="60" cy="27" r="17" fill="url(#kt-halo)" style={{ transformOrigin: '60px 27px' }} />
      <path className="fes-kt-flame" d="M60 15 C64.5 21 65 27 60 32 C55 27 55.5 21 60 15 Z" fill="url(#kt-flame)" style={{ transformOrigin: '60px 32px' }} />
      <path d="M60 22 C61.6 25 61.6 28 60 30 C58.4 28 58.4 25 60 22 Z" fill="#fffef5" opacity=".9" />
    </svg>
  )
}

function Krathongs({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => {
    const depth = rand(i + 41) // 0 = near … 1 = far up the river
    const dur = 50 + rand(i + 11) * 36
    return (
      <div
        key={i}
        className="fes-kt"
        style={{
          width: Math.round(96 - depth * 46),
          bottom: `${0.5 + depth * 8.5}vh`,
          animationDuration: `${dur}s`,
          animationDelay: `${-rand(i + 13) * dur}s`,
          zIndex: Math.round((1 - depth) * 10),
        }}
      >
        <div className="fes-kt-bob" style={{ opacity: 1 - depth * 0.35, animationDuration: `${3 + rand(i + 3) * 2}s`, animationDelay: `${-rand(i + 5) * 3}s` }}>
          <KrathongSVG />
        </div>
      </div>
    )
  })
}

function SkyLantern() {
  return (
    <svg viewBox="0 0 40 60" overflow="visible" aria-hidden="true">
      <ellipse cx="20" cy="32" rx="30" ry="34" fill="url(#lk-halo)" />
      <path d="M5 9 Q20 0 35 9 L31 47 Q20 52 9 47 Z" fill="url(#lk-body)" />
      <path d="M5 9 Q20 0 35 9 Q20 5.5 5 9 Z" fill="#b8540f" opacity=".55" />
      <path d="M12.5 7 L14 48.5 M20 4.5 V50 M27.5 7 L26 48.5" stroke="rgba(150,60,0,.22)" strokeWidth=".8" />
      <ellipse cx="20" cy="40" rx="10" ry="9" fill="url(#lk-glow)" />
      <ellipse cx="20" cy="47.5" rx="11" ry="2.6" fill="#a8480c" />
      <circle className="fes-lk-fire" cx="20" cy="51" r="2.3" fill="#fff3c4" style={{ transformOrigin: '20px 51px' }} />
    </svg>
  )
}

function SkyLanterns({ count = 9 }) {
  return Array.from({ length: count }, (_, i) => {
    const depth = rand(i + 61)
    const dur = 28 + depth * 22 + rand(i + 3) * 10 // far ones rise slower
    return (
      <div
        key={i}
        className="fes-lk"
        style={{ left: `${4 + rand(i + 1) * 90}%`, width: Math.round(36 - depth * 19), animationDuration: `${dur}s`, animationDelay: `${-rand(i + 7) * dur}s` }}
      >
        <div className="fes-lk-sway" style={{ opacity: 1 - depth * 0.45, animationDuration: `${5 + rand(i + 2) * 4}s` }}>
          <SkyLantern />
        </div>
      </div>
    )
  })
}

function LoyMoon({ style }) {
  return (
    <div className="fes-lkmoon" style={style}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
        <circle className="fes-lkmoon-halo" cx="100" cy="100" r="99" fill="url(#moon-halo)" style={{ transformOrigin: '100px 100px' }} />
        <circle cx="100" cy="100" r="40" fill="url(#moon-face)" />
        <g fill="#e2c385" opacity=".38">
          <circle cx="88" cy="90" r="6.5" />
          <circle cx="111" cy="108" r="8" />
          <circle cx="108" cy="84" r="3.6" />
          <circle cx="86" cy="112" r="4.5" />
          <circle cx="118" cy="94" r="2.6" />
        </g>
      </svg>
    </div>
  )
}

// a seamless sine wave line across 2400 units (wavelength 200)
const wave = (y, a) => {
  let d = `M0 ${y} Q50 ${y - a} 100 ${y}`
  for (let x = 200; x <= 2400; x += 100) d += ` T${x} ${y}`
  return d
}

function River({ subtle, moonPath }) {
  return (
    <div className="fes-river">
      <svg className="fes-waves" viewBox="0 0 2400 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={wave(26, 4)} stroke="rgba(255,226,170,.22)" strokeWidth="1.4" fill="none" />
        <path d={wave(52, 5)} stroke="rgba(190,205,255,.18)" strokeWidth="1.4" fill="none" />
        <path d={wave(78, 6)} stroke="rgba(255,226,170,.16)" strokeWidth="1.6" fill="none" />
      </svg>
      {moonPath && (
        <div className="fes-moonpath" style={moonPath}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ width: Math.round(30 + i * 9 + rand(i + 81) * 16), animationDelay: `${-rand(i + 71) * 3}s` }} />
          ))}
        </div>
      )}
      {Array.from({ length: subtle ? 6 : 14 }, (_, i) => (
        <span
          key={i}
          className="fes-glint"
          style={{
            left: `${rand(i + 91) * 96}%`,
            bottom: `${8 + rand(i + 93) * 70}%`,
            width: Math.round(14 + rand(i + 95) * 34),
            animationDelay: `${-rand(i + 97) * 4}s`,
            animationDuration: `${3 + rand(i + 99) * 3}s`,
          }}
        />
      ))}
    </div>
  )
}

function Fireflies({ count = 10 }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className="fes-firefly"
      style={{
        left: `${rand(i + 101) * 100}%`,
        bottom: `${4 + rand(i + 103) * 18}vh`,
        animationDuration: `${7 + rand(i + 105) * 6}s`,
        animationDelay: `${-rand(i + 107) * 10}s`,
      }}
    />
  ))
}

function Twinkles({ count = 16, colors = ['#fff', '#ffe29a'] }) {
  return Array.from({ length: count }, (_, i) => {
    const size = 2 + rand(i + 31) * 3
    return (
      <span
        key={i}
        className="fes-twinkle"
        style={{
          top: `${rand(i + 23) * 70}%`,
          left: `${rand(i + 29) * 100}%`,
          width: size,
          height: size,
          background: colors[i % colors.length],
          boxShadow: `0 0 8px ${colors[i % colors.length]}`,
          animationDelay: `${rand(i + 37) * 2.4}s`,
        }}
      />
    )
  })
}

function LoyKrathong({ subtle }) {
  // login (subtle, behind the content): moon top-left, clear of the card + mascot
  const moon = subtle ? { top: '4%', left: '6%', width: 150, height: 150 } : { top: '12%', right: '5%', width: 170, height: 170 }
  const moonPath = subtle ? { left: 'calc(6% + 75px)' } : { right: 'calc(5% + 85px)' }
  return (
    <>
      <LoyDefs />
      <Twinkles count={subtle ? 8 : 20} colors={['#ffffff', '#ffe29a']} />
      <LoyMoon style={moon} />
      <SkyLanterns count={subtle ? 4 : 10} />
      <River subtle={subtle} moonPath={moonPath} />
      <Fireflies count={subtle ? 4 : 10} />
      <Krathongs count={subtle ? 2 : 5} />
    </>
  )
}

function Bat({ style }) {
  return (
    <div className="fes-bat" style={style}>
      <svg width="46" height="24" viewBox="0 0 46 24" fill="#140a1f">
        <path d="M23 7c2-5 5-6 8-3 1-4 5-4 7-1 3-1 6 0 8 4-4-1-5 2-7 4-2-3-5-2-6 1-2-4-5-4-10-6zm0 0c-2-5-5-6-8-3-1-4-5-4-7-1-3-1-6 0-8 4 4-1 5 2 7 4 2-3 5-2 6 1 2-4 5-4 10-6z" />
        <ellipse cx="23" cy="9" rx="3.6" ry="4.6" />
      </svg>
    </div>
  )
}

function Halloween({ subtle }) {
  const bats = Array.from({ length: subtle ? 2 : 5 }, (_, i) => ({
    top: `${8 + rand(i + 2) * 40}%`,
    animationDuration: `${12 + rand(i + 4) * 10}s`,
    animationDelay: `${-rand(i + 6) * 14}s`,
    transform: `scale(${0.6 + rand(i + 8) * 0.8})`,
  }))
  const web = (
    <svg viewBox="0 0 100 100" fill="none" stroke="rgba(200,180,255,.7)" strokeWidth="1">
      <path d="M0 0 L100 100 M0 0 L70 0 M0 0 L0 70 M0 0 L50 18 M0 0 L18 50" />
      <path d="M18 0 Q22 22 0 18 M40 0 Q46 46 0 40 M64 0 Q70 70 0 64 M88 0 Q92 92 0 88" />
    </svg>
  )
  return (
    <>
      <div className="fes-moon" style={{ top: '8%', left: '9%', background: 'radial-gradient(circle at 38% 34%, #fff, #ffd9a0 60%, #e9a94d)' }} />
      <div className="fes-web tl">{web}</div>
      <div className="fes-web tr">{web}</div>
      {bats.map((s, i) => (
        <Bat key={i} style={s} />
      ))}
      {(subtle ? [50] : [12, 50, 86]).map((left, i) => (
        <div
          key={i}
          className="fes-float"
          style={{ bottom: `${3 + rand(i + 40) * 4}vh`, left: `${left}%`, animationDuration: `${3.5 + rand(i) * 2}s`, animationDelay: `${-rand(i + 1) * 3}s` }}
        >
          <svg width="46" height="44" viewBox="0 0 46 44">
            <path d="M23 6c-1-4-6-5-7-1 2-1 4 0 4 2-7 1-12 7-12 15 0 9 7 16 15 16s15-7 15-16c0-8-5-14-12-15 0-2 2-3 4-2-1-4-6-3-7 1z" fill="#1f6b2b" />
            <ellipse cx="23" cy="26" rx="16" ry="14" fill="#ff7518" />
            <path d="M14 22l5 6-6 0z M32 22l-5 6 6 0z M18 34q5 4 10 0q-5-2-10 0z" fill="#3a1206" />
          </svg>
        </div>
      ))}
      <Twinkles count={subtle ? 6 : 14} colors={['#ff8a3d', '#c4a5ff']} />
    </>
  )
}

function Snow({ count = 40 }) {
  return Array.from({ length: count }, (_, i) => {
    const size = 2 + rand(i + 3) * 5
    const dur = 7 + rand(i + 9) * 9
    return (
      <span
        key={i}
        className="fes-snow"
        style={{ left: `${rand(i + 5) * 100}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: `${-rand(i + 7) * dur}s`, opacity: 0.4 + rand(i + 11) * 0.6 }}
      />
    )
  })
}

function Christmas({ subtle }) {
  const lights = Array.from({ length: subtle ? 12 : 22 }, (_, i) => i)
  const colors = ['#ff4d5e', '#ffd93b', '#51cf66', '#4dabf7']
  return (
    <>
      <div className="absolute left-0 right-0 top-0 flex justify-around px-2" style={{ paddingTop: 6 }} aria-hidden="true">
        {lights.map((i) => (
          <span
            key={i}
            className="fes-twinkle"
            style={{ width: 8, height: 8, background: colors[i % 4], boxShadow: `0 0 10px ${colors[i % 4]}`, animationDelay: `${(i % 6) * 0.3}s` }}
          />
        ))}
      </div>
      <Snow count={subtle ? 18 : 46} />
    </>
  )
}

function Songkran({ subtle }) {
  const drops = Array.from({ length: subtle ? 14 : 34 }, (_, i) => ({
    left: `${rand(i + 2) * 100}%`,
    animationDuration: `${1.4 + rand(i + 4) * 1.6}s`,
    animationDelay: `${-rand(i + 6) * 2}s`,
  }))
  return (
    <>
      {drops.map((s, i) => (
        <span key={i} className="fes-drop" style={s} />
      ))}
      {(subtle ? [30, 72] : [20, 55, 82]).map((left, i) => (
        <div key={i} className="fes-ripple" style={{ left: `${left}%`, animationDelay: `${i * 0.9}s` }} />
      ))}
      {(subtle ? [22, 78] : [14, 40, 66, 90]).map((left, i) => (
        <div
          key={`f${i}`}
          className="fes-float"
          style={{ top: `${20 + rand(i + 50) * 50}%`, left: `${left}%`, animationDuration: `${4 + rand(i) * 2}s`, animationDelay: `${-rand(i + 2) * 4}s` }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="13" cy="6" rx="3.4" ry="6" fill="#ffd7e6" transform={`rotate(${a} 13 13)`} />
            ))}
            <circle cx="13" cy="13" r="3" fill="#ffd93b" />
          </svg>
        </div>
      ))}
      <Twinkles count={subtle ? 6 : 10} colors={['#bfefff', '#7fe3ff']} />
    </>
  )
}

function NewYear({ subtle }) {
  const fireworks = Array.from({ length: subtle ? 3 : 7 }, (_, i) => ({
    top: `${6 + rand(i + 2) * 42}%`,
    left: `${8 + rand(i + 4) * 84}%`,
    color: ['#ffd27f', '#ff7eb6', '#7fd0ff', '#b7ff8a'][i % 4],
    animationDuration: `${2.4 + rand(i + 6) * 1.6}s`,
    animationDelay: `${-rand(i + 8) * 3}s`,
  }))
  return (
    <>
      {fireworks.map((f, i) => (
        <span key={i} className="fes-firework" style={{ top: f.top, left: f.left, color: f.color, animationDuration: f.animationDuration, animationDelay: f.animationDelay }} />
      ))}
      <Twinkles count={subtle ? 10 : 22} colors={['#ffd27f', '#fff', '#ff9ecb']} />
    </>
  )
}

function Heart({ style }) {
  return (
    <div className="fes-heart" style={style}>
      <span style={{ animationDuration: `${4 + rand(1) * 3}s` }}>
        <svg width="26" height="24" viewBox="0 0 26 24">
          <path d="M13 23S1 15.5 1 7.5A6.5 6.5 0 0 1 13 4.4A6.5 6.5 0 0 1 25 7.5C25 15.5 13 23 13 23Z" fill="#ff5a8a" />
          <path d="M7.5 3.4C9 3.4 10.4 4.3 11 5.8" stroke="#ffd4e3" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".85" />
        </svg>
      </span>
    </div>
  )
}

function Valentine({ subtle }) {
  const hearts = Array.from({ length: subtle ? 3 : 7 }, (_, i) => ({
    left: `${6 + rand(i + 1) * 88}%`,
    animationDuration: `${16 + rand(i + 3) * 12}s`,
    animationDelay: `${-rand(i + 7) * 24}s`,
    transform: `scale(${0.7 + rand(i + 5) * 0.9})`,
  }))
  const petals = Array.from({ length: subtle ? 12 : 30 }, (_, i) => ({
    left: `${rand(i + 2) * 100}%`,
    animationDuration: `${7 + rand(i + 9) * 8}s`,
    animationDelay: `${-rand(i + 5) * 12}s`,
    opacity: 0.5 + rand(i + 11) * 0.5,
  }))
  return (
    <>
      {hearts.map((s, i) => (
        <Heart key={i} style={s} />
      ))}
      {petals.map((s, i) => (
        <span key={`p${i}`} className="fes-petal" style={s} />
      ))}
      <Twinkles count={subtle ? 8 : 16} colors={['#ff9fc3', '#fff']} />
    </>
  )
}

function ChineseLantern({ style }) {
  return (
    <div className="fes-clantern" style={style}>
      <svg width="40" height="72" viewBox="0 0 40 72">
        <line x1="20" y1="0" x2="20" y2="10" stroke="#caa23a" strokeWidth="1.5" />
        <rect x="13" y="9" width="14" height="5" rx="1.5" fill="#f0c24a" />
        <ellipse cx="20" cy="32" rx="16" ry="17" fill="#d81f1f" />
        <ellipse cx="14" cy="26" rx="4" ry="8" fill="#ff6a5a" opacity=".5" />
        <path d="M20 15.5Q11 32 20 48.5M20 15.5Q29 32 20 48.5" stroke="#a81414" strokeWidth="1" fill="none" opacity=".7" />
        <circle cx="20" cy="32" r="4.5" fill="#f5d36a" />
        <path d="M20 29.5l1.2 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="#c0392b" />
        <rect x="13" y="47" width="14" height="5" rx="1.5" fill="#f0c24a" />
        <g stroke="#e8b63a" strokeWidth="1.4">
          <line x1="16" y1="52" x2="16" y2="66" />
          <line x1="20" y1="52" x2="20" y2="69" />
          <line x1="24" y1="52" x2="24" y2="66" />
        </g>
      </svg>
    </div>
  )
}

function ChineseNewYear({ subtle }) {
  const lanterns = Array.from({ length: subtle ? 3 : 6 }, (_, i) => ({
    left: `${4 + rand(i + 1) * 90}%`,
    top: `${-6 + rand(i + 3) * 8}%`,
    animationDuration: `${3.5 + rand(i + 5) * 2.5}s`,
    animationDelay: `${-rand(i + 7) * 3}s`,
    transform: `scale(${0.72 + rand(i + 9) * 0.6})`,
  }))
  const confetti = Array.from({ length: subtle ? 14 : 36 }, (_, i) => {
    const w = 5 + rand(i + 4) * 5
    return {
      left: `${rand(i + 2) * 100}%`,
      width: w,
      height: w * 0.6,
      background: ['#ffd24d', '#ffbf3a', '#ff7a4a'][i % 3],
      animationDuration: `${5 + rand(i + 9) * 7}s`,
      animationDelay: `${-rand(i + 5) * 12}s`,
    }
  })
  return (
    <>
      {lanterns.map((s, i) => (
        <ChineseLantern key={i} style={s} />
      ))}
      {confetti.map((s, i) => (
        <span key={`c${i}`} className="fes-confetti" style={s} />
      ))}
      <Twinkles count={subtle ? 8 : 18} colors={['#ffd24d', '#ff8a5a']} />
    </>
  )
}

const DECOR = {
  loykrathong: LoyKrathong,
  halloween: Halloween,
  christmas: Christmas,
  songkran: Songkran,
  newyear: NewYear,
  chinesenewyear: ChineseNewYear,
  valentine: Valentine,
}

// Decorations are pure eye-candy, so they mount just AFTER the page has loaded and gone
// idle (the festival colours themselves apply instantly via CSS). Keeps first paint and
// interaction fast — the scene then fades in.
function useAfterLoad() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let idle, timer
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
  if (festival === 'none' || !festival || !ready) return null
  // on the login page the decorations are toned down and sit BEHIND the branded story,
  // so it feels festive without being busy
  const onLogin = pathname === '/login'
  const Decor = DECOR[festival]
  return (
    <div className={`fes-layer ${onLogin ? 'fes-behind' : ''}`} aria-hidden="true">
      {!onLogin && <div className={`fes-vignette ${festival}`} />}
      {Decor && <Decor subtle={onLogin} />}
    </div>
  )
}
