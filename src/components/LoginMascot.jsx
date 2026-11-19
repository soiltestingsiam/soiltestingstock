// A festival mascot that peeks out from BEHIND the login card.
//  - Its eyes follow what you type (gaze prop: x,y in -1..1).
//  - While you type the password it covers its eyes with its paws (covering prop);
//    reveal the password and it peeks through / lowers its paws.
//  - Its colours, ears and festival hat change with the active festival.
// Purely decorative: pointer-events none, aria-hidden. Driven entirely by props from
// Login.jsx so it never touches auth logic.

// per-festival creature palette + ear style + hat
const MASCOT = {
  none: { body: '#6ea8ff', body2: '#4f86f0', belly: '#eaf2ff', inner: '#27489e', cheek: '#ff9db0', glow: 'rgba(90,150,255,.5)', ear: 'round', hat: 'none' },
  loykrathong: { body: '#f4a259', body2: '#e07b3a', belly: '#ffe9cf', inner: '#9a4d16', cheek: '#ff9db0', glow: 'rgba(255,160,60,.5)', ear: 'round', hat: 'flower' },
  halloween: { body: '#9b6ff0', body2: '#7c3aed', belly: '#ede9fe', inner: '#45149b', cheek: '#fca5a5', glow: 'rgba(168,85,247,.5)', ear: 'cat', hat: 'witch' },
  christmas: { body: '#c06a2a', body2: '#9a4d18', belly: '#f6e2c7', inner: '#5c2708', cheek: '#fca5a5', glow: 'rgba(226,59,75,.5)', ear: 'deer', hat: 'santa' },
  newyear: { body: '#8b93ff', body2: '#6366f1', belly: '#e7e9ff', inner: '#2f3496', cheek: '#fca5a5', glow: 'rgba(255,207,106,.5)', ear: 'round', hat: 'party' },
  chinesenewyear: { body: '#f6c453', body2: '#e0a52a', belly: '#fff2cf', inner: '#8a5c0f', cheek: '#ff9db0', glow: 'rgba(255,90,40,.5)', ear: 'round', hat: 'lantern' },
  valentine: { body: '#ff93b7', body2: '#f1618e', belly: '#ffe3ec', inner: '#b8355f', cheek: '#ff6f91', glow: 'rgba(255,90,140,.55)', ear: 'round', hat: 'heart' },
  songkran: { body: '#5ccbe6', body2: '#2ba7cd', belly: '#dbf6ff', inner: '#15728f', cheek: '#ff9db0', glow: 'rgba(60,200,245,.5)', ear: 'round', hat: 'flower2' },
}

// pupil travel radius (px in viewBox units)
const GR = 6

function Ears({ c }) {
  if (c.ear === 'cat') {
    return (
      <g>
        <path d="M58 58 L66 18 L96 46 Z" fill={c.body2} />
        <path d="M63 54 L69 29 L88 46 Z" fill={c.inner} opacity=".5" />
        <path d="M162 58 L154 18 L124 46 Z" fill={c.body2} />
        <path d="M157 54 L151 29 L132 46 Z" fill={c.inner} opacity=".5" />
      </g>
    )
  }
  if (c.ear === 'deer') {
    return (
      <g>
        {/* antlers */}
        <g stroke="#7a4a1e" strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M74 44 C66 24 60 18 52 12 M62 26 C54 24 50 20 46 16 M64 20 C60 14 58 10 58 4" />
          <path d="M146 44 C154 24 160 18 168 12 M158 26 C166 24 170 20 174 16 M156 20 C160 14 162 10 162 4" />
        </g>
        <ellipse cx="72" cy="54" rx="16" ry="19" fill={c.body2} />
        <ellipse cx="148" cy="54" rx="16" ry="19" fill={c.body2} />
        <ellipse cx="72" cy="56" rx="8" ry="11" fill={c.inner} opacity=".45" />
        <ellipse cx="148" cy="56" rx="8" ry="11" fill={c.inner} opacity=".45" />
      </g>
    )
  }
  // round (bear)
  return (
    <g>
      <circle cx="66" cy="50" r="22" fill={c.body2} />
      <circle cx="154" cy="50" r="22" fill={c.body2} />
      <circle cx="66" cy="50" r="11" fill={c.inner} opacity=".4" />
      <circle cx="154" cy="50" r="11" fill={c.inner} opacity=".4" />
    </g>
  )
}

