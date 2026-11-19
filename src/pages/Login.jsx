import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react'
import SealLogo from '../components/SealLogo'
import { useAuthStore } from '../store/useAuthStore'
import { inputClass } from '../components/FormField'

// Twinkling specks drifting behind the login card — pure decoration.
const SPARKLES = [
  { top: '14%', left: '12%', size: 6, delay: '0s' },
  { top: '22%', left: '82%', size: 4, delay: '.6s' },
  { top: '68%', left: '8%', size: 5, delay: '1.1s' },
  { top: '78%', left: '88%', size: 7, delay: '.3s' },
  { top: '40%', left: '92%', size: 3, delay: '1.6s' },
  { top: '86%', left: '46%', size: 4, delay: '.9s' },
  { top: '10%', left: '54%', size: 3, delay: '2.1s' },
  { top: '56%', left: '18%', size: 4, delay: '1.4s' },
]
function SparkleField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      {SPARKLES.map((s, i) => (
        <span className="sparkle" key={i} style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }} />
      ))}
    </div>
  )
}

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

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setInfo('')

    if (mode === 'login') {
      setBusy(true)
      const result = await login(username, password)
      setBusy(false)
      if (!result.success) {
        setError(result.message)
        return
      }
      navigate('/', { replace: true })
    } else {
      if (password !== confirmPassword) {
        setError('รหัสผ่านไม่ตรงกัน')
        return
      }
      if (password.length < 6) {
        setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        return
      }
      setBusy(true)
      const result = await register(username, password)
      setBusy(false)
      if (!result.success) {
        setError(result.message)
        return
      }
      // the account is pending — back to the login tab with the notice, not into the app
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-page)] px-4">
      {/* animated aurora backdrop */}
      <div className="aurora" aria-hidden="true">
        <span style={{ width: 460, height: 460, top: '-12%', left: '-8%', background: 'radial-gradient(circle, #3b82f6, transparent 60%)' }} />
        <span style={{ width: 420, height: 420, bottom: '-14%', right: '-6%', background: 'radial-gradient(circle, #6366f1, transparent 60%)', animationDelay: '-7s' }} />
        <span style={{ width: 360, height: 360, top: '38%', right: '22%', background: 'radial-gradient(circle, #d4af37, transparent 60%)', animationDelay: '-12s', opacity: 0.35 }} />
      </div>
      <SparkleField />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center anim-fade-up">
          <SealLogo size={116} ring coin />
          <div>
            <div className="text-5xl font-extrabold tracking-wider text-shine">STS</div>
            <div className="mt-1.5 text-xs font-semibold tracking-[0.3em] text-[var(--text-accent)]">
              SOIL TESTING SIAM
            </div>
            <div className="mt-1 text-[10px] font-medium tracking-[0.25em] text-[var(--text-faint)]">
              INVENTORY MANAGEMENT SYSTEM
            </div>
          </div>
        </div>

        <div className="glow-border on anim-fade-up rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-7 shadow-card [animation-delay:120ms]"
          style={{ boxShadow: '0 30px 70px -28px var(--shadow-color)' }}>
          <div className="mb-6 flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-blue-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">ชื่อผู้ใช้งาน</span>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className={inputClass('pl-9')}
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">รหัสผ่าน</span>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass('pl-9 pr-9')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--text-secondary)]">ยืนยันรหัสผ่าน</span>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass('pl-9')}
                    required
                  />
                </div>
              </label>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">{error}</div>
            )}
            {info && (
              <div className="rounded-lg bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">{info}</div>
            )}
            {mode === 'register' && (
              <p className="text-xs text-[var(--text-faint)]">
                สมัครแล้วต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-shine mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          </form>


        </div>
      </div>
    </div>
  )
}
