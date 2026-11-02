import { useEffect, useState } from 'react'
import { Moon, Sun, Users, Check, X, ShieldCheck, DatabaseZap, Clock, UserX, RotateCcw } from 'lucide-react'
import Modal from './Modal'
import { useThemeStore } from '../store/useThemeStore'
import { useAuthStore, useCurrentUser, usePendingCount } from '../store/useAuthStore'
import { useStore } from '../store/useStore'

export default function SettingsModal({ open, onClose }) {
  const currentUser = useCurrentUser()
  const isAdmin = currentUser?.role === 'Admin' && currentUser?.status === 'approved'
  const pendingCount = usePendingCount()
  const [tab, setTab] = useState('theme')

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่า (Settings)" wide={isAdmin}>
      <div className="mb-5 flex gap-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => setTab('theme')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
            tab === 'theme'
              ? 'border-blue-500 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sun size={15} /> ธีม
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === 'users'
                ? 'border-blue-500 text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users size={15} /> ผู้ใช้งาน
            {pendingCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{pendingCount}</span>
            )}
          </button>
        )}
      </div>

      {tab === 'theme' || !isAdmin ? (
        <>
          <ThemeTab />
          {isAdmin && <ClearDataSection />}
        </>
      ) : (
        <UsersTab currentUser={currentUser} />
      )}
    </Modal>
  )
}

function ThemeTab() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">เลือกโหมดการแสดงผลของระบบ</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTheme('dark')}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-2 py-5 transition ${
            theme === 'dark'
              ? 'border-blue-500 bg-[var(--bg-hover)]'
              : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B0F19] ring-1 ring-white/10">
            <Moon size={22} className="text-blue-300" />
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-[var(--text-primary)]">Dark Mode</span>
          <span className="whitespace-nowrap text-xs text-[var(--text-faint)]">โทนน้ำเงินเข้ม</span>
        </button>

        <button
          onClick={() => setTheme('light')}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 px-2 py-5 transition ${
            theme === 'light'
              ? 'border-blue-500 bg-[var(--bg-hover)]'
              : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
            <Sun size={22} className="text-amber-500" />
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-[var(--text-primary)]">Light Mode</span>
          <span className="whitespace-nowrap text-xs text-[var(--text-faint)]">โทนสว่าง</span>
        </button>
      </div>
    </div>
  )
}

// Admin-only reset: removes all products and Stock In / Stock Out rows (keeps users).
function ClearDataSection() {
  const clearAllData = useStore((s) => s.clearAllData)
  const productCount = useStore((s) => s.products.length)
  const txCount = useStore((s) => s.stockIns.length + s.stockOuts.length)
  const [done, setDone] = useState(false)

  function handleClear() {
    if (!confirm(`ลบข้อมูลทั้งหมด: สินค้า ${productCount.toLocaleString('th-TH')} รายการ และรายการรับเข้า-จ่ายออก ${txCount.toLocaleString('th-TH')} รายการ?`)) return
    if (!confirm('ยืนยันอีกครั้ง — ลบแล้วกู้คืนไม่ได้')) return
    clearAllData()
    setDone(true)
  }

  return (
    <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-400">
        <DatabaseZap size={16} /> ลบข้อมูลทั้งหมด
      </div>
      <p className="mb-3 text-xs text-[var(--text-muted)]">
        ลบรายการสินค้าและรายการรับเข้า-จ่ายออกทั้งหมดในเครื่องนี้ (บัญชีผู้ใช้ไม่ถูกลบ)
      </p>
      <button
        onClick={handleClear}
        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
      >
        ลบข้อมูลทั้งหมด
      </button>
      {done && <span className="ml-3 text-xs text-emerald-300">ลบข้อมูลเรียบร้อย</span>}
    </div>
  )
}

const STATUS_LABEL = {
  approved: { text: 'อนุมัติแล้ว', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { text: 'ไม่อนุมัติ', cls: 'bg-red-500/15 text-red-300' },
  pending: { text: 'รออนุมัติ', cls: 'bg-amber-500/15 text-amber-300' },
}

function formatThaiDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
}

