// Shared festival drawings (pure, decorative). Used by the sky / ambient layers in
// FestivalLayer.jsx and by the ground scenes in grounds.jsx.

export const rand = (seed) => {
  // tiny deterministic pseudo-random so SSR/hydration and re-renders are stable per index
  const x = Math.sin(seed * 999.13) * 10000
  return x - Math.floor(x)
}

export function LoyDefs() {
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

export function KrathongBody() {
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

export function KrathongSVG() {
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

export function SkyLantern() {
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

export function SkyLanterns({ count = 9 }) {
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

export function LoyMoon({ style }) {
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

export const wave = (y, a) => {
  let d = `M0 ${y} Q50 ${y - a} 100 ${y}`
  for (let x = 200; x <= 2400; x += 100) d += ` T${x} ${y}`
  return d
}

export function Fireflies({ count = 10 }) {
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

export function Twinkles({ count = 16, colors = ['#fff', '#ffe29a'] }) {
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

export function Bat({ style }) {
  return (
    <div className="fes-bat" style={style}>
      <svg width="46" height="24" viewBox="0 0 46 24" fill="#140a1f">
        <path d="M23 7c2-5 5-6 8-3 1-4 5-4 7-1 3-1 6 0 8 4-4-1-5 2-7 4-2-3-5-2-6 1-2-4-5-4-10-6zm0 0c-2-5-5-6-8-3-1-4-5-4-7-1-3-1-6 0-8 4 4-1 5 2 7 4 2-3 5-2 6 1 2-4 5-4 10-6z" />
        <ellipse cx="23" cy="9" rx="3.6" ry="4.6" />
      </svg>
    </div>
  )
}

export function Snow({ count = 40 }) {
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

export function Heart({ style }) {
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

export function ChineseLantern({ style }) {
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

