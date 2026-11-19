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

function Lanterns({ count = 6 }) {
  return Array.from({ length: count }, (_, i) => {
    const left = 6 + rand(i + 1) * 88
    const dur = 16 + rand(i + 3) * 12
    const delay = -rand(i + 7) * dur
    const scale = 0.7 + rand(i + 5) * 0.8
    return (
      <div
        key={i}
        className="fes-lantern"
        style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, transform: `scale(${scale})` }}
      >
        <span style={{ animationDuration: `${4 + rand(i + 2) * 3}s` }}>
          <i />
        </span>
      </div>
    )
  })
}

function Krathongs({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => {
    const dur = 26 + rand(i + 11) * 18
    const delay = -rand(i + 13) * dur
    const bottom = 2 + rand(i + 17) * 6
    const scale = 0.75 + rand(i + 19) * 0.7
    return (
      <div
        key={i}
        className="fes-krathong"
        style={{ bottom: `${bottom}vh`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, transform: `scale(${scale})` }}
      >
        <span>
          <span className="reflect" />
          <span className="leaf" />
          <span className="petal" />
          <span className="flame" />
        </span>
      </div>
    )
  })
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
  return (
    <>
      <div className="fes-moon" style={{ top: '9%', right: '11%' }} />
      <Lanterns count={subtle ? 3 : 7} />
      <Krathongs count={subtle ? 2 : 5} />
      <Twinkles count={subtle ? 8 : 18} />
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

export default function FestivalLayer() {
  const festival = useActiveFestival()
  const { pathname } = useLocation()
  if (festival === 'none' || !festival) return null
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
