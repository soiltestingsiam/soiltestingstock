import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2, FlaskConical, Award, ShieldCheck, Boxes, ChevronRight } from 'lucide-react'
import SealLogo from '../components/SealLogo'
import WebStandardsModal from '../components/WebStandardsModal'
import LoginMascot from '../components/LoginMascot'
import FxBoundary from '../components/FxBoundary'
import { usePureWork } from '../store/useSpectacleStore'
import { useAuthStore } from '../store/useAuthStore'
import { useFestivalStore, useActiveFestival } from '../store/useFestivalStore'

// Work out where the mascot should look from the caret position in a field: it measures
// the pixel width of the text up to the caret and maps it across the field → the eyes
// sweep left-to-right as you type. Returns gaze {x,y} in roughly -1..1.
let _measureCtx = null
function caretGaze(el) {
  try {
    const start = el.selectionStart ?? el.value.length
    if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d')
    const cs = getComputedStyle(el)
    _measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`
    const text = el.type === 'password' ? '•'.repeat(start) : el.value.slice(0, start)
    const w = _measureCtx.measureText(text).width
    const padL = parseFloat(cs.paddingLeft) || 0
    const inner = el.clientWidth - padL - (parseFloat(cs.paddingRight) || 0)
    const frac = inner > 0 ? Math.min(1, Math.max(0, w / inner)) : 0
    return { x: (frac * 2 - 1) * 0.82, y: 0.55 }
  } catch {
    return { x: 0, y: 0.4 }
  }
}

// A branded login experience: an animated hero that auto-plays the company story
// (chapters fade through on their own), with a readable dark-glass sign-in card. The
// base is a deep-blue hero; when a festival is active the whole hero shifts to that
// festival's colour tone (background, aurora, grid, accents, button + card glow) while
// staying dark + legible. The sign-in card itself stays dark glass in every theme.

// Per-festival login palettes. `none` is the default deep blue.
const LOGIN_THEMES = {
  none: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #123a7a 0%, #0c2554 38%, #081734 70%, #060f22 100%)',
    blobs: ['#2563eb', '#0ea5e9', '#6366f1'],
    grid: 'rgba(130,180,255,.5)',
    accent: '#bae6fd',
    btnFrom: '#2563eb', btnTo: '#4f46e5',
    glow: ['#3b82f6', '#22d3ee', '#6366f1', '#ffd76a'],
    card: 'linear-gradient(160deg, rgba(20,38,74,.72), rgba(10,20,44,.72))',
  },
  loykrathong: {
    // moonlit river night, golden krathong lights
    bg: 'radial-gradient(130% 120% at 15% 0%, #2c3c8f 0%, #1b2563 38%, #111840 70%, #090d27 100%)',
    blobs: ['#f59e0b', '#f472b6', '#6366f1'],
    grid: 'rgba(255,214,150,.30)',
    accent: '#ffd9a0',
    btnFrom: '#f59e0b', btnTo: '#e8590c',
    glow: ['#fbbf24', '#fb923c', '#f472b6', '#fde68a'],
    card: 'linear-gradient(160deg, rgba(30,40,96,.74), rgba(13,18,50,.78))',
    shine: 'linear-gradient(100deg, #fff4dc 0%, #fcd34d 30%, #fbcfe8 50%, #fde68a 72%, #ffffff 100%)',
  },
  halloween: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #2a0f4a 0%, #1c0a38 38%, #140826 70%, #0c0518 100%)',
    blobs: ['#f97316', '#7c3aed', '#a855f7'],
    grid: 'rgba(200,150,255,.4)',
    accent: '#fdba74',
    btnFrom: '#f97316', btnTo: '#7c3aed',
    glow: ['#f97316', '#a855f7', '#7c3aed', '#fdba74'],
    card: 'linear-gradient(160deg, rgba(42,16,74,.74), rgba(22,10,40,.74))',
    shine: 'linear-gradient(100deg, #ffe8d1 0%, #fdba74 28%, #c4b5fd 50%, #fb923c 74%, #ffffff 100%)',
  },
  christmas: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #0b3a24 0%, #0a2a1b 38%, #081f14 70%, #06160e 100%)',
    blobs: ['#ef4444', '#22c55e', '#16a34a'],
    grid: 'rgba(150,230,180,.4)',
    accent: '#fca5a5',
    btnFrom: '#dc2626', btnTo: '#16a34a',
    glow: ['#ef4444', '#22c55e', '#16a34a', '#fca5a5'],
    card: 'linear-gradient(160deg, rgba(12,45,30,.76), rgba(8,28,18,.76))',
    shine: 'linear-gradient(100deg, #ffffff 0%, #86efac 28%, #fca5a5 50%, #bbf7d0 74%, #ffffff 100%)',
  },
  newyear: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #1a1a52 0%, #12123a 38%, #0c0c28 70%, #070718 100%)',
    blobs: ['#fbbf24', '#a855f7', '#6366f1'],
    grid: 'rgba(190,180,255,.4)',
    accent: '#fde68a',
    btnFrom: '#eab308', btnTo: '#7c3aed',
    glow: ['#fbbf24', '#a855f7', '#6366f1', '#fde68a'],
    card: 'linear-gradient(160deg, rgba(26,26,70,.74), rgba(12,12,34,.74))',
    shine: 'linear-gradient(100deg, #fffbe6 0%, #fde68a 30%, #c4b5fd 52%, #fcd34d 74%, #ffffff 100%)',
  },
  chinesenewyear: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #4a1010 0%, #380d0d 38%, #280909 70%, #180505 100%)',
    blobs: ['#fbbf24', '#ef4444', '#f59e0b'],
    grid: 'rgba(255,200,120,.38)',
    accent: '#fcd34d',
    btnFrom: '#dc2626', btnTo: '#f59e0b',
    glow: ['#fbbf24', '#ef4444', '#f59e0b', '#fcd34d'],
    card: 'linear-gradient(160deg, rgba(74,16,16,.78), rgba(40,10,10,.78))',
    shine: 'linear-gradient(100deg, #fff4d6 0%, #fcd34d 30%, #fca5a5 52%, #fde68a 74%, #ffffff 100%)',
  },
  mothersday: {
    // soft sky blue + jasmine white
    bg: 'radial-gradient(130% 120% at 15% 0%, #1f4f8f 0%, #173d73 38%, #102c55 70%, #0a1d3a 100%)',
    blobs: ['#60a5fa', '#bae6fd', '#93c5fd'],
    grid: 'rgba(200,230,255,.4)',
    accent: '#dbeafe',
    btnFrom: '#3b82f6', btnTo: '#0ea5e9',
    glow: ['#93c5fd', '#e0f2fe', '#60a5fa', '#ffffff'],
    card: 'linear-gradient(160deg, rgba(28,66,120,.74), rgba(14,36,72,.76))',
    shine: 'linear-gradient(100deg, #ffffff 0%, #dbeafe 28%, #bae6fd 50%, #ffffff 74%, #e0f2fe 100%)',
  },
  fathersday: {
    // warm royal yellow + canna gold
    bg: 'radial-gradient(130% 120% at 15% 0%, #5a4208 0%, #443006 38%, #2f2105 70%, #1d1403 100%)',
    blobs: ['#facc15', '#f59e0b', '#fde047'],
    grid: 'rgba(255,230,140,.36)',
    accent: '#fde68a',
    btnFrom: '#eab308', btnTo: '#d97706',
    glow: ['#facc15', '#f59e0b', '#fde047', '#fff7cc'],
    card: 'linear-gradient(160deg, rgba(80,58,10,.76), rgba(42,30,6,.78))',
    shine: 'linear-gradient(100deg, #fffbea 0%, #fde047 30%, #fbbf24 52%, #fef08a 74%, #ffffff 100%)',
  },
  anniversary: {
    // company blue + celebration gold
    bg: 'radial-gradient(130% 120% at 15% 0%, #16357a 0%, #10285e 38%, #0b1c44 70%, #07122c 100%)',
    blobs: ['#fbbf24', '#3b82f6', '#ec4899'],
    grid: 'rgba(255,220,140,.34)',
    accent: '#fde68a',
    btnFrom: '#2563eb', btnTo: '#d97706',
    glow: ['#fbbf24', '#3b82f6', '#f472b6', '#fde68a'],
    card: 'linear-gradient(160deg, rgba(24,52,116,.74), rgba(10,26,64,.76))',
    shine: 'linear-gradient(100deg, #fffbe6 0%, #fde68a 28%, #93c5fd 50%, #fcd34d 74%, #ffffff 100%)',
  },
  valentine: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #4a1030 0%, #380c26 38%, #28081c 70%, #1a0613 100%)',
    blobs: ['#ec4899', '#f472b6', '#db2777'],
    grid: 'rgba(255,170,210,.38)',
    accent: '#fbcfe8',
    btnFrom: '#db2777', btnTo: '#e11d48',
    glow: ['#ec4899', '#f472b6', '#db2777', '#fbcfe8'],
    card: 'linear-gradient(160deg, rgba(74,16,48,.76), rgba(40,8,28,.78))',
    shine: 'linear-gradient(100deg, #ffffff 0%, #f9a8d4 28%, #fecaca 50%, #fbcfe8 74%, #ffffff 100%)',
  },
  songkran: {
    bg: 'radial-gradient(130% 120% at 15% 0%, #0b4a5e 0%, #0a3a4a 38%, #082b38 70%, #061f28 100%)',
    blobs: ['#22d3ee', '#38bdf8', '#2dd4bf'],
    grid: 'rgba(150,230,255,.42)',
    accent: '#a5f3fc',
    btnFrom: '#06b6d4', btnTo: '#0ea5e9',
    glow: ['#22d3ee', '#38bdf8', '#2dd4bf', '#a5f3fc'],
    card: 'linear-gradient(160deg, rgba(12,58,72,.74), rgba(8,36,46,.76))',
    shine: 'linear-gradient(100deg, #ffffff 0%, #67e8f9 28%, #7dd3fc 50%, #a5f3fc 74%, #ffffff 100%)',
  },
}

const STORY = [
  {
    icon: FlaskConical,
    tint: '#38bdf8',
    title: 'เครื่องมือทดสอบวัสดุและปฐพี',
    text: 'คอนกรีต · ดิน · มวลรวม · งานวิศวกรรมโยธา ครบวงจร',
  },
  {
    icon: Award,
    tint: '#ffcf6a',
    title: 'ผู้นำด้านเทคโนโลยีการทดสอบ',
    text: 'The Leader in Advanced Testing Technology',
  },
  {
    icon: ShieldCheck,
    tint: '#4ade80',
    title: 'มาตรฐานระดับสากล',
    text: 'ดำเนินงานตามแนวทาง ISO 9001 · ISO/IEC 17025',
  },
  {
    icon: Boxes,
    tint: '#a78bfa',
    title: 'ระบบบริหารคลังสินค้า STS',
    text: 'จัดการสินค้า รับ–จ่าย และรายงาน แบบเรียลไทม์',
  },
]
const STORY_MS = 4800

// focus ring colour per festival (solid border + soft glow), applied via CSS vars
const LOGIN_RING = {
  none: ['rgba(56,189,248,.7)', 'rgba(56,189,248,.25)'],
  loykrathong: ['rgba(245,158,11,.7)', 'rgba(245,158,11,.25)'],
  halloween: ['rgba(249,115,22,.7)', 'rgba(249,115,22,.25)'],
  christmas: ['rgba(34,197,94,.7)', 'rgba(34,197,94,.25)'],
  newyear: ['rgba(234,179,8,.7)', 'rgba(234,179,8,.25)'],
  chinesenewyear: ['rgba(245,158,11,.75)', 'rgba(245,158,11,.28)'],
  valentine: ['rgba(236,72,153,.7)', 'rgba(236,72,153,.25)'],
  songkran: ['rgba(14,165,233,.7)', 'rgba(14,165,233,.25)'],
  mothersday: ['rgba(96,165,250,.7)', 'rgba(96,165,250,.25)'],
  fathersday: ['rgba(234,179,8,.75)', 'rgba(234,179,8,.28)'],
  anniversary: ['rgba(251,191,36,.7)', 'rgba(251,191,36,.25)'],
}

const loginInput = (extra = '') =>
  `w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[color:var(--lg-ring)] focus:bg-white/10 focus:ring-2 focus:ring-[color:var(--lg-ring-soft)] ${extra}`

export default function Login() {
  const navigate = useNavigate()
  const pureWork = usePureWork()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const alreadyIn = useAuthStore((s) => !!s.session && s.profile?.status === 'approved')
  const festival = useActiveFestival()
  const t = LOGIN_THEMES[festival] || LOGIN_THEMES.none
  const ring = LOGIN_RING[festival] || LOGIN_RING.none

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [showStandards, setShowStandards] = useState(false)
  const [focusField, setFocusField] = useState(null) // 'username' | 'password' | 'confirm'
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  // the mascot covers its eyes while you type a hidden password; reveal it and it peeks
  const covering = (focusField === 'password' || focusField === 'confirm') && !showPassword
  const trackGaze = (e) => setGaze(caretGaze(e.currentTarget))
  // the mascot says hello when the page opens, and waves now and then while you're idle
  const [waving, setWaving] = useState(false)
  const [hello, setHello] = useState(false)
  useEffect(() => {
    const ts = []
    const wave = () => {
      setWaving(true)
      ts.push(setTimeout(() => setWaving(false), 1300))
    }
    ts.push(setTimeout(() => setHello(true), 900))
    ts.push(setTimeout(wave, 1000))
    ts.push(setTimeout(() => setHello(false), 4200))
    const every = setInterval(() => {
      if (!document.activeElement || document.activeElement === document.body) wave()
    }, 9000)
    return () => {
      ts.forEach(clearTimeout)
      clearInterval(every)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setChapter((c) => (c + 1) % STORY.length), STORY_MS)
    return () => clearInterval(t)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setInfo('')

    if (mode === 'login') {
      setBusy(true)
      const result = await login(username, password)
      setBusy(false)
      if (!result.success) return setError(result.message)
      useFestivalStore.getState().announce() // greet with the active festival
      navigate('/', { replace: true })
    } else {
      if (password !== confirmPassword) return setError('รหัสผ่านไม่ตรงกัน')
      if (password.length < 6) return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      setBusy(true)
      const result = await register(username, password)
      setBusy(false)
      if (!result.success) return setError(result.message)
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setInfo('สมัครสำเร็จ รอผู้ดูแลระบบอนุมัติ')
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
    setPassword('')
    setConfirmPassword('')
  }

  if (alreadyIn) return <Navigate to="/" replace />

  const Active = STORY[chapter].icon

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 transition-[background] duration-700"
      style={{
        background: t.bg,
        '--glow-c1': t.glow[0],
        '--glow-c2': t.glow[1],
        '--glow-c3': t.glow[2],
        '--glow-c4': t.glow[3],
        '--lg-ring': ring[0],
        '--lg-ring-soft': ring[1],
      }}
    >
      {/* animated background: blueprint grid + drifting blobs + sparks */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(120% 100% at 30% 20%, #000 35%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(120% 100% at 30% 20%, #000 35%, transparent 80%)',
          }}
        />
        <div className="aurora">
          <span style={{ width: 520, height: 520, top: '-14%', left: '-6%', background: `radial-gradient(circle, ${t.blobs[0]}, transparent 60%)`, opacity: 0.5 }} />
          <span style={{ width: 460, height: 460, bottom: '-18%', right: '-8%', background: `radial-gradient(circle, ${t.blobs[1]}, transparent 60%)`, animationDelay: '-8s', opacity: 0.4 }} />
          <span style={{ width: 360, height: 360, top: '40%', right: '30%', background: `radial-gradient(circle, ${t.blobs[2]}, transparent 60%)`, animationDelay: '-13s', opacity: 0.35 }} />
        </div>
        {[
          ['12%', '18%', 5, '0s'], ['80%', '22%', 4, '.7s'], ['24%', '72%', 6, '1.2s'],
          ['68%', '82%', 4, '.3s'], ['46%', '12%', 3, '1.8s'], ['90%', '60%', 4, '1s'],
        ].map(([top, left, s, d], i) => (
          <span key={i} className="sparkle" style={{ top, left, width: s, height: s, animationDelay: d }} />
        ))}
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_minmax(360px,420px)] lg:gap-14">
        {/* ---------- brand + auto-playing story ---------- */}
        <div className="text-center lg:text-left">
          <div className="anim-fade-up flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:gap-5">
            <SealLogo size={96} ring coin />
            <div>
              <div className="text-4xl font-extrabold tracking-wider text-shine sm:text-5xl" style={t.shine ? { backgroundImage: t.shine } : undefined}>STS</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.22em]" style={{ color: t.accent }}>SOIL TESTING SIAM</div>
              <div className="text-xs font-medium tracking-wide text-white/55">บริษัท ซอยล์เทสติ้งสยาม จำกัด</div>
            </div>
          </div>

          {/* chapter that changes on its own */}
          <div className="anim-fade-up mx-auto mt-8 max-w-md lg:mx-0 lg:mt-10 [animation-delay:120ms]">
            <div key={chapter} className="anim-fade-up flex items-start gap-4">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5"
                style={{ boxShadow: `0 0 26px -6px ${STORY[chapter].tint}` }}
              >
                <Active size={22} style={{ color: STORY[chapter].tint }} />
              </span>
              <div className="pt-0.5 text-left">
                <div className="text-lg font-bold text-white sm:text-xl">{STORY[chapter].title}</div>
                <div className="mt-1 text-sm text-white/70">{STORY[chapter].text}</div>
              </div>
            </div>
            {/* auto-advance progress + chapter dots */}
            <div className="mt-5 flex items-center gap-3">
              {STORY.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setChapter(i)}
                  aria-label={`เรื่องที่ ${i + 1}`}
                  className="flex h-6 items-center"
                >
                  <span
                    className="block h-1.5 overflow-hidden rounded-full bg-white/15 transition-all"
                    style={{ width: i === chapter ? 40 : 18 }}
                  >
                    {i === chapter && (
                      <span key={chapter} className="block h-full rounded-full" style={{ backgroundImage: `linear-gradient(90deg, ${t.btnFrom}, ${t.btnTo})`, animation: `sts-progress ${STORY_MS}ms linear forwards` }} />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ISO badge strip */}
          <div className="anim-fade-up mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start [animation-delay:200ms]">
            {['ISO 9001', 'ISO/IEC 17025'].map((iso) => (
              <span key={iso} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
                <ShieldCheck size={13} className="text-emerald-300" /> {iso}
              </span>
            ))}
            <span className="text-xs text-white/45">มาตรฐานการทดสอบระดับสากล</span>
          </div>
        </div>

        {/* ---------- sign-in card (dark glass) with a festival mascot peeking behind it ---------- */}
        {/* the top margin reserves room for the mascot's head, so it is never cut off by
            the top of the screen */}
        <div className="relative mt-[124px] lg:mt-[146px]">
        {/* stage lighting behind the card (Grand / Showstopper) */}
        <div className="login-beams" aria-hidden="true" style={{ '--beam-c': t.glow[0], '--beam-c2': t.glow[1] }}>
          <span />
          <span />
          <span />
        </div>
        {!pureWork && (
          <FxBoundary name="login-mascot">
            <LoginMascot festival={festival} gaze={gaze} covering={covering} waving={waving && !focusField} hello={hello} />
          </FxBoundary>
        )}
        <div
          className="glow-border on anim-fade-up relative z-10 rounded-2xl border border-white/12 p-6 shadow-2xl backdrop-blur-xl sm:p-7 [animation-delay:160ms]"
          style={{ background: t.card }}
        >
          <span className="login-sheen" aria-hidden="true" />
          <div className="mb-5 text-center">
            <div className="text-lg font-bold text-white">ยินดีต้อนรับ</div>
            <div className="mt-0.5 text-xs text-white/55">เข้าสู่ระบบบริหารคลังสินค้า STS</div>
          </div>

          <div className="mb-5 flex rounded-xl border border-white/10 bg-black/20 p-1">
            {[
              ['login', 'เข้าสู่ระบบ'],
              ['register', 'สมัครสมาชิก'],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m ? 'text-white shadow-lg shadow-black/30' : 'text-white/60 hover:text-white'
                }`}
                style={mode === m ? { backgroundImage: `linear-gradient(90deg, ${t.btnFrom}, ${t.btnTo})` } : undefined}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/80">ชื่อผู้ใช้งาน</span>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); trackGaze(e) }}
                  onFocus={(e) => { setFocusField('username'); trackGaze(e) }}
                  onBlur={() => setFocusField(null)}
                  onKeyUp={trackGaze}
                  onClick={trackGaze}
                  placeholder="username"
                  className={loginInput('pl-9')}
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/80">รหัสผ่าน</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); trackGaze(e) }}
                  onFocus={(e) => { setFocusField('password'); trackGaze(e) }}
                  onBlur={() => setFocusField(null)}
                  onKeyUp={trackGaze}
                  onClick={trackGaze}
                  placeholder="••••••••"
                  className={loginInput('pl-9 pr-9')}
                  required
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition hover:bg-white/10"
                  style={{ color: t.accent }}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-white/80">ยืนยันรหัสผ่าน</span>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); trackGaze(e) }}
                    onFocus={(e) => { setFocusField('confirm'); trackGaze(e) }}
                    onBlur={() => setFocusField(null)}
                    onKeyUp={trackGaze}
                    onClick={trackGaze}
                    placeholder="••••••••"
                    className={loginInput('pl-9')}
                    required
                  />
                </div>
              </label>
            )}

            {error && <div className="rounded-lg bg-red-500/15 px-3.5 py-2.5 text-sm text-red-200">{error}</div>}
            {info && <div className="rounded-lg bg-emerald-500/15 px-3.5 py-2.5 text-sm text-emerald-200">{info}</div>}
            {mode === 'register' && <p className="text-xs text-white/45">สมัครแล้วต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้</p>}

            <button
              type="submit"
              disabled={busy}
              data-magnetic
              className="btn-shine group mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
              style={{ backgroundImage: `linear-gradient(90deg, ${t.btnFrom}, ${t.btnTo})` }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              {!busy && <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowStandards(true)}
              className="group flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              <ShieldCheck size={12} /> ตรวจมาตรฐานเว็บผ่าน · Lighthouse 100 · WCAG AA
            </button>
            <div className="text-xs text-white/40">© Soil Testing Siam Co., Ltd. · STS Inventory</div>
          </div>
        </div>
        </div>
      </div>

      {showStandards && <WebStandardsModal onClose={() => setShowStandards(false)} />}
    </div>
  )
}
