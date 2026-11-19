import { useId } from 'react'
import { mix } from './petData'

// A chibi cat / dog drawn in SVG. One sprite for every place the pet appears:
//  - pose 'walk' : full body (legs walk, tail wags) — the companion on every page
//  - pose 'peek' : head + paws only — the login mascot peeking over the card. Rendered
//    as two layers so the head sits BEHIND the card and the paws grip OVER its edge
//    (layer 'back' / 'front').
// Eyes follow --gx / --gy (CSS vars in -1..1 set by the parent, no re-render needed).
// The coat decides colours + pattern; `outfit` maps slot → item id.

const INK = '#2b2030'

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

const heart = (cx, cy, s) =>
  `M${cx} ${cy + s * 0.95} C${cx - s * 1.7} ${cy - s * 0.1} ${cx - s * 0.95} ${cy - s * 1.35} ${cx} ${cy - s * 0.42} C${cx + s * 0.95} ${cy - s * 1.35} ${cx + s * 1.7} ${cy - s * 0.1} ${cx} ${cy + s * 0.95} Z`

// point on a quadratic bezier
const qpt = (p0, p1, p2, t) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
]

const CAT_HEAD =
  'M100 41 C134 41 158 60 158 88 C158 104 152 116 144 124 Q153 128 151 133 Q141 133 134 130 C124 136 112 139 100 139 C88 139 76 136 66 130 Q59 133 49 133 Q47 128 56 124 C48 116 42 104 42 88 C42 60 66 41 100 41 Z'

function HeadShape({ isCat, ...props }) {
  return isCat ? <path d={CAT_HEAD} {...props} /> : <ellipse cx="100" cy="90" rx="57" ry="50" {...props} />
}

/* ------------------------------ accessories ------------------------------ */

