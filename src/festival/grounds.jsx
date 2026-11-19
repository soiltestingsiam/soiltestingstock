// Ground scenes — what you discover when you scroll to the very bottom of a page, one per
// festival. Each scene is a full-width strip (≈210px) built from small SVG pieces placed by
// % so it adapts to any width. `subtle` (login page) renders a lighter version.
// Click effects for each scene live in BURSTS (handled by FestivalLayer).

import { rand, wave, KrathongSVG, Fireflies } from './parts'

// place a piece by its horizontal centre (% of the width), standing `b` px above the bottom
function At({ x, b = 0, w, h, className = '', style, children }) {
  return (
    <div className={`fes-at ${className}`} style={{ left: `${x}%`, bottom: b, width: w, height: h, ...style }}>
      {children}
    </div>
  )
}

function Hills({ h = 90, back, front, line }) {
  return (
    <svg className="fes-hills" style={{ height: h }} viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 90 L0 36 Q90 14 200 30 T420 26 T640 36 T860 22 T1060 34 T1200 24 L1200 90 Z" fill={back} />
      <path d="M0 90 L0 54 Q120 38 260 52 T520 48 T780 56 T1020 46 T1200 54 L1200 90 Z" fill={front} />
      {line && <path d="M0 54 Q120 38 260 52 T520 48 T780 56 T1020 46 T1200 54" stroke={line} strokeWidth="3" fill="none" />}
    </svg>
  )
}

/* ============================== ลอยกระทง — river ============================== */

function Reeds({ flip }) {
  return (
    <svg viewBox="0 0 90 130" width="100%" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <g className="fes-sway-base" style={{ transformOrigin: '45px 130px' }} stroke="#1f5a3b" strokeLinecap="round" fill="none">
        <path d="M20 130 Q18 80 8 40" strokeWidth="4" />
        <path d="M34 130 Q36 70 30 18" strokeWidth="4" />
        <path d="M46 130 Q52 86 64 44" strokeWidth="3.5" />
        <path d="M58 130 Q66 100 84 74" strokeWidth="3" />
        <path d="M28 130 Q20 104 2 92" strokeWidth="3" />
      </g>
      <g fill="#6b4226">
        <rect x="26" y="18" width="7" height="22" rx="3.5" />
        <rect x="5" y="40" width="6" height="18" rx="3" transform="rotate(-18 8 49)" />
        <rect x="60" y="44" width="6" height="18" rx="3" transform="rotate(24 63 53)" />
      </g>
    </svg>
  )
}

function LotusPad({ flower }) {
  return (
    <svg viewBox="0 0 60 30" width="100%" aria-hidden="true">
      <path d="M30 22 L30 14 M30 14" stroke="none" />
      <ellipse cx="30" cy="22" rx="27" ry="7" fill="#2f7a49" />
      <path d="M30 22 L54 18" stroke="#1d5a35" strokeWidth="2" />
      <ellipse cx="30" cy="21" rx="22" ry="5" fill="#3f9b5e" opacity=".55" />
      {flower && (
        <g>
          {[-50, -25, 0, 25, 50].map((a) => (
            <path key={a} d="M30 20 C26 14 27 7 30 3 C33 7 34 14 30 20 Z" fill="#ffb6d0" stroke="#e46f9c" strokeWidth=".6" transform={`rotate(${a} 30 20)`} />
          ))}
          <circle cx="30" cy="17" r="2.6" fill="#ffd24d" />
        </g>
      )}
    </svg>
  )
}

function RiverGround({ subtle }) {
  const kt = subtle ? 2 : 5
  return (
    <>
      {/* far bank with distant village lights */}
      <svg className="fes-hills" style={{ bottom: 98, height: 44 }} viewBox="0 0 1200 44" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 44 L0 24 Q60 10 130 20 T280 16 T430 22 T600 12 T760 20 T920 14 T1080 22 T1200 16 L1200 44 Z" fill="#0d2430" />
      </svg>
      {Array.from({ length: subtle ? 6 : 14 }, (_, i) => (
        <span key={i} className="fes-vlight" style={{ left: `${4 + rand(i + 201) * 92}%`, bottom: 104 + rand(i + 203) * 14, animationDelay: `${-rand(i + 205) * 3}s` }} />
      ))}
      {/* the river */}
      <div className="fes-water">
        <svg className="fes-waves" viewBox="0 0 2400 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={wave(22, 4)} stroke="rgba(255,226,170,.25)" strokeWidth="1.4" fill="none" />
          <path d={wave(50, 5)} stroke="rgba(190,205,255,.2)" strokeWidth="1.4" fill="none" />
          <path d={wave(78, 6)} stroke="rgba(255,226,170,.18)" strokeWidth="1.6" fill="none" />
        </svg>
        {Array.from({ length: subtle ? 6 : 14 }, (_, i) => (
          <span
            key={i}
            className="fes-glint"
            style={{ left: `${rand(i + 91) * 96}%`, bottom: `${8 + rand(i + 93) * 70}%`, width: Math.round(14 + rand(i + 95) * 34), animationDelay: `${-rand(i + 97) * 4}s`, animationDuration: `${3 + rand(i + 99) * 3}s` }}
          />
        ))}
      </div>
      {/* lotus pads */}
      {(subtle ? [16, 84] : [12, 27, 58, 79, 91]).map((x, i) => (
        <At key={x} x={x} b={10 + rand(i + 211) * 46} w={46 + rand(i + 213) * 20} className="fes-bob-slow" style={{ animationDelay: `${-rand(i + 215) * 4}s` }}>
          <LotusPad flower={i % 2 === 0} />
        </At>
      ))}
      {/* krathongs drifting along with their reflections */}
      {Array.from({ length: kt }, (_, i) => {
        const depth = rand(i + 41)
        const dur = 46 + rand(i + 11) * 34
        return (
          <div key={i} className="fes-kt" style={{ width: Math.round(84 - depth * 34), bottom: 6 + depth * 56, animationDuration: `${dur}s`, animationDelay: `${-rand(i + 13) * dur}s`, zIndex: Math.round((1 - depth) * 10) }}>
            <div className="fes-kt-bob" style={{ animationDuration: `${3 + rand(i + 3) * 2}s` }}>
              <KrathongSVG />
            </div>
          </div>
        )
      })}
      <At x={3} b={0} w={88} className="fes-front">
        <Reeds />
      </At>
      <At x={97} b={0} w={88} className="fes-front">
        <Reeds flip />
      </At>
      <div className="fes-fireflies-low">
        <Fireflies count={subtle ? 3 : 8} />
      </div>
    </>
  )
}

