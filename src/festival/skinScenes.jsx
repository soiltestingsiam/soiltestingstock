// The festival, re-imagined for each personal theme ("skin"). Looked up by
// SKIN_SCENES[festival][skin]; any pair not listed falls back to the classic scene plus
// the skin's light DRESSING (SKIN_DRESSING), so every combination always has a scene.
//
//   ลอยกระทง × japanese = 灯籠流し Tōrō nagashi — square wooden lanterns drifting under a
//                          red arched bridge, a torii on the bank, fireflies, maple leaves
//   ลอยกระทง × cyber    = Holo-Lantern Festival — holographic lanterns on a digital river
//   ลอยกระทง × minimal  = Golden Lanterns — a few warm gold lights, still water, one line
//   สงกรานต์ × japanese = 夏祭り — fūrin wind chimes, a bamboo fence, a dripping tsukubai
//   ปีใหม่ × japanese   = お正月 — kadomatsu, a temple bell, raked zen gravel
//
// Same building blocks and CSS layers as grounds.jsx (pointer-events none on the decor;
// the ground strip itself is clickable). `subtle` = the lighter login-page version.

import { rand, Fireflies, Twinkles, LoyMoon } from './parts'

function Place({ x, b = 0, w, className = '', style, children }) {
  return (
    <div className={`fes-at ${className}`} style={{ left: `${x}%`, bottom: b, width: w, ...style }}>
      {children}
    </div>
  )
}

/* ================================ 灯籠流し Tōrō nagashi ================================ */

function Toro() {
  return (
    <svg viewBox="0 0 40 54" width="100%" aria-hidden="true" overflow="visible">
      <defs>
        <radialGradient id="toro-glow" cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset=".55" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="30" rx="26" ry="20" fill="#ffb84d" opacity=".22" className="toro-halo" />
      <path d="M6 12 L20 4 L34 12 Z" fill="#3b2516" />
      <rect x="9" y="12" width="22" height="26" fill="url(#toro-glow)" />
      <path d="M9 12 V38 M31 12 V38 M9 25 H31" stroke="#5a3a22" strokeWidth="2" />
      <path d="M15 16 V22 M15 27 V33 M25 16 V22" stroke="#b45309" strokeWidth="1.2" opacity=".6" />
      <rect x="5" y="38" width="30" height="5" rx="1.5" fill="#4a2e1a" />
    </svg>
  )
}

function TaikoBridge() {
  return (
    <svg viewBox="0 0 260 96" width="100%" aria-hidden="true">
      {[30, 70, 190, 230].map((x) => (
        <rect key={x} x={x - 3} y={x < 130 ? 58 - (x - 30) * 0.3 : 58 - (230 - x) * 0.3} width="6" height="40" fill="#7a1020" />
      ))}
      <path d="M0 78 Q130 6 260 78 L260 88 Q130 18 0 88 Z" fill="#c8102e" />
      <path d="M0 64 Q130 -8 260 64" stroke="#1f1310" strokeWidth="4" fill="none" />
      {Array.from({ length: 11 }, (_, i) => {
        const x = 12 + i * 23.6
        const t = x / 260
        const y = 64 - Math.sin(t * Math.PI) * 36
        return <rect key={i} x={x - 2} y={y} width="4" height="15" fill="#c8102e" />
      })}
      {[60, 130, 200].map((x) => {
        const y = 64 - Math.sin((x / 260) * Math.PI) * 36
        return <circle key={x} cx={x} cy={y - 3} r="3.5" fill="#d4a017" />
      })}
    </svg>
  )
}

export function Torii({ color = '#c8102e' }) {
  return (
    <svg viewBox="0 0 120 120" width="100%" aria-hidden="true">
      <rect x="24" y="30" width="10" height="90" fill={color} />
      <rect x="86" y="30" width="10" height="90" fill={color} />
      <rect x="21" y="112" width="16" height="8" fill="#1f1310" />
      <rect x="83" y="112" width="16" height="8" fill="#1f1310" />
      <path d="M2 14 Q60 22 118 14 L114 26 Q60 32 6 26 Z" fill="#1f1310" />
      <path d="M8 26 Q60 31 112 26 L110 33 Q60 38 10 33 Z" fill={color} />
      <rect x="14" y="46" width="92" height="8" fill={color} />
      <rect x="56" y="33" width="8" height="13" fill={color} />
    </svg>
  )
}