// Accounts live in Supabase Auth now: people sign up themselves on the login page and an
// admin approves them here. (Creating accounts or reading passwords from the browser would
// need the service-role key, which must never ship to the client — so there's no
// "เพิ่มผู้ใช้งาน" form and no password column any more.)
function UsersTab({ currentUser }) {
  const profiles = useAuthStore((s) => s.profiles)
  const loadProfiles = useAuthStore((s) => s.loadProfiles)
  const approveUser = useAuthStore((s) => s.approveUser)
  const rejectUser = useAuthStore((s) => s.rejectUser)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const pending = profiles.filter((u) => u.status === 'pending')
  const others = profiles.filter((u) => u.status !== 'pending')
  const adminCount = profiles.filter((u) => u.role === 'Admin' && u.status === 'approved').length

  async function run(id, fn) {
    setBusyId(id)
    try {
      await fn()
    } finally {
      setBusyId(null)
    }
  }

  function handleApprove(user) {
    run(user.id, () => approveUser(user.id))
  }

  function handleReject(user) {
    if (user.id === currentUser?.id) {
      alert('ไม่สามารถระงับบัญชีของตนเองได้')
      return
    }
    if (user.role === 'Admin' && user.status === 'approved' && adminCount <= 1) {
      alert('ไม่สามารถระงับได้ ระบบต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 คน')
      return
    }
    const question =
      user.status === 'pending'
        ? `ปฏิเสธการสมัครของ "${user.username}" ใช่หรือไม่?`
        : `ระงับการใช้งานของ "${user.username}" ใช่หรือไม่? (ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะอนุมัติอีกครั้ง)`
    if (!confirm(question)) return
    run(user.id, () => rejectUser(user.id))
  }

  function handleRoleChange(user, role) {
    if (user.role === 'Admin' && role !== 'Admin' && user.status === 'approved' && adminCount <= 1) {
      alert('ไม่สามารถเปลี่ยนสิทธิ์ได้ ระบบต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 คน')
      return
    }
    run(user.id, () => updateProfile(user.id, { role }))
  }

  return (
    <div>
      {/* ---------- รออนุมัติ ---------- */}
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
          <Clock size={16} /> รออนุมัติ ({pending.length})
        </div>
        {pending.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">ไม่มีผู้ใช้งานที่รอการอนุมัติ</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-color-soft)]">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{u.username}</div>
                  <div className="text-xs text-[var(--text-muted)]">สมัครเมื่อ {formatThaiDate(u.createdAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u)}
                    disabled={busyId === u.id}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check size={14} /> อนุมัติ
                  </button>
                  <button
                    onClick={() => handleReject(u)}
                    disabled={busyId === u.id}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    <X size={14} /> ปฏิเสธ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- ผู้ใช้งานทั้งหมด ---------- */}
      <p className="mb-1 text-sm text-[var(--text-secondary)]">
        จัดการบัญชีผู้ใช้งานในระบบ ({others.length} บัญชี)
      </p>
      <p className="mb-4 text-xs text-[var(--text-faint)]">
        ผู้ใช้งานใหม่ให้สมัครเองที่หน้าเข้าสู่ระบบ (สมัครสมาชิก) แล้วผู้ดูแลระบบกดอนุมัติในส่วน "รออนุมัติ" ด้านบน
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-[var(--bg-card-alt)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-3 font-medium">ชื่อผู้ใช้งาน</th>
              <th className="px-4 py-3 font-medium">สิทธิ์</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">วันที่สมัคร</th>
              <th className="px-4 py-3 text-center font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {others.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border-color-soft)] text-[var(--text-primary)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">คุณ</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    className="rounded-md border border-[var(--border-color)] bg-[var(--bg-input)] px-2 py-1 text-xs text-[var(--text-primary)]"
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_LABEL[u.status]?.cls ?? ''}`}>
                    {STATUS_LABEL[u.status]?.text ?? u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{formatThaiDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {u.role === 'Admin' && u.status === 'approved' && <ShieldCheck size={15} className="text-emerald-400" />}
                    {u.status === 'approved' ? (
                      <button
                        onClick={() => handleReject(u)}
                        disabled={busyId === u.id}
                        title="ระงับการใช้งาน"
                        className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                      >
                        <UserX size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(u)}
                        disabled={busyId === u.id}
                        title="อนุมัติอีกครั้ง"
                        className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-50"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {others.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-[var(--text-faint)]">ยังไม่มีผู้ใช้งาน</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