/* ============================ ฮาโลวีน — graveyard ============================ */

function Tomb({ kind = 'round' }) {
  const stone = '#4d4766'
  const edge = '#272240'
  if (kind === 'cross') {
    return (
      <svg viewBox="0 0 60 84" width="100%" aria-hidden="true">
        <path d="M24 82 V32 H8 V21 H24 V5 H36 V21 H52 V32 H36 V82 Z" fill={stone} stroke={edge} strokeWidth="2" strokeLinejoin="round" />
        <path d="M28 10 L29 28 M12 25 H22" stroke="#6d6690" strokeWidth="1.6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 60 84" width="100%" aria-hidden="true" style={kind === 'slant' ? { transform: 'rotate(-8deg)', transformOrigin: '50% 100%' } : undefined}>
      <path d="M6 82 V30 Q6 4 30 4 Q54 4 54 30 V82 Z" fill={stone} stroke={edge} strokeWidth="2" />
      <path d="M12 78 V32 Q12 11 30 11" stroke="#6d6690" strokeWidth="2" fill="none" opacity=".6" />
      <text x="30" y="42" textAnchor="middle" fontSize="11.5" fontWeight="800" fill={edge} fontFamily="system-ui, sans-serif">R.I.P</text>
      <path d="M21 52 H39 M24 59 H36" stroke={edge} strokeWidth="1.8" opacity=".55" />
      <path d="M45 20 L40 31 L46 38" stroke={edge} strokeWidth="1.3" fill="none" opacity=".7" />
      <path d="M8 82 Q14 72 20 82 M40 82 Q46 74 52 82" fill="#2f5a2a" />
    </svg>
  )
}

function ZombieHand({ delay = 0, flip = false }) {
  return (
    <div className="fes-handbox">
      <div className="fes-hand" style={{ animationDelay: `${delay}s` }}>
        <svg viewBox="0 0 40 72" width="40" height="72" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
          <path d="M13 72 L14 42 Q14 36 20 36 Q26 36 26 42 L27 72 Z" fill="#7aa577" stroke="#3d5c3b" strokeWidth="1.5" />
          <path d="M9 72 L12 54 L16 58 L20 51 L24 58 L28 53 L31 72 Z" fill="#5a3e2b" />
          <g className="fes-fingers" style={{ transformOrigin: '20px 34px' }}>
            <path d="M14 31 L11 15 M18.5 29 L18 9 M23 29 L25 11 M27 32 L31 18 M13 36 L5 30" stroke="#3d5c3b" strokeWidth="7" strokeLinecap="round" />
            <path d="M14 31 L11 15 M18.5 29 L18 9 M23 29 L25 11 M27 32 L31 18 M13 36 L5 30" stroke="#86b583" strokeWidth="4.6" strokeLinecap="round" />
            <ellipse cx="20" cy="34" rx="9" ry="7" fill="#86b583" stroke="#3d5c3b" strokeWidth="1.4" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function Ghost() {
  return (
    <svg viewBox="0 0 50 60" width="100%" aria-hidden="true">
      <path d="M25 2 C11 2 5 14 5 28 L5 54 L11 48 L17 55 L23 48 L29 55 L35 48 L41 55 L45 50 L45 28 C45 14 39 2 25 2 Z" fill="#f6f3ff" />
      <ellipse cx="18" cy="24" rx="3.6" ry="5" fill="#2a2540" />
      <ellipse cx="32" cy="24" rx="3.6" ry="5" fill="#2a2540" />
      <ellipse cx="25" cy="36" rx="4.5" ry="5.5" fill="#2a2540" />
      <ellipse cx="12.5" cy="31" rx="3.5" ry="2" fill="#ffb3c6" opacity=".7" />
      <ellipse cx="37.5" cy="31" rx="3.5" ry="2" fill="#ffb3c6" opacity=".7" />
    </svg>
  )
}

function DeadTree() {
  return (
    <svg viewBox="0 0 150 200" width="100%" aria-hidden="true">
      <g stroke="#1a1028" strokeLinecap="round" fill="none">
        <path d="M66 200 C68 160 64 128 56 100" strokeWidth="16" />
        <path d="M56 100 C44 90 28 86 10 70 M56 100 C60 82 54 62 40 46 M62 128 C78 112 100 106 126 92" strokeWidth="9" />
        <path d="M40 46 C32 38 28 28 30 16 M40 46 C48 38 56 32 66 30 M100 106 C108 92 108 78 116 64 M18 76 C12 68 10 58 14 50 M126 92 C134 90 140 84 144 76" strokeWidth="4.5" />
      </g>
      <ellipse cx="60" cy="140" rx="9" ry="12" fill="#0b0614" />
      <g className="fes-blink" style={{ transformOrigin: '60px 138px' }}>
        <circle cx="56" cy="138" r="2.6" fill="#ffd34d" />
        <circle cx="64" cy="138" r="2.6" fill="#ffd34d" />
      </g>
    </svg>
  )
}

function JackO() {
  return (
    <svg viewBox="0 0 46 44" width="100%" aria-hidden="true">
      <ellipse className="fes-jack-glow" cx="23" cy="27" rx="22" ry="17" fill="rgba(255,150,40,.35)" />
      <path d="M23 6c-1-4-6-5-7-1 2-1 4 0 4 2-7 1-12 7-12 15 0 9 7 16 15 16s15-7 15-16c0-8-5-14-12-15 0-2 2-3 4-2-1-4-6-3-7 1z" fill="#1f6b2b" />
      <ellipse cx="23" cy="26" rx="16" ry="14" fill="#ff7518" />
      <path d="M17 12 Q15 26 17 39 M29 12 Q31 26 29 39" stroke="#d65a0c" strokeWidth="1.4" fill="none" />
      <path className="fes-jack-face" d="M14 22l5 6-6 0z M32 22l-5 6 6 0z M15 33 q4 4 8 1 q4 3 8 -1 q-8 -2 -16 0z" fill="#ffe08a" />
    </svg>
  )
}

function GraveyardGround({ subtle }) {
  const full = !subtle
  return (
    <>
      <Hills back="#2c1b46" front="#1d1231" />
      {full && (
        <At x={7} b={34} w={150}>
          <DeadTree />
        </At>
      )}
      <div className="fes-fog" style={{ bottom: 30, animationDuration: '46s' }} />
      <div className="fes-fog" style={{ bottom: 12, animationDuration: '62s', animationDelay: '-30s' }} />
      {[
        { x: 22, k: 'round', w: 54 },
        { x: 36, k: 'cross', w: 46 },
        { x: 51, k: 'slant', w: 56 },
        { x: 66, k: 'round', w: 44, opt: true },
        { x: 88, k: 'cross', w: 50, opt: true },
      ]
        .filter((t) => full || !t.opt)
        .map((t) => (
          <At key={t.x} x={t.x} b={44} w={t.w} className={t.opt ? 'fes-hide-sm' : ''}>
            <Tomb kind={t.k} />
          </At>
        ))}
      {[
        { x: 29, d: 0 },
        { x: 59, d: 2.4, flip: true },
        { x: 76, d: 4.8, opt: true },
      ]
        .filter((h) => full || !h.opt)
        .map((h) => (
          <At key={h.x} x={h.x} b={48} w={40} h={72} className={h.opt ? 'fes-hide-sm' : ''}>
            <ZombieHand delay={h.d} flip={h.flip} />
            <span className="fes-dirt" />
          </At>
        ))}
      <At x={43} b={40} w={46}>
        <JackO />
      </At>
      {full && (
        <At x={95} b={40} w={40} className="fes-hide-sm">
          <JackO />
        </At>
      )}
      <At x={62} b={112} w={46} className="fes-ghost">
        <Ghost />
      </At>
      {full && (
        <At x={82} b={38} w={56} h={34} className="fes-hide-sm">
          <span className="fes-bush" />
          <span className="fes-bush-eyes" />
        </At>
      )}
    </>
  )
}

/* ============================ คริสต์มาส — snowy yard ============================ */

function CandyCane({ flip }) {
  const d = 'M12 88 L12 24 Q12 6 24 6 Q36 6 36 18'
  return (
    <svg viewBox="0 0 44 92" width="100%" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d={d} stroke="#e8283a" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d={d} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="5 6" />
      <path d="M9.5 30 V84" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Snowman() {
  return (
    <svg viewBox="0 -24 100 164" width="100%" aria-hidden="true">
      <ellipse cx="50" cy="137" rx="32" ry="4" fill="rgba(0,0,0,.12)" />
      <circle cx="50" cy="108" r="30" fill="#fff" stroke="#c9dbf2" strokeWidth="2" />
      <circle cx="50" cy="66" r="22" fill="#fff" stroke="#c9dbf2" strokeWidth="2" />
      <circle cx="50" cy="34" r="17" fill="#fff" stroke="#c9dbf2" strokeWidth="2" />
      <g fill="#2b2b33">
        <circle cx="50" cy="62" r="2.6" />
        <circle cx="50" cy="72" r="2.6" />
        <circle cx="50" cy="100" r="2.8" />
        <circle cx="50" cy="113" r="2.8" />
        <circle cx="44" cy="31" r="2.4" />
        <circle cx="56" cy="31" r="2.4" />
        {[[43, 40], [46.5, 42.6], [50, 43.4], [53.5, 42.6], [57, 40]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="1.3" />
        ))}
      </g>
      <path d="M50 35 L66 38 L50 39.5 Z" fill="#ff8c2b" />
      <rect x="33" y="17" width="34" height="5" rx="2.5" fill="#1f1f29" />
      <rect x="38" y="-6" width="24" height="24" rx="2.5" fill="#1f1f29" />
      <rect x="38" y="11" width="24" height="4" fill="#e23b4b" />
      <path d="M31 50 Q50 59 69 50 L69 57 Q50 66 31 57 Z" fill="#e23b4b" />
      <g className="fes-scarf" style={{ transformOrigin: '60px 55px' }}>
        <rect x="56" y="54" width="9" height="24" rx="3" fill="#e23b4b" transform="rotate(-10 60 55)" />
        <path d="M57 66 H65 M57 72 H65" stroke="#fff" strokeWidth="2" transform="rotate(-10 60 55)" />
      </g>
      <path d="M30 68 L10 56 M14 58 L7 55 M14 58 L12 50" stroke="#6b4426" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <g className="fes-wave-arm" style={{ transformOrigin: '70px 68px' }}>
        <path d="M70 68 L90 52 M86 55 L95 53 M86 55 L88 46" stroke="#6b4426" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}

function PineTree({ seed = 0 }) {
  const bulbs = [[32, 38], [48, 44], [26, 62], [44, 66], [58, 60], [20, 90], [38, 94], [54, 92], [66, 86]]
  const colors = ['#ff4d5e', '#ffd93b', '#51cf66', '#4dabf7']
  return (
    <svg viewBox="0 0 80 122" width="100%" aria-hidden="true">
      <rect x="36" y="102" width="8" height="18" fill="#6b4426" />
      <path d="M40 10 L62 46 L18 46 Z" fill="#1f6b3a" />
      <path d="M40 30 L68 76 L12 76 Z" fill="#23773f" />
      <path d="M40 54 L74 106 L6 106 Z" fill="#1f6b3a" />
      <path d="M18 46 Q29 41 40 46 Q51 41 62 46 M12 76 Q26 70 40 76 Q54 70 68 76 M6 106 Q23 99 40 106 Q57 99 74 106" stroke="#f3f8ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      {bulbs.map(([x, y], i) => (
        <circle key={i} className="fes-bulb" cx={x} cy={y} r="2.8" fill={colors[(i + seed) % 4]} style={{ animationDelay: `${((i + seed) % 5) * 0.32}s` }} />
      ))}
      <path className="fes-star" d="M40 0 L43 7 L50 7.5 L44.5 12 L46.5 19 L40 15 L33.5 19 L35.5 12 L30 7.5 L37 7 Z" fill="#ffd34d" style={{ transformOrigin: '40px 10px' }} />
    </svg>
  )
}

function Gift({ color = '#e23b4b', ribbon = '#ffd34d' }) {
  return (
    <svg viewBox="0 0 40 42" width="100%" aria-hidden="true">
      <rect x="4" y="16" width="32" height="24" rx="2" fill={color} />
      <rect x="18" y="16" width="4" height="24" fill={ribbon} />
      <g className="fes-lid" style={{ transformOrigin: '20px 14px' }}>
        <rect x="2" y="10" width="36" height="8" rx="2" fill={color} stroke="rgba(0,0,0,.15)" />
        <rect x="18" y="10" width="4" height="8" fill={ribbon} />
        <ellipse cx="14" cy="8" rx="6" ry="3.6" fill={ribbon} transform="rotate(-20 14 8)" />
        <ellipse cx="26" cy="8" rx="6" ry="3.6" fill={ribbon} transform="rotate(20 26 8)" />
      </g>
    </svg>
  )
}

function SnowGround({ subtle }) {
  const full = !subtle
  return (
    <>
      <Hills back="#dbe7f7" front="#f4f8ff" />
      {[
        { x: 8, w: 84 },
        { x: 16, w: 60, opt: true },
        { x: 91, w: 80 },
      ]
        .filter((t) => full || !t.opt)
        .map((t, i) => (
          <At key={t.x} x={t.x} b={36} w={t.w} className={t.opt ? 'fes-hide-sm' : ''}>
            <PineTree seed={i} />
          </At>
        ))}
      {[
        { x: 26 },
        { x: 33, flip: true, opt: true },
        { x: 70, flip: true },
        { x: 78, opt: true },
      ]
        .filter((c) => full || !c.opt)
        .map((c) => (
          <At key={c.x} x={c.x} b={38} w={40} className={c.opt ? 'fes-hide-sm' : ''}>
            <div className="fes-wobble">
              <CandyCane flip={c.flip} />
            </div>
            <span className="fes-snowmound" />
          </At>
        ))}
      <At x={49} b={40} w={96}>
        <Snowman />
      </At>
      {full && (
        <>
          <At x={59} b={42} w={40}>
            <Gift />
          </At>
          <At x={63} b={42} w={32} className="fes-hide-sm">
            <Gift color="#2f8a4e" ribbon="#ff4d5e" />
          </At>
        </>
      )}
      {Array.from({ length: subtle ? 6 : 14 }, (_, i) => (
        <span key={i} className="fes-sparkle-snow" style={{ left: `${rand(i + 301) * 98}%`, bottom: 8 + rand(i + 303) * 34, animationDelay: `${-rand(i + 305) * 3}s` }} />
      ))}
    </>
  )
}

/* ============================ ปีใหม่ — city fireworks ============================ */

function CityGround({ subtle }) {
  const now = new Date()
  // greet the coming year from October on; in January–September the one just begun
  const ce = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear()
  const n = subtle ? 10 : 16
  let x = 0
  const buildings = Array.from({ length: n }, (_, i) => {
    const w = 100 / n
    const h = 46 + Math.round(rand(i + 401) * 72)
    const b = { x, w, h, rows: Math.max(2, Math.floor((h - 12) / 13)) }
    x += w
    return b
  })
  return (
    <>
      {Array.from({ length: subtle ? 3 : 6 }, (_, i) => (
        <span
          key={`fw${i}`}
          className="fes-firework"
          style={{ bottom: 130 + rand(i + 411) * 50, left: `${8 + rand(i + 413) * 84}%`, color: ['#ffd27f', '#ff7eb6', '#7fd0ff', '#b7ff8a'][i % 4], animationDuration: `${2.2 + rand(i + 415) * 1.6}s`, animationDelay: `${-rand(i + 417) * 3}s` }}
        />
      ))}
      {Array.from({ length: subtle ? 2 : 4 }, (_, i) => (
        <span key={`r${i}`} className="fes-rocket" style={{ left: `${14 + rand(i + 421) * 72}%`, animationDelay: `${-rand(i + 423) * 2.6}s` }} />
      ))}
      <div className="fes-neon">
        <div>สวัสดีปีใหม่ {ce + 543}</div>
        <div className="fes-neon-sub">HAPPY NEW YEAR {ce}</div>
      </div>
      {buildings.map((bd, i) => (
        <div key={i} className="fes-building" style={{ left: `${bd.x}%`, width: `calc(${bd.w}% - 4px)`, height: bd.h }}>
          {Array.from({ length: bd.rows * 3 }, (_, j) => {
            const lit = rand(i * 40 + j + 431) < 0.5
            return <span key={j} className={lit ? (rand(i * 40 + j + 433) < 0.25 ? 'lit blink' : 'lit') : ''} style={{ animationDelay: `${-rand(j + 435) * 4}s` }} />
          })}
          {bd.h > 100 && <i className="fes-antenna" />}
        </div>
      ))}
    </>
  )
}

/* ============================ ตรุษจีน — lion dance ============================ */

function LionHead() {
  return (
    <svg viewBox="0 0 160 130" width="100%" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return <circle key={i} cx={80 + Math.cos(a) * 50} cy={64 + Math.sin(a) * 46} r="13" fill="#ffd34d" stroke="#e0a21a" strokeWidth="1.5" />
      })}
      <ellipse cx="80" cy="64" rx="47" ry="43" fill="#e8262b" />
      <path d="M80 4 Q88 18 80 32 Q72 18 80 4 Z" fill="#f4c24f" stroke="#b8860b" strokeWidth="1.2" />
      <path d="M58 30 Q80 20 102 30 L98 38 Q80 30 62 38 Z" fill="#f4c24f" />
      <path d="M48 42 Q60 34 72 40 M88 40 Q100 34 112 42" stroke="#ffd34d" strokeWidth="6" strokeLinecap="round" fill="none" />
      <g className="fes-lion-eyes" style={{ transformOrigin: '80px 56px' }}>
        <ellipse cx="60" cy="56" rx="13" ry="12" fill="#fff" stroke="#2b2030" strokeWidth="2" />
        <ellipse cx="100" cy="56" rx="13" ry="12" fill="#fff" stroke="#2b2030" strokeWidth="2" />
        <circle cx="62" cy="58" r="6.5" fill="#1d1420" />
        <circle cx="102" cy="58" r="6.5" fill="#1d1420" />
        <circle cx="64" cy="55" r="2.2" fill="#fff" />
        <circle cx="104" cy="55" r="2.2" fill="#fff" />
      </g>
      <circle cx="44" cy="74" r="8" fill="#ff8fa3" opacity=".6" />
      <circle cx="116" cy="74" r="8" fill="#ff8fa3" opacity=".6" />
      <ellipse cx="80" cy="76" rx="15" ry="10" fill="#ff8fa3" stroke="#b8352f" strokeWidth="1.6" />
      <circle cx="74" cy="77" r="2.4" fill="#b8352f" />
      <circle cx="86" cy="77" r="2.4" fill="#b8352f" />
      <path d="M46 88 Q80 100 114 88" stroke="#7a1414" strokeWidth="3" fill="none" />
      <g className="fes-lion-jaw">
        <path d="M46 90 Q80 126 114 90 Q80 104 46 90 Z" fill="#c81e23" stroke="#7a1414" strokeWidth="1.6" />
        <path d="M54 94 L58 100 L62 96 L66 102 L70 97 L74 103 L78 98 L82 103 L86 98 L90 103 L94 97 L98 102 L102 96 L106 100" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
        {[56, 68, 80, 92, 104].map((x, i) => (
          <circle key={x} cx={x} cy={112 - Math.abs(i - 2) * 3} r="7" fill="#fff" />
        ))}
      </g>
      <g className="fes-lion-ears">
        <ellipse cx="34" cy="28" rx="10" ry="14" fill="#f4c24f" transform="rotate(-30 34 28)" />
        <ellipse cx="126" cy="28" rx="10" ry="14" fill="#f4c24f" transform="rotate(30 126 28)" />
      </g>
    </svg>
  )
}