function Pine({ flip }) {
  return (
    <svg viewBox="0 0 90 120" width="100%" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M40 120 Q46 80 34 56 Q50 70 52 120 Z" fill="#3b2516" />
      {[
        [38, 30, 30, 11],
        [58, 46, 26, 10],
        [26, 54, 22, 9],
        [44, 72, 28, 10],
      ].map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={i % 2 ? '#1f4d36' : '#25593f'} />
      ))}
    </svg>
  )
}

function DriftingLanterns({ count, Lantern, w = 34, className = 'toro-drift', bottomBase = 22 }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={className}
      style={{
        bottom: bottomBase + (i % 3) * 13,
        width: w - (i % 3) * 5,
        animationDuration: `${46 + rand(i + 1201) * 30}s`,
        animationDelay: `${-rand(i + 1203) * 70}s`,
        zIndex: 6 - (i % 3),
      }}
    >
      <span className="toro-bob" style={{ animationDelay: `${-rand(i + 1205) * 3}s` }}>
        <Lantern i={i} />
      </span>
      <span className="toro-reflect" />
    </span>
  ))
}

function ToroNagashiGround({ subtle }) {
  return (
    <>
      <div className="jp-water" />
      <Place x={8} b={52} w={92} className="fes-hide-sm">
        <Pine />
      </Place>
      <Place x={91} b={48} w={118}>
        <Torii />
      </Place>
      <Place x={38} b={40} w={subtle ? 200 : 260}>
        <TaikoBridge />
      </Place>
      <DriftingLanterns count={subtle ? 4 : 8} Lantern={Toro} w={46} />
      <div className="fes-fireflies-low">
        <Fireflies count={subtle ? 4 : 9} />
      </div>
    </>
  )
}

/* ================================ Holo-Lantern Festival ================================ */

function HoloLantern({ i = 0 }) {
  const c = i % 2 ? '#d946ef' : '#22d3ee'
  return (
    <svg viewBox="0 0 40 52" width="100%" aria-hidden="true" overflow="visible" className="holo-flicker" style={{ animationDelay: `${-i * 0.37}s` }}>
      <path d="M20 2 L36 20 L20 46 L4 20 Z" fill={`${c}22`} stroke={c} strokeWidth="1.6" />
      <path d="M4 20 H36 M20 2 V46 M12 11 L28 33 M28 11 L12 33" stroke={c} strokeWidth=".7" opacity=".55" />
      <circle cx="20" cy="22" r="4" fill={c} opacity=".9" />
      <ellipse cx="20" cy="24" rx="22" ry="22" fill={c} opacity=".12" />
    </svg>
  )
}

function NeonSkyline() {
  const blocks = [
    [0, 40, 26], [30, 62, 22], [56, 34, 30], [90, 74, 18], [112, 46, 28], [144, 58, 24], [172, 30, 34], [210, 66, 20], [234, 42, 30],
  ]
  return (
    <svg viewBox="0 0 270 80" width="100%" aria-hidden="true">
      {blocks.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={80 - h} width={w} height={h} fill="#070a1a" stroke={i % 2 ? '#d946ef' : '#22d3ee'} strokeWidth=".8" strokeOpacity=".7" />
          {Array.from({ length: Math.floor(h / 10) }, (_, r) =>
            Array.from({ length: Math.floor(w / 8) }, (_, c) =>
              (r + c + i) % 3 ? null : <rect key={`${r}-${c}`} x={x + 3 + c * 8} y={80 - h + 4 + r * 10} width="3" height="3" fill={(r + i) % 2 ? '#22d3ee' : '#f0abfc'} opacity=".8" />,
            ),
          )}
        </g>
      ))}
    </svg>
  )
}

function HoloLanternGround({ subtle }) {
  return (
    <>
      <Place x={50} b={46} w={subtle ? 420 : 620} className="cy-skyline">
        <NeonSkyline />
      </Place>
      <div className="cy-water" />
      <DriftingLanterns count={subtle ? 5 : 9} Lantern={HoloLantern} w={42} className="toro-drift holo" />
    </>
  )
}

/* ================================ Golden Lanterns (minimal) ================================ */

