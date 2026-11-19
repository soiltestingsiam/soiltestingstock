import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2, FlaskConical, Award, ShieldCheck, Boxes, ChevronRight } from 'lucide-react'
import SealLogo from '../components/SealLogo'
import { useAuthStore } from '../store/useAuthStore'

// A branded, self-contained login experience: a deep-blue hero that auto-plays the
// company story (chapters fade through on their own), with a readable dark-glass sign-in
// card. On its own palette so it looks the same in any app theme / festival.

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

const loginInput = (extra = '') =>
  `w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-sky-400/70 focus:bg-white/10 focus:ring-2 focus:ring-sky-400/25 ${extra}`

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const alreadyIn = useAuthStore((s) => !!s.session && s.profile?.status === 'approved')

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [chapter, setChapter] = useState(0)

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
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{ background: 'radial-gradient(130% 120% at 15% 0%, #123a7a 0%, #0c2554 38%, #081734 70%, #060f22 100%)' }}
    >
      {/* animated background: blueprint grid + drifting blobs + sparks */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(130,180,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(130,180,255,.5) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(120% 100% at 30% 20%, #000 35%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(120% 100% at 30% 20%, #000 35%, transparent 80%)',
          }}
        />
        <div className="aurora">
          <span style={{ width: 520, height: 520, top: '-14%', left: '-6%', background: 'radial-gradient(circle, #2563eb, transparent 60%)', opacity: 0.5 }} />
          <span style={{ width: 460, height: 460, bottom: '-18%', right: '-8%', background: 'radial-gradient(circle, #0ea5e9, transparent 60%)', animationDelay: '-8s', opacity: 0.4 }} />
          <span style={{ width: 360, height: 360, top: '40%', right: '30%', background: 'radial-gradient(circle, #6366f1, transparent 60%)', animationDelay: '-13s', opacity: 0.35 }} />
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
              <div className="text-4xl font-extrabold tracking-wider text-shine sm:text-5xl">STS</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.22em] text-sky-200">SOIL TESTING SIAM</div>
              <div className="text-[11px] font-medium tracking-wide text-white/55">บริษัท ซอยล์เทสติ้งสยาม จำกัด</div>
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
            <div className="mt-5 flex items-center gap-2">
              {STORY.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setChapter(i)}
                  aria-label={`เรื่องที่ ${i + 1}`}
                  className="h-1.5 overflow-hidden rounded-full bg-white/15 transition-all"
                  style={{ width: i === chapter ? 40 : 14 }}
                >
                  {i === chapter && (
                    <span key={chapter} className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400" style={{ animation: `sts-progress ${STORY_MS}ms linear forwards` }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ISO badge strip */}
          <div className="anim-fade-up mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start [animation-delay:200ms]">
            {['ISO 9001', 'ISO/IEC 17025'].map((iso) => (
              <span key={iso} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/80">
                <ShieldCheck size={13} className="text-emerald-300" /> {iso}
              </span>
            ))}
            <span className="text-[11px] text-white/45">มาตรฐานการทดสอบระดับสากล</span>
          </div>
        </div>

        {/* ---------- sign-in card (dark glass) ---------- */}
        <div
          className="glow-border on anim-fade-up rounded-2xl border border-white/12 p-6 shadow-2xl backdrop-blur-xl sm:p-7 [animation-delay:160ms]"
          style={{ background: 'linear-gradient(160deg, rgba(20,38,74,.72), rgba(10,20,44,.72))' }}
        >
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
                  mode === m ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'text-white/60 hover:text-white'
                }`}
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
                <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={loginInput('pl-9')} required />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/80">รหัสผ่าน</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={loginInput('pl-9 pr-9')}
                  required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-white/80">ยืนยันรหัสผ่าน</span>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={loginInput('pl-9')} required />
                </div>
              </label>
            )}

            {error && <div className="rounded-lg bg-red-500/15 px-3.5 py-2.5 text-sm text-red-200">{error}</div>}
            {info && <div className="rounded-lg bg-emerald-500/15 px-3.5 py-2.5 text-sm text-emerald-200">{info}</div>}
            {mode === 'register' && <p className="text-xs text-white/45">สมัครแล้วต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้</p>}

            <button
              type="submit"
              disabled={busy}
              className="btn-shine group mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              {!busy && <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-5 text-center text-[11px] text-white/40">© Soil Testing Siam Co., Ltd. · STS Inventory</div>
        </div>
      </div>
    </div>
  )
}