function Firecrackers() {
  return (
    <svg viewBox="0 0 34 140" width="100%" aria-hidden="true">
      <path d="M17 0 V124" stroke="#8a5a00" strokeWidth="1.6" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(${i % 2 ? 3 : 15} ${6 + i * 13})`}>
          <rect width="14" height="11" rx="2" fill="#d81f1f" stroke="#8b0d0d" strokeWidth=".8" />
          <rect y="4.5" width="14" height="2.4" fill="#f4c24f" />
        </g>
      ))}
    </svg>
  )
}

function Ingot() {
  return (
    <svg viewBox="0 0 60 34" width="100%" aria-hidden="true">
      <path d="M4 18 Q30 36 56 18 Q52 10 44 12 Q38 2 30 2 Q22 2 16 12 Q8 10 4 18 Z" fill="#f4c24f" stroke="#b8860b" strokeWidth="1.5" />
      <path d="M18 14 Q30 6 42 14" stroke="#fff3c4" strokeWidth="2" fill="none" opacity=".8" />
    </svg>
  )
}

function LionDanceGround({ subtle }) {
  const full = !subtle
  return (
    <>
      <Hills back="#4a0b0e" front="#6e1216" line="#f4c24f" />
      {[10, 90].filter((x) => full || x === 10).map((x) => (
        <At key={x} x={x} b={48} w={34}>
          <Firecrackers />
          <span className="fes-pop" />
          <span className="fes-pop fes-pop-2" />
          <span className="fes-pop fes-pop-3" />
        </At>
      ))}
      {/* the lion's body cloth trails behind its head */}
      <At x={53} b={40} w={170} h={70} className="fes-hide-sm">
        <div className="fes-lion-body" />
      </At>
      <At x={42} b={40} w={140} className="fes-lion">
        <LionHead />
      </At>
      <At x={24} b={42} w={70}>
        <div style={{ position: 'relative' }}>
          <Ingot />
          <div style={{ position: 'absolute', left: '18%', bottom: '70%', width: '64%' }}>
            <Ingot />
          </div>
        </div>
      </At>
      {full &&
        [72, 76.5].map((x) => (
          <At key={x} x={x} b={42} w={26} className="fes-hide-sm">
            <span className="fes-orange" />
          </At>
        ))}
    </>
  )
}

/* ============================ วาเลนไทน์ — rose garden ============================ */

function Rose({ color = '#e11d48' }) {
  return (
    <svg viewBox="0 0 30 84" width="100%" aria-hidden="true">
      <path d="M15 84 Q12 58 15 30" stroke="#2e7d32" strokeWidth="3" fill="none" />
      <ellipse cx="10" cy="60" rx="6" ry="3" fill="#3f9b4c" transform="rotate(-30 10 60)" />
      <ellipse cx="20" cy="48" rx="6" ry="3" fill="#3f9b4c" transform="rotate(30 20 48)" />
      <ellipse cx="9" cy="24" rx="5" ry="8" fill={color} transform="rotate(-25 9 24)" />
      <ellipse cx="21" cy="24" rx="5" ry="8" fill={color} transform="rotate(25 21 24)" />
      <circle cx="15" cy="21" r="9" fill={color} />
      <path d="M15 21 m-5 0 a5 5 0 1 0 5 -5 a3 3 0 1 0 2.6 3.4" stroke="rgba(0,0,0,.28)" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function Tulip({ color = '#f472b6' }) {
  return (
    <svg viewBox="0 0 26 80" width="100%" aria-hidden="true">
      <path d="M13 80 Q14 56 13 28" stroke="#2e7d32" strokeWidth="2.6" fill="none" />
      <path d="M13 70 Q2 60 4 46 Q12 54 13 64" fill="#3f9b4c" />
      <path d="M5 20 Q5 34 13 34 Q21 34 21 20 L18 12 L13 18 L8 12 Z" fill={color} />
      <path d="M13 18 L13 33" stroke="rgba(0,0,0,.15)" strokeWidth="1.2" />
    </svg>
  )
}

function HeartBush() {
  const flowers = [[48, 30], [70, 26], [92, 30], [40, 50], [62, 48], [84, 50], [104, 46], [54, 68], [76, 70], [96, 64], [70, 88]]
  return (
    <svg viewBox="0 0 140 120" width="100%" aria-hidden="true">
      <rect x="64" y="104" width="12" height="16" fill="#6b4426" />
      <path d="M70 110 C30 84 14 62 18 40 C22 18 48 12 70 34 C92 12 118 18 122 40 C126 62 110 84 70 110 Z" fill="#2f7a46" />
      {[[40, 46], [60, 30], [86, 40], [100, 56], [54, 70], [80, 82], [70, 56]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill="#3a8f55" opacity=".7" />
      ))}
      {flowers.map(([x, y], i) => (
        <g key={i} className="fes-twinkle-soft" style={{ animationDelay: `${(i % 5) * 0.4}s` }}>
          <circle cx={x} cy={y} r="4.2" fill={i % 3 ? '#ff6b9a' : '#fff0f6'} />
          <circle cx={x} cy={y} r="1.6" fill="#ffd24d" />
        </g>
      ))}
    </svg>
  )
}

function Mailbox() {
  return (
    <svg viewBox="0 0 64 96" width="100%" aria-hidden="true">
      <rect x="28" y="44" width="8" height="52" fill="#6b4426" />
      <g className="fes-letter" style={{ transformOrigin: '22px 30px' }}>
        <rect x="10" y="14" width="26" height="18" rx="2" fill="#fff8f0" stroke="#e8c9b8" />
        <path d="M10 15 L23 25 L36 15" stroke="#e8c9b8" fill="none" />
        <path d="M23 29 C19 26 18 23 20 21.5 C21.5 20.5 23 21.5 23 23 C23 21.5 24.5 20.5 26 21.5 C28 23 27 26 23 29 Z" fill="#e11d48" />
      </g>
      <path d="M6 30 Q6 18 20 18 L44 18 Q58 18 58 30 L58 48 L6 48 Z" fill="#e23b4b" stroke="#9f1d2a" strokeWidth="1.6" />
      <path d="M6 30 Q6 20 18 20 Q30 20 30 30 L30 48 L6 48 Z" fill="#c81e2e" />
      <g className="fes-flag" style={{ transformOrigin: '54px 46px' }}>
        <rect x="52.5" y="26" width="3" height="20" fill="#6b4426" />
        <rect x="55.5" y="26" width="9" height="7" fill="#ffd24d" />
      </g>
    </svg>
  )
}

function GardenGround({ subtle }) {
  const full = !subtle
  const flowers = [
    { x: 9, k: 'rose', c: '#e11d48' },
    { x: 14, k: 'tulip', c: '#f472b6' },
    { x: 20, k: 'rose', c: '#fb7185', opt: true },
    { x: 27, k: 'tulip', c: '#c084fc' },
    { x: 33, k: 'rose', c: '#e11d48', opt: true },
    { x: 64, k: 'rose', c: '#fb7185' },
    { x: 70, k: 'tulip', c: '#f9a8d4', opt: true },
    { x: 77, k: 'rose', c: '#e11d48' },
    { x: 85, k: 'tulip', c: '#f472b6', opt: true },
    { x: 92, k: 'rose', c: '#be123c' },
  ].filter((f) => full || !f.opt)
  return (
    <>
      <Hills back="#2c6a41" front="#3b8552" />
      <At x={50} b={36} w={130}>
        <HeartBush />
      </At>
      {full && (
        <At x={39} b={38} w={52} className="fes-hide-sm">
          <Mailbox />
        </At>
      )}
      {flowers.map((f, i) => (
        <At key={f.x} x={f.x} b={34} w={f.k === 'rose' ? 26 : 22} className={f.opt ? 'fes-hide-sm' : ''}>
          <div className="fes-sway" style={{ animationDelay: `${-rand(i + 501) * 3}s`, animationDuration: `${3 + rand(i + 503) * 2}s` }}>
            {f.k === 'rose' ? <Rose color={f.c} /> : <Tulip color={f.c} />}
          </div>
        </At>
      ))}
      {Array.from({ length: subtle ? 4 : 9 }, (_, i) => (
        <span key={i} className="fes-heart-up" style={{ left: `${6 + rand(i + 511) * 88}%`, animationDelay: `${-rand(i + 513) * 5}s`, animationDuration: `${4 + rand(i + 515) * 3}s` }}>
          ♥
        </span>
      ))}
    </>
  )
}

/* ============================ สงกรานต์ — elephant splash ============================ */

function Elephant() {
  return (
    <svg viewBox="0 0 172 132" width="100%" aria-hidden="true" overflow="visible">
      <path d="M24 78 Q10 84 14 98" stroke="#8794a6" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[34, 52, 86, 102].map((x) => (
        <g key={x}>
          <rect x={x} y="94" width="17" height="34" rx="7" fill="#8f9cae" />
          <path d={`M${x + 3} 126 h11`} stroke="#eef2f7" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      <ellipse cx="72" cy="82" rx="52" ry="34" fill="#a2afc0" />
      <path d="M40 62 Q72 50 104 62 L100 74 Q72 64 44 74 Z" fill="#e23b4b" opacity=".85" />
      <path d="M44 70 Q72 60 100 70" stroke="#f4c24f" strokeWidth="2.5" fill="none" />
      <circle cx="118" cy="56" r="31" fill="#acb8c8" />
      <g className="fes-ele-ear" style={{ transformOrigin: '106px 52px' }}>
        <path d="M108 32 Q78 28 80 60 Q82 88 106 80 Z" fill="#bcc7d5" stroke="#8794a6" strokeWidth="1.5" />
        <path d="M104 40 Q88 40 89 60 Q90 76 104 72 Z" fill="#f2b8c6" opacity=".7" />
      </g>
      <path d="M112 28 L124 22 L130 32 Z" fill="#f4c24f" />
      <circle cx="122" cy="26" r="3" fill="#e23b4b" />
      <ellipse cx="129" cy="50" rx="3.6" ry="4.6" fill="#2b2030" />
      <circle cx="130.4" cy="48.4" r="1.3" fill="#fff" />
      <ellipse cx="124" cy="64" rx="6" ry="3.5" fill="#ff9db5" opacity=".6" />
      <path d="M136 72 Q150 78 152 69" stroke="#fffaf0" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <g className="fes-ele-trunk" style={{ transformOrigin: '140px 62px' }}>
        <path d="M140 62 Q160 66 162 46 Q164 28 154 18" stroke="#acb8c8" strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M146 60 Q152 58 154 52 M150 46 Q158 44 158 38" stroke="#8794a6" strokeWidth="1.5" fill="none" />
      </g>
    </svg>
  )
}

function SilverBowl() {
  return (
    <svg viewBox="0 0 80 46" width="100%" aria-hidden="true">
      <defs>
        <linearGradient id="fes-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f7fb" />
          <stop offset="55%" stopColor="#c3ccd8" />
          <stop offset="100%" stopColor="#8e9aab" />
        </linearGradient>
      </defs>
      <path d="M6 16 Q40 54 74 16 Z" fill="url(#fes-silver)" stroke="#8e9aab" strokeWidth="1.2" />
      <path d="M16 24 Q40 40 64 24" stroke="#8e9aab" strokeWidth="1" fill="none" strokeDasharray="3 3" />
      <ellipse cx="40" cy="16" rx="34" ry="6" fill="#dfe6ef" stroke="#8e9aab" />
      <ellipse cx="40" cy="16" rx="30" ry="4.2" fill="#7dd3fc" />
      {[[28, 15], [38, 14], [48, 16], [56, 14]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={i === 1 ? '#ffb020' : '#fffdf5'} />
      ))}
    </svg>
  )
}

function SongkranGround({ subtle }) {
  const full = !subtle
  return (
    <>
      <Hills back="#f2d59a" front="#e8c27a" />
      <div className="fes-pond">
        {Array.from({ length: subtle ? 4 : 8 }, (_, i) => (
          <span key={i} className="fes-ripple-ring" style={{ left: `${8 + rand(i + 601) * 84}%`, bottom: 8 + rand(i + 603) * 30, animationDelay: `${-rand(i + 605) * 3}s` }} />
        ))}
        {Array.from({ length: subtle ? 3 : 7 }, (_, i) => (
          <span key={`f${i}`} className="fes-float-flower" style={{ left: `${6 + rand(i + 611) * 88}%`, bottom: 10 + rand(i + 613) * 28, animationDelay: `${-rand(i + 615) * 4}s` }}>
            ✿
          </span>
        ))}
      </div>
      <At x={30} b={44} w={164} className="fes-elephant">
        <Elephant />
        <div className="fes-spray">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.11}s` }} />
          ))}
        </div>
        <span className="fes-splash" />
      </At>
      {full && (
        <At x={70} b={44} w={78} className="fes-hide-sm">
          <SilverBowl />
          <div className="fes-bowl-drops">
            <span />
            <span />
            <span />
          </div>
        </At>
      )}
    </>
  )
}

export const GROUNDS = {
  loykrathong: RiverGround,
  halloween: GraveyardGround,
  christmas: SnowGround,
  newyear: CityGround,
  chinesenewyear: LionDanceGround,
  valentine: GardenGround,
  songkran: SongkranGround,
}

// what clicking the ground does, per festival
export const BURSTS = {
  loykrathong: { kind: 'lantern' },
  halloween: { emojis: ['👻', '🦇', '🎃', '🕸️'], text: 'บู้!' },
  christmas: { emojis: ['❄️', '🎁', '⭐', '🍬'] },
  newyear: { kind: 'firework' },
  chinesenewyear: { emojis: ['🧧', '🧨', '🍊', '✨'], text: 'ซินเจียยู่อี่!' },
  valentine: { emojis: ['💖', '💕', '💘', '🌹'] },
  songkran: { emojis: ['💦', '💧', '🌸', '🐘'], text: 'สาดน้ำ!' },
}