function GoldLantern() {
  return (
    <svg viewBox="0 0 30 30" width="100%" aria-hidden="true" overflow="visible">
      <circle cx="15" cy="15" r="14" fill="#d4af37" opacity=".12" />
      <circle cx="15" cy="15" r="6.5" fill="url(#gold-lantern)" />
      <defs>
        <radialGradient id="gold-lantern">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset=".6" stopColor="#f0d27a" />
          <stop offset="1" stopColor="#c89b2c" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function MinimalLanternGround({ subtle }) {
  return (
    <>
      <div className="mn-water" />
      <div className="mn-horizon" />
      <DriftingLanterns count={subtle ? 3 : 6} Lantern={GoldLantern} w={38} className="toro-drift slow" bottomBase={24} />
    </>
  )
}

/* ================================ 夏祭り fūrin (songkran × japanese) ================================ */

function Furin({ i }) {
  const fish = i % 2 ? '#e11d48' : '#2563eb'
  return (
    <svg viewBox="0 0 30 90" width="100%" aria-hidden="true">
      <path d="M15 0 V14" stroke="#7c5a3a" strokeWidth="1" />
      <path d="M3 30 Q3 12 15 12 Q27 12 27 30 Z" fill="rgba(224,242,254,.85)" stroke="#93c5fd" strokeWidth="1" />
      <path d="M9 22 q3 -3 6 0 q-3 3 -6 0 Z M15 22 l3 -2 v4 Z" fill={fish} />
      <path d="M15 30 V44" stroke="#7c5a3a" strokeWidth="1" />
      <circle cx="15" cy="32" r="1.6" fill="#64748b" />
      <rect x="10" y="44" width="10" height="30" rx="1" fill={i % 3 ? '#fde68a' : '#fecdd3'} />
      <path d="M13 50 V68 M17 50 V64" stroke="#92400e" strokeWidth=".8" opacity=".5" />
    </svg>
  )
}

function Tsukubai() {
  return (
    <svg viewBox="0 0 90 70" width="100%" aria-hidden="true" overflow="visible">
      <path d="M8 28 L60 12" stroke="#5b7c3a" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="62" cy="48" rx="26" ry="18" fill="#6b7280" />
      <ellipse cx="62" cy="40" rx="20" ry="7" fill="#1e3a5f" />
      {[0, 1, 2].map((k) => (
        <circle key={k} className="tsukubai-drop" cx="58" cy="16" r="2" fill="#bae6fd" style={{ animationDelay: `${k * 0.45}s` }} />
      ))}
    </svg>
  )
}

function FurinGround({ subtle }) {
  return (
    <>
      <div className="jp-bamboo-fence" />
      <div className="jp-beam" />
      {(subtle ? [14, 34, 66, 86] : [10, 22, 34, 46, 58, 70, 82, 94]).map((x, i) => (
        <Place key={x} x={x} b={56} w={26} className={i % 2 ? 'fes-hide-sm' : ''}>
          <div className="furin-sway" style={{ animationDelay: `${-rand(i + 1301) * 3}s`, animationDuration: `${2.6 + rand(i + 1303) * 1.6}s` }}>
            <Furin i={i} />
          </div>
        </Place>
      ))}
      <Place x={50} b={6} w={100}>
        <Tsukubai />
      </Place>
      {Array.from({ length: subtle ? 4 : 8 }, (_, i) => (
        <span key={i} className="fes-heart-up jp-petal-up" style={{ left: `${6 + rand(i + 1311) * 88}%`, animationDelay: `${-rand(i + 1313) * 5}s` }}>
          ❀
        </span>
      ))}
    </>
  )
}

/* ================================ お正月 kadomatsu (newyear × japanese) ================================ */

function Kadomatsu() {
  return (
    <svg viewBox="0 0 70 120" width="100%" aria-hidden="true">
      {[
        [22, 18],
        [35, 4],
        [48, 24],
      ].map(([x, top], i) => (
        <g key={i}>
          <rect x={x - 6} y={top + 6} width="12" height={110 - top} fill={i === 1 ? '#3f8f4f' : '#4aa05b'} />
          <path d={`M${x - 6} ${top + 12} L${x + 6} ${top} L${x + 6} ${top + 8} Z`} fill="#d9f99d" />
          <path d={`M${x - 6} ${top + 40} H${x + 6}`} stroke="#2f6d3a" strokeWidth="1.5" />
        </g>
      ))}
      <ellipse cx="14" cy="76" rx="14" ry="8" fill="#1f5c37" />
      <ellipse cx="56" cy="74" rx="14" ry="8" fill="#1f5c37" />
      <rect x="6" y="84" width="58" height="36" rx="4" fill="#c9a66b" />
      {[92, 102, 112].map((y) => (
        <path key={y} d={`M6 ${y} H64`} stroke="#7c5a2b" strokeWidth="2" />
      ))}
      <circle cx="12" cy="80" r="3" fill="#dc2626" />
      <circle cx="58" cy="78" r="3" fill="#dc2626" />
    </svg>
  )
}

function TempleBell() {
  return (
    <svg viewBox="0 0 140 120" width="100%" aria-hidden="true" overflow="visible">
      <rect x="10" y="10" width="10" height="110" fill="#3b2516" />
      <rect x="120" y="10" width="10" height="110" fill="#3b2516" />
      <path d="M0 6 Q70 -6 140 6 L136 16 Q70 6 4 16 Z" fill="#1f1310" />
      <rect x="10" y="16" width="120" height="7" fill="#5a3a22" />
      <g className="bell-swing" style={{ transformOrigin: '70px 23px' }}>
        <path d="M70 23 V30" stroke="#1f1310" strokeWidth="3" />
        <path d="M48 92 Q48 32 70 30 Q92 32 92 92 Z" fill="#4d5a45" stroke="#2f3a2a" strokeWidth="2" />
        <path d="M48 92 H92" stroke="#2f3a2a" strokeWidth="5" />
        {[48, 60].map((y) => (
          <path key={y} d={`M52 ${y} H88`} stroke="#3b4636" strokeWidth="2" />
        ))}
      </g>
      <g className="bell-log" style={{ transformOrigin: '20px 60px' }}>
        <path d="M20 60 H44" stroke="#8b5a2b" strokeWidth="6" strokeLinecap="round" />
      </g>
      {[0, 1].map((k) => (
        <circle key={k} className="bell-ring" cx="70" cy="64" r="20" fill="none" stroke="#fde68a" strokeWidth="1.4" style={{ animationDelay: `${k * 1.6}s` }} />
      ))}
    </svg>
  )
}

function KadomatsuGround({ subtle }) {
  return (
    <>
      <div className="jp-gravel" />
      <Place x={12} b={18} w={70}>
        <Kadomatsu />
      </Place>
      <Place x={88} b={18} w={70}>
        <Kadomatsu />
      </Place>
      <Place x={50} b={18} w={subtle ? 110 : 140}>
        <TempleBell />
      </Place>
    </>
  )
}

/* ================================ skies & ambients for the ลอยกระทง variants ================================ */

function Chochin({ count }) {
  return (
    <div className="jp-chochin" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 5) * 0.4}s` }}>
          <svg viewBox="0 0 20 30" width="16" height="24">
            <rect x="6" y="0" width="8" height="3" fill="#1f1310" />
            <ellipse cx="10" cy="15" rx="9" ry="12" fill={i % 2 ? '#fff4e0' : '#c8102e'} />
            <path d="M2 11 H18 M1.5 15 H18.5 M2 19 H18" stroke={i % 2 ? '#c8102e' : '#7a1020'} strokeWidth=".7" opacity=".6" />
            <rect x="6" y="26" width="8" height="3" fill="#1f1310" />
          </svg>
        </span>
      ))}
    </div>
  )
}

function MomijiFall({ count }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className="fes-flower-fall"
      style={{ left: `${rand(i + 1401) * 100}%`, animationDuration: `${11 + rand(i + 1403) * 9}s`, animationDelay: `${-rand(i + 1405) * 18}s` }}
    >
      <svg viewBox="0 0 24 24" width={12 + Math.round(rand(i + 1407) * 8)} height={12 + Math.round(rand(i + 1407) * 8)} aria-hidden="true">
        <path
          d="M12 1 L13.6 7 L18 3.6 L16.6 9 L22.6 8.4 L18 12.6 L22 16.6 L16 15.6 L15 21 L12 17 L9 21 L8 15.6 L2 16.6 L6 12.6 L1.4 8.4 L7.4 9 L6 3.6 L10.4 7 Z"
          fill={['#dc2626', '#ea580c', '#f59e0b'][i % 3]}
        />
        <path d="M12 17 V23" stroke="#7c2d12" strokeWidth="1" />
      </svg>
    </span>
  ))
}

function RisingDots({ count, className }) {
  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={className}
      style={{ left: `${4 + rand(i + 1501) * 92}%`, animationDuration: `${16 + rand(i + 1503) * 14}s`, animationDelay: `${-rand(i + 1505) * 26}s` }}
    />
  ))
}

const LOY_JP_SKY = ({ subtle }) => (
  <>
    <Chochin count={subtle ? 12 : 22} />
    <LoyMoon style={subtle ? { top: '4%', left: '6%', width: 140, height: 140 } : { top: 84, right: '6%', width: 160, height: 160 }} />
    <Twinkles count={subtle ? 6 : 12} colors={['#fff7e6', '#ffd27f']} />
  </>
)
const LOY_JP_AMBIENT = ({ subtle }) => (
  <>
    <MomijiFall count={subtle ? 6 : 12} />
    <Fireflies count={subtle ? 3 : 6} />
  </>
)
const LOY_CY_SKY = ({ subtle }) => (
  <>
    <div className="cy-moon" style={subtle ? { top: '6%', left: '7%' } : { top: 90, right: '7%' }} />
    <div className="fes-garland cy-lights" aria-hidden="true">
      {Array.from({ length: subtle ? 12 : 22 }, (_, i) => (
        <span key={i} style={{ '--c': i % 2 ? '#d946ef' : '#22d3ee', animationDelay: `${(i % 6) * 0.3}s` }} />
      ))}
    </div>
  </>
)
const LOY_CY_AMBIENT = ({ subtle }) => <RisingDots count={subtle ? 6 : 12} className="cy-holo-rise" />
const LOY_MN_SKY = ({ subtle }) => (
  <div className="mn-moon" style={subtle ? { top: '7%', left: '8%' } : { top: 96, right: '9%' }} aria-hidden="true">
    <svg viewBox="0 0 60 60" width="100%">
      <path d="M40 8 A24 24 0 1 0 52 44 A20 20 0 1 1 40 8 Z" fill="none" stroke="#d4af37" strokeWidth="1.4" />
    </svg>
  </div>
)
const LOY_MN_AMBIENT = ({ subtle }) => <RisingDots count={subtle ? 4 : 8} className="mn-dust-rise" />

/* ================================ the matrix ================================ */

// ลอยกระทง × Geotech Classic: the classic river of banana-leaf lotus krathongs and candle
// light stays (ground + the theme's soil strata), and the sky adds slow, warm gold
// fireworks over the full moon.
const LOY_GEO_SKY = ({ subtle }) => (
  <>
    <Twinkles count={subtle ? 8 : 18} colors={['#ffffff', '#ffe29a']} />
    <LoyMoon style={subtle ? { top: '4%', left: '6%', width: 150, height: 150 } : { top: 84, right: '6%', width: 170, height: 170 }} />
    {Array.from({ length: subtle ? 2 : 4 }, (_, i) => (
      <span
        key={i}
        className="fes-firework geo-gold-firework"
        style={{ top: `${10 + rand(i + 41) * 30}%`, left: `${10 + rand(i + 43) * 60}%`, color: ['#ffd27f', '#f5b942', '#ffe7a8', '#e9a23b'][i % 4], animationDuration: `${3.6 + rand(i + 45) * 2}s`, animationDelay: `${-rand(i + 47) * 4}s` }}
      />
    ))}
  </>
)

export const SKIN_SCENES = {
  loykrathong: {
    geotech_classic: { Sky: LOY_GEO_SKY },
    japanese: { Ground: ToroNagashiGround, Sky: LOY_JP_SKY, Ambient: LOY_JP_AMBIENT, burst: { emojis: ['🏮', '✨', '🌕', '🍁'], text: '灯籠' } },
    cyber: { Ground: HoloLanternGround, Sky: LOY_CY_SKY, Ambient: LOY_CY_AMBIENT, burst: { emojis: ['💠', '🔷', '✨', '🌐'], text: 'HOLO' } },
    minimal: { Ground: MinimalLanternGround, Sky: LOY_MN_SKY, Ambient: LOY_MN_AMBIENT, burst: { emojis: ['✨', '🕯️', '⭐'] } },
  },
  songkran: {
    japanese: { Ground: FurinGround, burst: { emojis: ['🎐', '🌸', '💧', '✨'], text: 'ちりん' } },
  },
  newyear: {
    japanese: { Ground: KadomatsuGround, burst: { emojis: ['🎍', '🔔', '✨', '🎆'], text: '謹賀新年' } },
  },
}

// the skin's light touch on any festival without its own design
function JapaneseDressing() {
  return (
    <>
      <div className="jp-seigaiha" />
      <Place x={95} b={40} w={70} className="dress-torii fes-hide-sm">
        <Torii />
      </Place>
    </>
  )
}
const CyberDressing = () => <div className="cy-floor" />
const MinimalDressing = () => <div className="mn-horizon dress" />
// Geotech Classic: thin soil strata and survey stakes under every festival scene — the
// company's own signature (subtle; the festival stays the star)
function GeotechDressing() {
  return (
    <>
      <div className="geo-strata" />
      {[6, 34, 66, 94].map((x, i) => (
        <span key={x} className={`geo-stake ${i % 2 ? 'fes-hide-sm' : ''}`} style={{ left: `${x}%` }} />
      ))}
    </>
  )
}
export const SKIN_DRESSING = { geotech_classic: GeotechDressing, japanese: JapaneseDressing, cyber: CyberDressing, minimal: MinimalDressing }