function Hat({ c }) {
  switch (c.hat) {
    case 'santa':
      return (
        <g className="mascot-hat">
          <path d="M60 46 C92 6 128 6 160 46 C130 30 90 30 60 46 Z" fill="#e23b4b" />
          <path d="M56 44 Q110 30 164 44 L164 56 Q110 44 56 56 Z" fill="#fff" />
          <circle className="mascot-pompom" cx="110" cy="10" r="11" fill="#fff" />
        </g>
      )
    case 'witch':
      return (
        <g className="mascot-hat">
          <path d="M110 -6 L150 54 L70 54 Z" fill="#3b1d6e" />
          <ellipse cx="110" cy="54" rx="56" ry="11" fill="#2a1250" />
          <rect x="92" y="40" width="36" height="9" rx="3" fill="#fdba74" />
          <circle cx="110" cy="44" r="4" fill="#fde68a" />
        </g>
      )
    case 'party':
      return (
        <g className="mascot-hat">
          <path d="M110 -6 L138 50 L82 50 Z" fill="#6366f1" />
          <path d="M110 -6 L122 20 L98 32 Z" fill="#a855f7" opacity=".8" />
          <circle cx="94" cy="40" r="4" fill="#fde68a" />
          <circle cx="122" cy="30" r="4" fill="#f472b6" />
          <circle className="mascot-pompom" cx="110" cy="-8" r="8" fill="#fde68a" />
        </g>
      )
    case 'lantern':
      return (
        <g className="mascot-hat mascot-swing" style={{ transformOrigin: '110px -2px' }}>
          <line x1="110" y1="-14" x2="110" y2="6" stroke="#b8860b" strokeWidth="3" />
          <ellipse cx="110" cy="22" rx="20" ry="24" fill="#e23b4b" stroke="#ffd24d" strokeWidth="3" />
          <rect x="96" y="2" width="28" height="6" rx="2" fill="#ffd24d" />
          <rect x="96" y="38" width="28" height="6" rx="2" fill="#ffd24d" />
          <line x1="110" y1="46" x2="110" y2="58" stroke="#ffd24d" strokeWidth="3" />
        </g>
      )
    case 'heart':
      return (
        <g className="mascot-hat mascot-pulse" style={{ transformOrigin: '110px 20px' }}>
          <path d="M110 44 C86 24 88 2 104 6 C110 7 110 14 110 16 C110 14 110 7 116 6 C132 2 134 24 110 44 Z" fill="#ff3b6e" stroke="#fff" strokeWidth="2" />
        </g>
      )
    case 'flower':
      return (
        <g className="mascot-hat mascot-spin" style={{ transformOrigin: '110px 24px' }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="110" cy="10" rx="8" ry="14" fill="#ffb3d1" transform={`rotate(${a} 110 24)`} />
          ))}
          <circle cx="110" cy="24" r="9" fill="#ffd24d" />
        </g>
      )
    case 'flower2':
      return (
        <g className="mascot-hat mascot-spin" style={{ transformOrigin: '110px 24px' }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="110" cy="9" rx="7" ry="13" fill="#ffffff" transform={`rotate(${a} 110 24)`} />
          ))}
          <circle cx="110" cy="24" r="8" fill="#ffd24d" />
        </g>
      )
    default:
      return null
  }
}

export default function LoginMascot({ festival = 'none', gaze = { x: 0, y: 0 }, covering = false }) {
  const c = MASCOT[festival] || MASCOT.none
  const px = Math.max(-1, Math.min(1, gaze.x)) * GR
  const py = Math.max(-1, Math.min(1, gaze.y)) * (GR * 0.7)

  return (
    <div className={`login-mascot ${covering ? 'covering' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 220 260" width="100%" height="100%">
        <defs>
          <radialGradient id={`mg-${festival}`} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.body2} />
          </radialGradient>
        </defs>

        {/* glow aura */}
        <circle className="mascot-aura" cx="110" cy="96" r="92" fill={c.glow} />

        <g className="mascot-bob">
          <Ears c={c} />
          <Hat c={c} />

          {/* head */}
          <ellipse cx="110" cy="100" rx="78" ry="72" fill={`url(#mg-${festival})`} />
          {/* muzzle / belly patch */}
          <ellipse cx="110" cy="120" rx="46" ry="38" fill={c.belly} opacity=".9" />

          {/* cheeks */}
          <ellipse cx="60" cy="118" rx="12" ry="8" fill={c.cheek} opacity=".65" />
          <ellipse cx="160" cy="118" rx="12" ry="8" fill={c.cheek} opacity=".65" />

          {/* eyes */}
          <g className="mascot-eye">
            <ellipse cx="82" cy="98" rx="17" ry="19" fill="#fff" />
            <g style={{ transform: `translate(${px}px, ${py}px)` }}>
              <circle cx="82" cy="100" r="9" fill={c.inner} />
              <circle cx="85" cy="96" r="3" fill="#fff" />
            </g>
          </g>
          <g className="mascot-eye">
            <ellipse cx="138" cy="98" rx="17" ry="19" fill="#fff" />
            <g style={{ transform: `translate(${px}px, ${py}px)` }}>
              <circle cx="138" cy="100" r="9" fill={c.inner} />
              <circle cx="141" cy="96" r="3" fill="#fff" />
            </g>
          </g>

          {/* nose + mouth */}
          <ellipse cx="110" cy="120" rx="7" ry="5" fill={c.inner} />
          <path d="M110 125 Q110 134 101 134 M110 125 Q110 134 119 134" stroke={c.inner} strokeWidth="2.4" fill="none" strokeLinecap="round" />

          {/* paws — tucked behind the card at rest, rise up to cover the eyes when
              typing the password (translated up via CSS on .covering) */}
          <g className="mascot-arm mascot-arm-left">
            <rect x="69" y="210" width="28" height="96" rx="14" fill={c.body2} />
            <ellipse cx="83" cy="212" rx="23" ry="20" fill={c.body} />
            <ellipse cx="83" cy="212" rx="12" ry="10" fill={c.belly} opacity=".85" />
          </g>
          <g className="mascot-arm mascot-arm-right">
            <rect x="123" y="210" width="28" height="96" rx="14" fill={c.body2} />
            <ellipse cx="137" cy="212" rx="23" ry="20" fill={c.body} />
            <ellipse cx="137" cy="212" rx="12" ry="10" fill={c.belly} opacity=".85" />
          </g>
        </g>
      </svg>
    </div>
  )
}