function HeadItem({ id, u }) {
  switch (id) {
    case 'santa':
      return (
        <g>
          <path d="M64 52 Q70 20 104 12 Q140 6 158 30 L150 36 Q138 22 122 26 Q132 38 136 52 Z" fill={`url(#red-${u})`} />
          <rect x="58" y="44" width="84" height="14" rx="7" fill="#fff" />
          <circle className="pet-pompom" cx="155" cy="36" r="8.5" fill="#fff" style={{ transformOrigin: '150px 32px' }} />
        </g>
      )
    case 'heart-band':
      return (
        <g>
          <path d="M56 62 Q100 22 144 62" stroke="#ff4d84" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M84 40 L80 22 M116 40 L120 22" stroke="#ff4d84" strokeWidth="2.5" strokeLinecap="round" />
          <g className="pet-bob" style={{ transformOrigin: '100px 20px' }}>
            <path d={heart(80, 16, 9)} fill="#ff3b6e" stroke="#fff" strokeWidth="1.6" />
            <path d={heart(120, 16, 9)} fill="#ff3b6e" stroke="#fff" strokeWidth="1.6" />
          </g>
        </g>
      )
    case 'mandarin':
      return (
        <g>
          <path d="M62 58 Q62 26 100 24 Q138 26 138 58 Q100 50 62 58 Z" fill={`url(#red-${u})`} />
          <path d="M62 58 Q100 50 138 58 L138 51 Q100 43 62 51 Z" fill="#f4c24f" />
          <path d="M84 32 Q100 26 116 32" stroke="#f4c24f" strokeWidth="2" fill="none" opacity=".7" />
          <circle cx="100" cy="22" r="6.5" fill="#f4c24f" stroke="#b8860b" strokeWidth="1.5" />
        </g>
      )
    case 'flower-ear':
      return (
        <g className="pet-sway" style={{ transformOrigin: '136px 50px' }}>
          <path d="M122 58 Q114 48 119 40 Q127 48 122 58 Z" fill="#3fae5a" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="136" cy="38" rx="7.5" ry="12" fill="#ff5a7a" transform={`rotate(${a} 136 50)`} />
          ))}
          <circle cx="136" cy="50" r="4.8" fill="#ffd24d" />
        </g>
      )
    case 'witch':
      return (
        <g>
          <path d="M74 52 Q90 24 106 -2 Q113 -8 114 2 Q116 28 128 52 Z" fill={`url(#purple-${u})`} />
          <ellipse cx="100" cy="52" rx="55" ry="9" fill="#2a1250" />
          <rect x="80" y="42" width="44" height="7" rx="3" fill="#f97316" />
          <rect x="97.5" y="40.5" width="9" height="9.5" rx="1.5" fill="none" stroke="#fde68a" strokeWidth="2" />
        </g>
      )
    case 'flower-crown': {
      const P0 = [58, 56], P1 = [100, 30], P2 = [142, 56]
      const cols = ['#ff9ec3', '#ffd24d', '#ffffff', '#ff9ec3', '#ffd24d', '#ffffff', '#ff9ec3']
      return (
        <g>
          <path d="M58 56 Q100 30 142 56" stroke="#3fae5a" strokeWidth="3.5" fill="none" />
          {cols.map((col, i) => {
            const [x, y] = qpt(P0, P1, P2, 0.08 + i * 0.14)
            return (
              <g key={i}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <circle key={a} cx={x} cy={y - 4.2} r="3.6" fill={col} transform={`rotate(${a} ${x} ${y})`} />
                ))}
                <circle cx={x} cy={y} r="2.4" fill={col === '#ffd24d' ? '#fb923c' : '#f59e0b'} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'party':
      return (
        <g transform="rotate(-12 100 48)">
          <path d="M82 48 L100 2 L118 48 Z" fill={`url(#party-${u})`} />
          <path d="M91.4 24 L108.6 24 M86.7 36 L113.3 36" stroke="#fde68a" strokeWidth="3" />
          <circle className="pet-pompom" cx="100" cy="2" r="6" fill="#fde68a" style={{ transformOrigin: '100px 8px' }} />
        </g>
      )
    case 'bow':
      return (
        <g transform="rotate(-18 70 50)">
          <path d="M70 50 L55 39 Q50 50 55 61 Z" fill="#ff4d84" />
          <path d="M70 50 L85 39 Q90 50 85 61 Z" fill="#ff4d84" />
          <circle cx="70" cy="50" r="4.6" fill="#e11d63" />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M70 52 L72 24 L86 38 L100 14 L114 38 L128 24 L130 52 Z" fill={`url(#gold-${u})`} stroke="#b8860b" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="70" y="46" width="60" height="7" fill="#d4a017" />
          <circle cx="100" cy="15" r="3.6" fill="#ef4444" />
          <circle cx="72" cy="24" r="3" fill="#38bdf8" />
          <circle cx="128" cy="24" r="3" fill="#38bdf8" />
          <circle cx="100" cy="49.5" r="3" fill="#22c55e" />
        </g>
      )
    case 'tophat':
      return (
        <g transform="rotate(8 100 46)">
          <rect x="78" y="2" width="44" height="42" rx="5" fill="#1f1f29" />
          <rect x="78" y="32" width="44" height="7" fill="#e23b4b" />
          <ellipse cx="100" cy="45" rx="34" ry="7" fill="#15151d" />
          <rect x="83" y="5" width="6" height="25" rx="3" fill="#fff" opacity=".13" />
        </g>
      )
    default:
      return null
  }
}

function FaceItem({ id, L, R }) {
  if (id === 'glasses') {
    return (
      <g fill="rgba(255,255,255,.12)" stroke="#3b2a20" strokeWidth="3">
        <circle cx={L[0]} cy={L[1]} r="18.5" />
        <circle cx={R[0]} cy={R[1]} r="18.5" />
        <path d={`M${L[0] + 18} ${L[1] - 2} Q100 ${L[1] - 9} ${R[0] - 18} ${R[1] - 2}`} fill="none" />
      </g>
    )
  }
  if (id === 'shades') {
    return (
      <g>
        <ellipse cx={L[0]} cy={L[1] + 1} rx="19" ry="14" fill="#16161f" />
        <ellipse cx={R[0]} cy={R[1] + 1} rx="19" ry="14" fill="#16161f" />
        <path d={`M${L[0] + 17} ${L[1] - 4} Q100 ${L[1] - 10} ${R[0] - 17} ${R[1] - 4}`} stroke="#16161f" strokeWidth="4" fill="none" />
        <path d={`M${L[0] - 10} ${L[1] - 4} Q${L[0] - 4} ${L[1] - 9} ${L[0] + 4} ${L[1] - 8}`} stroke="#fff" strokeWidth="2.5" opacity=".55" fill="none" strokeLinecap="round" />
        <path d={`M${R[0] - 10} ${R[1] - 4} Q${R[0] - 4} ${R[1] - 9} ${R[0] + 4} ${R[1] - 8}`} stroke="#fff" strokeWidth="2.5" opacity=".55" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  return null
}

const COLLAR = 'M64 133 Q100 153 136 133'

function NeckItem({ id, u }) {
  switch (id) {
    case 'xmas-scarf':
      return (
        <g>
          <path d={COLLAR} stroke="#dc2626" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d={COLLAR} stroke="#fff" strokeWidth="12" fill="none" strokeDasharray="5 9" opacity=".9" />
          <g transform="rotate(10 120 144)">
            <rect x="113" y="140" width="15" height="28" rx="4" fill="#dc2626" />
            <path d="M113 150 H128 M113 159 H128" stroke="#fff" strokeWidth="3" />
          </g>
        </g>
      )
    case 'pink-bowtie':
      return (
        <g>
          <path d={COLLAR} stroke="#ff8fb3" strokeWidth="4" fill="none" />
          <path d="M100 146 L83 135 L83 157 Z M100 146 L117 135 L117 157 Z" fill="#ff5c93" />
          <circle cx="100" cy="146" r="4.8" fill="#e11d63" />
        </g>
      )
    case 'lucky-knot':
      return (
        <g>
          <path d={COLLAR} stroke="#dc2626" strokeWidth="6" fill="none" />
          <path d="M100 143 V152" stroke="#dc2626" strokeWidth="2.5" />
          <circle cx="100" cy="160" r="8.5" fill={`url(#gold-${u})`} stroke="#b8860b" strokeWidth="1.5" />
          <rect x="97.5" y="157.5" width="5" height="5" fill="#8a5a00" />
          <path d="M96 169 L94 180 M100 169 V182 M104 169 L106 180" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'garland': {
      const P0 = [62, 131], P1 = [100, 162], P2 = [138, 131]
      return (
        <g>
          <path d="M62 131 Q100 162 138 131" stroke="#3fae5a" strokeWidth="2" fill="none" />
          {Array.from({ length: 13 }, (_, i) => {
            const [x, y] = qpt(P0, P1, P2, i / 12)
            return <circle key={i} cx={x} cy={y} r="3.4" fill="#fffdf5" stroke="#e8e2c8" strokeWidth=".8" />
          })}
          <circle cx="100" cy="149" r="6.5" fill="#e23b4b" />
          <circle cx="100" cy="149" r="2.6" fill="#ffd24d" />
          <path d="M97 155 L95 170 M100 156 V172 M103 155 L105 170" stroke="#ffd24d" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    }
    case 'pumpkin':
      return (
        <g>
          <path d={COLLAR} stroke="#f97316" strokeWidth="7" fill="none" />
          <path d={COLLAR} stroke="#1f1530" strokeWidth="7" fill="none" strokeDasharray="4 6" />
          <path d="M100 146 V150" stroke="#3fae5a" strokeWidth="2.5" />
          <ellipse cx="100" cy="157" rx="9" ry="7.5" fill="#f97316" />
          <path d="M95 151 Q93 157 95 163 M105 151 Q107 157 105 163" stroke="#c2410c" strokeWidth="1.5" fill="none" />
        </g>
      )
    case 'gold-necklace':
      return (
        <g>
          <path d={COLLAR} stroke="#f4c24f" strokeWidth="3.5" fill="none" strokeDasharray="2 2.2" />
          <path d="M100 145 L107 153 L100 163 L93 153 Z" fill={`url(#gold-${u})`} stroke="#b8860b" strokeWidth="1.2" />
          <circle cx="100" cy="153" r="2.4" fill="#ef4444" />
        </g>
      )
    case 'gold-bowtie':
      return (
        <g>
          <path d={COLLAR} stroke="#f4c24f" strokeWidth="3.5" fill="none" />
          <path d="M100 146 L83 135 L83 157 Z M100 146 L117 135 L117 157 Z" fill={`url(#gold-${u})`} stroke="#b8860b" strokeWidth="1" />
          <circle cx="100" cy="146" r="4.6" fill="#b8860b" />
        </g>
      )
    case 'bell':
      return (
        <g>
          <path d={COLLAR} stroke="#e23b4b" strokeWidth="7" fill="none" />
          <circle cx="100" cy="151" r="7.5" fill={`url(#gold-${u})`} stroke="#b8860b" strokeWidth="1.3" />
          <path d="M94 151 H106" stroke="#8a5a00" strokeWidth="1.4" />
          <circle cx="100" cy="155" r="1.6" fill="#8a5a00" />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <path d={COLLAR} stroke="#3b82f6" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d={COLLAR} stroke="#93c5fd" strokeWidth="13" fill="none" strokeDasharray="3 7" opacity=".7" />
          <g transform="rotate(-12 78 144)">
            <rect x="71" y="140" width="15" height="30" rx="4" fill="#3b82f6" />
            <path d="M71 165 H86" stroke="#93c5fd" strokeWidth="3" />
          </g>
        </g>
      )
    case 'diamond':
      return (
        <g>
          <path d={COLLAR} stroke="#cbd5e1" strokeWidth="5" fill="none" />
          <path d="M92 150 L100 144 L108 150 L100 162 Z" fill="#a5f3fc" stroke="#38bdf8" strokeWidth="1.3" />
          <path d="M92 150 H108 M100 144 V162" stroke="#fff" strokeWidth=".9" opacity=".8" />
          <circle cx="104" cy="146" r="1.4" fill="#fff" />
        </g>
      )
    default:
      return null
  }
}

function BackItem({ id }) {
  if (id !== 'wings') return null
  const wing = 'M62 134 C30 110 12 124 18 142 C28 140 32 148 26 158 C40 156 48 162 46 172 C58 162 66 148 62 134 Z'
  // the flap animation lives on the path; the mirror lives on a wrapper so they don't clash
  const one = <path className="pet-wing" d={wing} fill="#ffffff" stroke="#bfdbfe" strokeWidth="2" style={{ transformOrigin: '62px 136px' }} />
  return (
    <g>
      {one}
      <g transform="matrix(-1 0 0 1 200 0)">{one}</g>
    </g>
  )
}

function AuraItem({ id, u }) {
  if (id === 'goldaura') {
    return (
      <g>
        <circle cx="100" cy="112" r="98" fill={`url(#aura-${u})`} />
        <g className="pet-aura-spin" style={{ transformOrigin: '100px 112px' }}>
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M100 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#fde68a" transform={`rotate(${a} 100 112)`} />
          ))}
        </g>
      </g>
    )
  }
  if (id === 'rainbow') {
    const cols = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa']
    return (
      <g className="pet-aura-spin" style={{ transformOrigin: '100px 112px' }} opacity=".55">
        {cols.map((c, i) => (
          <circle key={c} cx="100" cy="112" r={96 - i * 5} fill="none" stroke={c} strokeWidth="4.5" strokeDasharray="38 10" />
        ))}
      </g>
    )
  }
  return null
}

/* ---------------------------------- eye ---------------------------------- */

function Eye({ cx, cy, rx, ry, side, u, isCat, ring }) {
  return (
    <g className="pet-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
      <g clipPath={`url(#eye${side}-${u})`}>
        <g className="pet-iris" style={{ transform: 'translate(calc(var(--gx, 0) * 4.6px), calc(var(--gy, 0) * 4.2px))' }}>
          <circle cx={cx} cy={cy + 1} r={isCat ? 11.6 : 12.6} fill={`url(#iris${side}-${u})`} />
          {isCat ? <ellipse cx={cx} cy={cy + 1} rx="4.1" ry="8.6" fill="#17111c" /> : <circle cx={cx} cy={cy + 1} r="7.4" fill="#17111c" />}
          {ring && <circle cx={cx} cy={cy + 1} r={isCat ? 10.8 : 11.8} fill="none" stroke={ring} strokeWidth="1.8" opacity=".9" />}
        </g>
        <ellipse cx={cx} cy={cy + ry - 2} rx={rx} ry="5" fill="#000" opacity=".06" />
      </g>
      <circle cx={cx - 4.6} cy={cy - 5.6} r="4.3" fill="#fff" />
      <circle cx={cx + 4.2} cy={cy + 5.2} r="1.9" fill="#fff" opacity=".9" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth="2.2" />
      <path d={`M${cx - rx - 1} ${cy - 2} Q${cx} ${cy - ry - 7} ${cx + rx + 1} ${cy - 2}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {isCat && (
        <path
          d={side === 'L' ? `M${cx - rx + 1} ${cy - 7} l-6 -4` : `M${cx + rx - 1} ${cy - 7} l6 -4`}
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

/* --------------------------------- sprite -------------------------------- */

export default function PetSprite({
  species = 'cat',
  coat,
  outfit = {},
  pose = 'walk',
  layer = 'all',
  happy = false,
  walking = false,
  className = '',
  style,
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '')
  const isCat = species !== 'dog'
  const c = coat
  const headBase = c.pattern === 'beagle' ? c.pc : c.base
  const hi = mix(headBase, '#ffffff', 0.4)
  const outline = mix(c.shade, '#000000', 0.38)
  const darkFur = lum(c.base) < 0.4
  const darkMuzzle = lum(c.belly) < 0.45
  const feat = darkMuzzle ? '#d9d2df' : INK
  const whisker = darkFur && !c.belly.startsWith('#fff') ? 'rgba(255,255,255,.55)' : 'rgba(70,50,55,.38)'
  const L = isCat ? [76, 92] : [78, 90]
  const R = isCat ? [124, 92] : [122, 90]
  const erx = isCat ? 15 : 14
  const ery = isCat ? 16.5 : 15
  const earIn = darkFur ? '#d97a92' : '#ffb3c6'
  const legFill = c.pattern === 'points' ? c.pc : c.base
  const showBack = layer !== 'front'
  const showFront = layer !== 'back'

  const defs = (
    <defs>
      <radialGradient id={`head-${u}`} cx="42%" cy="32%" r="72%">
        <stop offset="0%" stopColor={hi} />
        <stop offset="55%" stopColor={headBase} />
        <stop offset="100%" stopColor={c.pattern === 'beagle' ? mix(c.pc, '#000', 0.2) : c.shade} />
      </radialGradient>
      <radialGradient id={`body-${u}`} cx="45%" cy="30%" r="75%">
        <stop offset="0%" stopColor={mix(c.base, '#ffffff', 0.3)} />
        <stop offset="60%" stopColor={c.base} />
        <stop offset="100%" stopColor={c.shade} />
      </radialGradient>
      {['L', 'R'].map((s) => {
        const iris = s === 'R' && c.eye2 ? c.eye2 : c.eye
        return (
          <radialGradient key={s} id={`iris${s}-${u}`} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={mix(iris, '#ffffff', 0.5)} />
            <stop offset="55%" stopColor={iris} />
            <stop offset="100%" stopColor={mix(iris, '#000000', 0.35)} />
          </radialGradient>
        )
      })}
      <clipPath id={`eyeL-${u}`}>
        <ellipse cx={L[0]} cy={L[1]} rx={erx} ry={ery} />
      </clipPath>
      <clipPath id={`eyeR-${u}`}>
        <ellipse cx={R[0]} cy={R[1]} rx={erx} ry={ery} />
      </clipPath>
      <clipPath id={`hc-${u}`}>
        <HeadShape isCat={isCat} />
      </clipPath>
      <clipPath id={`bc-${u}`}>
        <ellipse cx="100" cy="160" rx="40" ry="32" />
      </clipPath>
      <clipPath id={`arm-${u}`}>
        <rect x="0" y="-40" width="200" height="191" />
      </clipPath>
      <linearGradient id={`red-${u}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f4e" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <linearGradient id={`purple-${u}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6d28d9" />
        <stop offset="100%" stopColor="#3b1d6e" />
      </linearGradient>
      <linearGradient id={`gold-${u}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="60%" stopColor="#f4c24f" />
        <stop offset="100%" stopColor="#c99212" />
      </linearGradient>
      <linearGradient id={`party-${u}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
      <linearGradient id={`jear-${u}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe08a" />
        <stop offset="26%" stopColor={c.pc || '#f2b93b'} />
        <stop offset="42%" stopColor={headBase} />
        <stop offset="100%" stopColor={c.shade} />
      </linearGradient>
      <linearGradient id={`gem-${u}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff6c9" />
        <stop offset="50%" stopColor="#f6c453" />
        <stop offset="100%" stopColor="#c9881a" />
      </linearGradient>
      <radialGradient id={`aura-${u}`}>
        <stop offset="0%" stopColor="rgba(255,214,102,.55)" />
        <stop offset="70%" stopColor="rgba(255,214,102,.14)" />
        <stop offset="100%" stopColor="rgba(255,214,102,0)" />
      </radialGradient>
    </defs>
  )

  /* ---- ears ---- */
  const jewel = c.pattern === 'jewel'
  const catEarL = jewel ? `url(#jear-${u})` : c.pattern === 'points' || c.pattern === 'calico' ? c.pc : headBase
  const catEarR = jewel ? `url(#jear-${u})` : c.pattern === 'points' ? c.pc : c.pattern === 'calico' ? c.pc2 : headBase
  const earsBefore = isCat ? (
    <g>
      <path d="M50 76 L54 24 Q57 15 65 20 L96 50 Z" fill={catEarL} stroke={outline} strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 76 L146 24 Q143 15 135 20 L104 50 Z" fill={catEarR} stroke={outline} strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" />
      <path d="M58 66 L60 32 Q62 27 66 30 L86 52 Z" fill={earIn} />
      <path d="M142 66 L140 32 Q138 27 134 30 L114 52 Z" fill={earIn} />
    </g>
  ) : c.ear === 'pointy' ? (
    <g>
      <path d="M50 80 L56 30 Q60 20 70 26 L98 52 Z" fill={c.pattern === 'bangkaew' ? c.pc : headBase} stroke={outline} strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 80 L144 30 Q140 20 130 26 L102 52 Z" fill={c.pattern === 'bangkaew' ? c.pc : headBase} stroke={outline} strokeOpacity=".45" strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 70 L63 38 Q65 32 70 36 L88 54 Z" fill={earIn} />
      <path d="M140 70 L137 38 Q135 32 130 36 L112 54 Z" fill={earIn} />
    </g>
  ) : null
  const floppy = !isCat && c.ear !== 'pointy' && (
    <g>
      <path className="pet-ear-l" d="M60 52 C38 50 26 78 32 108 C35 122 50 124 58 112 C63 96 66 70 60 52 Z" fill={c.earC || c.shade} stroke={outline} strokeOpacity=".4" strokeWidth="2" style={{ transformOrigin: '58px 54px' }} />
      <path className="pet-ear-r" d="M140 52 C162 50 174 78 168 108 C165 122 150 124 142 112 C137 96 134 70 140 52 Z" fill={c.earC || c.shade} stroke={outline} strokeOpacity=".4" strokeWidth="2" style={{ transformOrigin: '142px 54px' }} />
    </g>
  )

  /* ---- head pattern (clipped to the head) ---- */
  let pattern = null
  const p = c.pattern
  if (p === 'tabby' || p === 'tabby-soft') {
    pattern = (
      <g stroke={c.pc} strokeWidth="4.6" strokeLinecap="round" fill="none" opacity={p === 'tabby' ? 0.85 : 0.5}>
        <path d="M87 48 Q89 58 87 67 M100 44 V66 M113 48 Q111 58 113 67" />
        <path d="M43 94 L58 97 M44 103 L58 104 M157 94 L142 97 M156 103 L142 104" />
      </g>
    )
  } else if (p === 'calico') {
    pattern = (
      <g>
        <path d="M40 58 C52 38 84 34 94 50 C88 66 70 76 44 88 Z" fill={c.pc} />
        <path d="M160 62 C150 42 122 36 110 48 C116 60 134 68 160 82 Z" fill={c.pc2} />
      </g>
    )
  } else if (p === 'tuxedo') {
    pattern = <path d="M100 58 L91 102 Q100 108 109 102 Z" fill={c.belly} />
  } else if (p === 'points') {
    pattern = <ellipse cx="100" cy="112" rx="38" ry="28" fill={c.pc} opacity=".5" />
  } else if (p === 'silver') {
    pattern = <ellipse cx="88" cy="58" rx="42" ry="20" fill="#fff" opacity=".18" />
  } else if (p === 'shiba') {
    pattern = (
      <g fill={c.belly}>
        <ellipse cx="68" cy="113" rx="19" ry="15" />
        <ellipse cx="132" cy="113" rx="19" ry="15" />
        <ellipse cx="83" cy="73" rx="5" ry="3.6" />
        <ellipse cx="117" cy="73" rx="5" ry="3.6" />
      </g>
    )
  } else if (p === 'tan') {
    pattern = (
      <g fill={c.belly}>
        <ellipse cx="83" cy="72" rx="5.5" ry="4" />
        <ellipse cx="117" cy="72" rx="5.5" ry="4" />
      </g>
    )
  } else if (p === 'beagle') {
    pattern = <path d="M100 44 L93 100 Q100 105 107 100 Z" fill={c.base} />
  } else if (p === 'spots') {
    pattern = (
      <g fill={c.pc}>
        <circle cx="68" cy="66" r="5" />
        <circle cx="130" cy="60" r="4" />
        <circle cx="142" cy="98" r="3.6" />
        <circle cx="58" cy="102" r="3" />
        <circle cx="111" cy="50" r="3" />
      </g>
    )
  } else if (p === 'husky') {
    pattern = (
      <g fill={c.belly}>
        <ellipse cx="100" cy="114" rx="46" ry="30" />
        <path d="M100 58 L94 92 L106 92 Z" />
        <ellipse cx="83" cy="73" rx="8" ry="4.5" />
        <ellipse cx="117" cy="73" rx="8" ry="4.5" />
      </g>
    )
  } else if (p === 'ridge') {
    pattern = <ellipse cx="100" cy="116" rx="30" ry="22" fill={c.pc} opacity=".55" />
  } else if (p === 'bangkaew') {
    pattern = <ellipse cx="77" cy="86" rx="21" ry="19" fill={c.pc} opacity=".92" />
  } else if (p === 'jewel') {
    pattern = (
      <g>
        <ellipse cx="100" cy="132" rx="70" ry="26" fill="#b9b0ea" opacity=".28" />
        <ellipse cx="86" cy="56" rx="40" ry="16" fill="#fff" opacity=".55" />
      </g>
    )
  }
  const jewelMarks = jewel && (
    <g>
      <path d="M100 51 L106 60 L100 70 L94 60 Z" fill={`url(#gem-${u})`} stroke="#b7791f" strokeWidth="1" />
      <path d="M97.5 57 L100 53.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
      <path className="pet-twinkle" d="M55 99 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="#fde68a" style={{ transformOrigin: '55px 104px' }} />
      <path className="pet-twinkle pet-twinkle-2" d="M145 99 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="#fde68a" style={{ transformOrigin: '145px 104px' }} />
    </g>
  )

  /* ---- body pattern (walk pose) ---- */
  let bodyPattern = null
  if (p === 'tabby' || p === 'tabby-soft') {
    bodyPattern = (
      <g stroke={c.pc} strokeWidth="4.6" strokeLinecap="round" fill="none" opacity={p === 'tabby' ? 0.8 : 0.45}>
        <path d="M66 146 Q72 158 66 170 M134 146 Q128 158 134 170 M76 136 Q80 144 76 152 M124 136 Q120 144 124 152" />
      </g>
    )
  } else if (p === 'calico') {
    bodyPattern = (
      <g>
        <ellipse cx="76" cy="148" rx="17" ry="13" fill={c.pc} />
        <ellipse cx="126" cy="170" rx="11" ry="9" fill={c.pc2} />
      </g>
    )
  } else if (p === 'tuxedo') {
    bodyPattern = <ellipse cx="100" cy="158" rx="26" ry="27" fill={c.belly} />
  } else if (p === 'beagle') {
    bodyPattern = <path d="M58 146 Q100 126 142 146 L142 158 Q100 140 58 158 Z" fill={c.pc2} />
  } else if (p === 'spots') {
    bodyPattern = (
      <g fill={c.pc}>
        <circle cx="72" cy="150" r="4.5" />
        <circle cx="128" cy="146" r="4" />
        <circle cx="118" cy="176" r="3.6" />
        <circle cx="80" cy="176" r="3" />
      </g>
    )
  } else if (p === 'ridge') {
    bodyPattern = <path d="M100 129 V150" stroke={c.pc} strokeWidth="5" strokeLinecap="round" strokeDasharray="3 3" />
  } else if (p === 'bangkaew') {
    bodyPattern = <ellipse cx="122" cy="150" rx="15" ry="11" fill={c.pc} />
  }

  const muzzle = isCat ? (
    <g fill={c.belly}>
      <circle cx="91" cy="117" r="11.5" />
      <circle cx="109" cy="117" r="11.5" />
    </g>
  ) : (
    <ellipse cx="100" cy="117" rx="27" ry="19" fill={c.belly} />
  )

  const eyes = happy ? (
    <g stroke={INK} strokeWidth="3.8" fill="none" strokeLinecap="round">
      <path d={`M${L[0] - 11} ${L[1] + 3} Q${L[0]} ${L[1] - 10} ${L[0] + 11} ${L[1] + 3}`} />
      <path d={`M${R[0] - 11} ${R[1] + 3} Q${R[0]} ${R[1] - 10} ${R[0] + 11} ${R[1] + 3}`} />
    </g>
  ) : (
    <g>
      <Eye cx={L[0]} cy={L[1]} rx={erx} ry={ery} side="L" u={u} isCat={isCat} ring={c.irisRing} />
      <Eye cx={R[0]} cy={R[1]} rx={erx} ry={ery} side="R" u={u} isCat={isCat} ring={c.irisRing} />
    </g>
  )

  const noseMouth = isCat ? (
    <g>
      <path d="M94 108 Q100 104 106 108 Q104 113 100 114 Q96 113 94 108 Z" fill="#ff8fab" />
      <path d="M100 114 V118.5 M100 118.5 Q96 123.5 91 120.5 M100 118.5 Q104 123.5 109 120.5" stroke={feat} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g stroke={whisker} strokeWidth="1.6" strokeLinecap="round">
        <path d="M80 114 L53 109 M80 118 L51 119 M81 122 L55 129 M120 114 L147 109 M120 118 L149 119 M119 122 L145 129" />
      </g>
    </g>
  ) : (
    <g>
      <ellipse cx="100" cy="109" rx="9.8" ry="7" fill="#2a2228" />
      <ellipse cx="97" cy="106" rx="3.2" ry="1.9" fill="#fff" opacity=".55" />
      <path d="M100 116 V121 M100 121 Q94 128 87 123 M100 121 Q106 128 113 123" stroke={feat} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {(happy || walking) && <path d="M95 124.5 Q100 137 105 124.5 Z" fill="#ff7a95" />}
    </g>
  )

  const outfitHead = outfit.head && <HeadItem id={outfit.head} u={u} />
  const outfitFace = outfit.face && <FaceItem id={outfit.face} L={L} R={R} />
  const outfitNeck = outfit.neck && <NeckItem id={outfit.neck} u={u} />
  const outfitBack = outfit.back && <BackItem id={outfit.back} />
  const outfitAura = outfit.aura && <AuraItem id={outfit.aura} u={u} />

  const head = (
    <g>
      {earsBefore}
      <HeadShape isCat={isCat} fill={`url(#head-${u})`} stroke={outline} strokeOpacity=".5" strokeWidth="2.2" />
      <g clipPath={`url(#hc-${u})`}>{pattern}</g>
      {muzzle}
      <ellipse cx={isCat ? 60 : 62} cy="110" rx="9" ry="5" fill="#ff8fb0" opacity=".5" />
      <ellipse cx={isCat ? 140 : 138} cy="110" rx="9" ry="5" fill="#ff8fb0" opacity=".5" />
      {jewelMarks}
      {eyes}
      {noseMouth}
      {floppy}
      {outfitFace}
      {outfitHead}
    </g>
  )

  const svgProps = {
    viewBox: '0 -20 200 230',
    width: '100%',
    height: '100%',
    className: `pet-sprite ${walking ? 'is-walking' : ''} ${className}`,
    style,
    'aria-hidden': true,
    overflow: 'visible',
  }

  if (pose === 'peek') {
    // paws rest on the card edge (y≈150) and lift up to cover the eyes
    // the clip stays put (card edge) while the arm inside it lifts, so a raised paw
    // shows an arm reaching up from behind the card
    const paw = (cx, cls) => (
      <g>
        <g clipPath={`url(#arm-${u})`}>
          <g className={cls} style={{ transformOrigin: `${cx}px 150px` }}>
            <rect x={cx - 12} y="150" width="24" height="80" rx="12" fill={legFill} stroke={outline} strokeOpacity=".35" strokeWidth="1.6" />
          </g>
        </g>
        <g className={cls} style={{ transformOrigin: `${cx}px 150px` }}>
          <ellipse cx={cx} cy="150" rx="17.5" ry="13" fill={`url(#body-${u})`} stroke={outline} strokeOpacity=".45" strokeWidth="2" />
          <path d={`M${cx - 5.5} 139.5 V146 M${cx + 5.5} 139.5 V146`} stroke={outline} strokeOpacity=".5" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
    )
    return (
      <svg {...svgProps}>
        {defs}
        {showBack && (
          <g>
            {outfitAura}
            {outfitBack}
            {outfitNeck}
            {head}
          </g>
        )}
        {showFront && (
          <g>
            {paw(74, 'pet-lift-l')}
            {paw(126, 'pet-lift-r')}
          </g>
        )}
      </svg>
    )
  }

  // walk pose — full body
  const leg = (x, y, h, fill, cls, ox) => (
    <g className={`pet-leg ${cls}`} style={{ transformOrigin: `${ox}px ${y}px` }}>
      <rect x={x} y={y} width="18" height={h} rx="9" fill={fill} stroke={outline} strokeOpacity=".35" strokeWidth="1.6" />
      <ellipse cx={x + 9} cy={y + h - 3} rx="10" ry="5.5" fill={mix(fill, '#ffffff', 0.35)} />
    </g>
  )
  return (
    <svg {...svgProps}>
      {defs}
      <ellipse className="pet-shadow" cx="100" cy="203" rx="44" ry="6.5" fill="rgba(0,0,0,.22)" />
      {outfitAura}
      {outfitBack}
      <path
        className={isCat ? 'pet-tail-cat' : 'pet-tail-dog'}
        d={isCat ? 'M134 164 C162 162 174 134 162 108' : 'M134 156 Q154 150 158 128'}
        stroke={c.pattern === 'points' ? c.pc : c.base}
        strokeWidth={isCat ? 11 : 10}
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: isCat ? '134px 164px' : '134px 156px' }}
      />
      {leg(62, 166, 28, mix(legFill, '#000000', 0.08), 'pet-leg-b', 71)}
      {leg(120, 166, 28, mix(legFill, '#000000', 0.08), 'pet-leg-a', 129)}
      <ellipse cx="100" cy="160" rx="40" ry="32" fill={`url(#body-${u})`} stroke={outline} strokeOpacity=".45" strokeWidth="2" />
      <ellipse cx="100" cy="168" rx="23" ry="21" fill={c.belly} />
      <g clipPath={`url(#bc-${u})`}>{bodyPattern}</g>
      {leg(78, 172, 28, legFill, 'pet-leg-a', 87)}
      {leg(104, 172, 28, legFill, 'pet-leg-b', 113)}
      {outfitNeck}
      {head}
    </svg>
  )
}
