import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, Users, Check, X, ShieldCheck, DatabaseZap, Clock, UserX, RotateCcw, KeyRound, Loader2, Sparkles, Check as CheckIcon, CalendarRange, AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import { useThemeStore } from '../store/useThemeStore'
import { useAuthStore, useCurrentUser, usePendingCount, useIsAdmin, useIsOwner, useStealth } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import { useCostedStockOuts } from '../store/useCostedStockOuts'
import { yearCounts, carryForward, currentBeYear } from '../utils/yearView'
import { useFestivalStore } from '../store/useFestivalStore'
import { usePetStore } from '../store/usePetStore'
import { FESTIVALS, PICKER_IDS, resolveFestival, parseAnniversary, anniversaryYears } from '../festival/festivals'
import { SPECIES, levelInfo, pickCoat } from '../pet/petData'
import { useSpectacleStore, LEVELS } from '../store/useSpectacleStore'
import { preview as previewSound } from '../lib/sfx'

export default function SettingsModal({ open, onClose }) {
  const currentUser = useCurrentUser()
  const isAdmin = useIsAdmin()
  const isOwner = useIsOwner()
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
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
          <FestivalToggle />
          <PetToggle />
          <SpectacleSection />
          {isAdmin && <FestivalSection />}
          {isOwner && <OwnerModeSection />}
          {isAdmin && <YearDataSection />}
          {isAdmin && <ClearDataSection />}
        </>
      ) : (
        <UsersTab currentUser={currentUser} />
      )}
      <VersionInfo />
    </Modal>
  )
}

// Admin-only: pick the seasonal theme for EVERYONE (saved globally + realtime), or leave
// it on "อัตโนมัติ" to follow the calendar (e.g. ลอยกระทง in November, ฮาโลวีน late Oct).
// Everyone: show / hide the seasonal decorations & colors on their own device.
function FestivalToggle() {
  const enabled = useFestivalStore((s) => s.enabled)
  const setEnabled = useFestivalStore((s) => s.setEnabled)
  const mode = useFestivalStore((s) => s.mode)
  const anniversary = useFestivalStore((s) => s.anniversary)
  const active = resolveFestival(mode, new Date(), parseAnniversary(anniversary))
  const current = FESTIVALS[active] ?? FESTIVALS.none
  return (
    <div className={`mt-6 rounded-xl border p-4 ${enabled ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-90'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles size={16} className="text-[var(--text-accent)]" /> แสดงธีมเทศกาล
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {enabled
              ? `เปิดอยู่ — ตอนนี้: ${current.emoji} ${current.label}`
              : 'ปิดอยู่ — ใช้สีปกติ ไม่มีของตกแต่งเทศกาล (เฉพาะเครื่องนี้)'}
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          aria-pressed={enabled}
          title={enabled ? 'ปิดธีมเทศกาล' : 'เปิดธีมเทศกาล'}
          className={`relative flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${enabled ? 'bg-blue-600' : 'bg-[var(--bg-hover-strong)]'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    </div>
  )
}

// Show / hide your own pet (it can be hidden from its panel — this brings it back).
function PetToggle() {
  const ready = usePetStore((s) => s.ready)
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  if (!ready) return null
  const shown = !pet.hidden
  const coat = pickCoat(pet.species, owner)
  return (
    <div className="mt-3 rounded-xl border border-[var(--border-color)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span aria-hidden="true">{SPECIES[pet.species]?.emoji}</span> แสดงสัตว์เลี้ยงของฉัน
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {coat.name} · Lv.{levelInfo(pet.xp).level} · 🔥 {pet.streak || 0} วัน — {shown ? 'เดินเล่นอยู่ด้านล่างจอ (กดที่น้องเพื่อแต่งตัว)' : 'ซ่อนอยู่'}
          </p>
        </div>
        <button
          onClick={() => usePetStore.getState().setHidden(shown)}
          aria-pressed={shown}
          title={shown ? 'ซ่อนสัตว์เลี้ยง' : 'แสดงสัตว์เลี้ยง'}
          className={`relative flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${shown ? 'bg-blue-600' : 'bg-[var(--bg-hover-strong)]'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${shown ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    </div>
  )
}

// ความอลังการ & เสียง — per device, for everyone
function SpectacleSection() {
  const level = useSpectacleStore((s) => s.level)
  const reduceMotion = useSpectacleStore((s) => s.reduceMotion)
  const sound = useSpectacleStore((s) => s.sound)
  const volume = useSpectacleStore((s) => s.volume)
  const { setLevel, setReduceMotion, setSound, setVolume } = useSpectacleStore.getState()
  const osReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const sw = (on) => `relative flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${on ? 'bg-blue-600' : 'bg-[var(--bg-hover-strong)]'}`
  const knob = (on) => `absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`

  return (
    <div className="mt-6 rounded-xl border border-[var(--border-color)] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Sparkles size={16} className="text-[var(--text-accent)]" /> ความอลังการ & เสียง
      </div>
      <p className="mb-3 text-xs text-[var(--text-secondary)]">ตั้งค่าเฉพาะเครื่องนี้ — ตัวเลขและตารางอ่านได้เหมือนเดิมทุกระดับ</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="ระดับความอลังการ">
        {LEVELS.map((l) => {
          const on = level === l.id
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setLevel(l.id)}
              className={`spectacle-opt relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
                on ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_#3b82f6]' : 'border-[var(--border-color)] bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-hover)]'
              }`}
              data-level={l.id}
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">{l.label}</span>
                {on && <CheckIcon size={13} className="text-blue-500" />}
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">{l.th}</span>
              <span className="text-[10.5px] leading-snug text-[var(--text-secondary)]">{l.desc}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-surface-soft)] px-3 py-2.5">
        <div className="min-w-0 text-xs">
          <div className="font-semibold text-[var(--text-primary)]">ลดแอนิเมชัน</div>
          <div className="text-[var(--text-secondary)]">
            หยุดการเคลื่อนไหวและอนุภาคทั้งหมด{osReduced ? ' · เครื่องนี้ตั้ง “ลดการเคลื่อนไหว” ไว้แล้ว ระบบจึงลดให้อยู่แล้ว' : ''}
          </div>
        </div>
        <button type="button" onClick={() => setReduceMotion(!reduceMotion)} aria-pressed={reduceMotion} aria-label="ลดแอนิเมชัน" className={sw(reduceMotion)}>
          <span className={knob(reduceMotion)} />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-surface-soft)] px-3 py-2.5">
        <div className="min-w-0 text-xs">
          <div className="font-semibold text-[var(--text-primary)]">เสียงเอฟเฟกต์</div>
          <div className="text-[var(--text-secondary)]">เสียงสั้น ๆ เบา ๆ ตอนบันทึก เตือนสต็อก เปิดม่านเทศกาล (ปิดไว้เป็นค่าเริ่มต้น · ปิดด่วนได้ที่ปุ่มลำโพงด้านบน)</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSound(!sound)
            if (!sound) setTimeout(previewSound, 30)
          }}
          aria-pressed={sound}
          aria-label="เสียงเอฟเฟกต์"
          className={sw(sound)}
        >
          <span className={knob(sound)} />
        </button>
      </div>
      {sound && (
        <div className="mt-2 flex flex-wrap items-center gap-3 px-1 text-xs text-[var(--text-secondary)]">
          <label className="flex items-center gap-2">
            ความดัง
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(e.target.value)} aria-label="ความดังเสียงเอฟเฟกต์" className="w-32 accent-blue-600" />
          </label>
          <button type="button" onClick={() => previewSound()} className="rounded-lg border border-[var(--border-color)] px-2.5 py-1 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            ทดลองเสียง
          </button>
        </div>
      )}
    </div>
  )
}

function FestivalSection() {
  const mode = useFestivalStore((s) => s.mode)
  const setMode = useFestivalStore((s) => s.setMode)
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'warn' | 'error', text }
  const anniversary = useFestivalStore((s) => s.anniversary)
  const autoActive = resolveFestival('auto', new Date(), parseAnniversary(anniversary))

  async function pick(m) {
    if (busy) return
    setBusy(m)
    setStatus(null)
    const res = await setMode(m)
    setBusy(null)
    const label = m === 'auto' ? 'อัตโนมัติ' : FESTIVALS[m]?.label
    if (res?.ok) setStatus({ kind: 'ok', text: `บันทึกแล้ว — ทุกคนจะเห็นธีม "${label}"` })
    else if (res?.localOnly)
      setStatus({ kind: 'warn', text: 'ใช้ได้เฉพาะเครื่องนี้ — ฐานข้อมูลยังไม่มีตารางตั้งค่า (ให้รัน supabase/migrations/005_app_settings.sql) จึงจะมีผลกับทุกคน' })
    else setStatus({ kind: 'error', text: `บันทึกไม่สำเร็จ: ${res?.error?.message || 'ไม่ทราบสาเหตุ'} — ธีมยังเป็นค่าเดิม` })
  }

  const options = [
    { id: 'auto', label: 'อัตโนมัติ (ตามวันที่)', emoji: '🗓️', desc: `ตอนนี้: ${FESTIVALS[autoActive].emoji} ${FESTIVALS[autoActive].label}` },
    ...PICKER_IDS.map((id) => ({ id, label: FESTIVALS[id].label, emoji: FESTIVALS[id].emoji, desc: FESTIVALS[id].desc })),
  ]

  return (
    <div className="mt-6">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <Sparkles size={16} className="text-[var(--text-accent)]" /> ธีมเทศกาล
      </div>
      <p className="mb-3 text-xs text-[var(--text-muted)]">เลือกธีมตกแต่งทั้งระบบ (มีผลกับผู้ใช้ทุกคน) — ตั้งอัตโนมัติให้เปลี่ยนตามเทศกาลเองก็ได้</p>
      {status && (
        <div
          role="status"
          className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${
            status.kind === 'ok'
              ? 'bg-emerald-500/10 text-[var(--text-primary)]'
              : status.kind === 'warn'
                ? 'bg-amber-500/15 text-[var(--text-primary)]'
                : 'bg-red-500/15 text-[var(--text-primary)]'
          }`}
        >
          {status.kind === 'ok' ? '✓ ' : '⚠ '}
          {status.text}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => {
          const selected = mode === o.id
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              disabled={!!busy}
              className={`relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_#3b82f6]'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-lg leading-none">{o.emoji}</span>
                {busy === o.id ? (
                  <Loader2 size={13} className="animate-spin text-[var(--text-accent)]" />
                ) : (
                  selected && <CheckIcon size={13} className="text-blue-400" />
                )}
              </span>
              <span className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{o.label}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{o.desc}</span>
            </button>
          )
        })}
      </div>
      <AnniversaryField />
    </div>
  )
}

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const pad2 = (n) => String(n).padStart(2, '0')

// admin: the company's founding date — in อัตโนมัติ mode the "ครบรอบบริษัท" theme shows the
// day before, the day and the day after; with the year it also says "ครบรอบ N ปี"
function AnniversaryField() {
  const stored = useFestivalStore((s) => s.anniversary)
  const setAnniversary = useFestivalStore((s) => s.setAnniversary)
  const cur = parseAnniversary(stored)
  const [day, setDay] = useState(cur ? String(cur.day) : '')
  const [month, setMonth] = useState(cur ? String(cur.month) : '')
  const [yearBE, setYearBE] = useState(cur?.year ? String(cur.year + 543) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const c = parseAnniversary(stored)
    setDay(c ? String(c.day) : '')
    setMonth(c ? String(c.month) : '')
    setYearBE(c?.year ? String(c.year + 543) : '')
  }, [stored])

  const y = yearBE.trim() ? Number(yearBE.trim()) - 543 : null
  const draft = day && month ? `${y ? `${y}-` : ''}${pad2(month)}-${pad2(day)}` : ''
  const draftValid = !!parseAnniversary(draft) && (!yearBE.trim() || /^\d{4}$/.test(yearBE.trim()))
  const years = anniversaryYears(parseAnniversary(draft))

  async function save(value) {
    setBusy(true)
    setMsg(null)
    const res = await setAnniversary(value)
    setBusy(false)
    if (res?.ok) setMsg({ ok: true, text: value ? 'บันทึกวันก่อตั้งแล้ว' : 'ล้างวันก่อตั้งแล้ว' })
    else if (res?.localOnly) setMsg({ ok: false, text: 'ใช้ได้เฉพาะเครื่องนี้ — ให้รัน supabase/migrations/005_app_settings.sql ก่อน' })
    else setMsg({ ok: false, text: `บันทึกไม่สำเร็จ: ${res?.error?.message || 'ไม่ทราบสาเหตุ'}` })
  }

  const field = 'rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-blue-500'
  return (
    <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3">
      <div className="text-xs font-semibold text-[var(--text-primary)]">🎉 วันก่อตั้งบริษัท (สำหรับธีม “ครบรอบบริษัท”)</div>
      <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
        โหมดอัตโนมัติจะขึ้นธีมครบรอบ 1 วันก่อน – 1 วันหลังวันนี้ · ใส่ปีด้วยจะแสดง “ครบรอบ N ปี”
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select aria-label="วันที่ก่อตั้ง" value={day} onChange={(e) => setDay(e.target.value)} className={field}>
          <option value="">วันที่</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select aria-label="เดือนที่ก่อตั้ง" value={month} onChange={(e) => setMonth(e.target.value)} className={field}>
          <option value="">เดือน</option>
          {TH_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          aria-label="ปีที่ก่อตั้ง (พ.ศ. ไม่บังคับ)"
          inputMode="numeric"
          maxLength={4}
          placeholder="ปี พ.ศ. (ถ้ามี)"
          value={yearBE}
          onChange={(e) => setYearBE(e.target.value.replace(/[^0-9]/g, ''))}
          className={`${field} w-28`}
        />
        <button
          type="button"
          disabled={busy || !draftValid || draft === stored}
          onClick={() => save(draft)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {stored && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save('')}
            className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)]"
          >
            ล้าง
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]" role="status">
        {msg ? `${msg.ok ? '✓' : '⚠'} ${msg.text}` : day && month && !draftValid ? '⚠ วันที่ไม่ถูกต้อง' : years ? `ปีนี้ครบรอบ ${years} ปี` : stored ? '' : 'ยังไม่ได้ตั้งวันก่อตั้ง'}
      </p>
    </div>
  )
}

// Visible only to the owner account. Switches admin mode on/off. While on, this account
// has full admin tools; while off it is an ordinary user. Other admins always see it as
// a normal "User" either way.
function OwnerModeSection() {
  const stealth = useStealth()
  const setStealth = useAuthStore((s) => s.setStealth)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    await setStealth(!stealth)
    setBusy(false)
  }

  return (
    <div className={`mt-6 rounded-xl border p-4 ${stealth ? 'border-blue-500/40 bg-blue-500/5' : 'border-[var(--border-color)]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <KeyRound size={16} className={stealth ? 'text-blue-400' : 'text-[var(--text-muted)]'} /> โหมดผู้ดูแลระบบ
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {stealth
              ? 'กำลังเปิด — จัดการผู้ใช้และดู LOG ได้ และระบบจะไม่บันทึก LOG การกระทำของบัญชีนี้'
              : 'ปิดอยู่ — ใช้งานแบบผู้ใช้ทั่วไป (ระบบบันทึก LOG ตามปกติ)'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          aria-pressed={stealth}
          title={stealth ? 'ปิดโหมดผู้ดูแลระบบ' : 'เปิดโหมดผู้ดูแลระบบ'}
          className={`relative flex h-7 w-12 flex-shrink-0 items-center rounded-full transition disabled:opacity-60 ${
            stealth ? 'bg-blue-600' : 'bg-[var(--bg-hover-strong)]'
          }`}
        >
          {busy ? (
            <Loader2 size={13} className="absolute left-1/2 -translate-x-1/2 animate-spin text-white" />
          ) : (
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${stealth ? 'left-6' : 'left-1'}`} />
          )}
        </button>
      </div>
    </div>
  )
}

// Which build this browser is running — compare with /version.json (what is deployed)
// when checking whether the "มีเวอร์ชันใหม่" popup should have appeared.
function VersionInfo() {
  const version = /^[0-9a-f]{40}$/.test(__APP_VERSION__) ? __APP_VERSION__.slice(0, 7) : __APP_VERSION__
  const builtAt = new Date(__APP_BUILT_AT__)
  return (
    <p className="mt-6 border-t border-[var(--border-color-soft)] pt-3 text-center text-[11px] text-[var(--text-secondary)]">
      เวอร์ชันระบบ {version}
      {!Number.isNaN(builtAt.getTime()) && (
        <> · อัปเดตเมื่อ {builtAt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</>
      )}
    </p>
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
          <span className="whitespace-nowrap text-xs text-[var(--text-secondary)]">โทนน้ำเงินเข้ม</span>
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
          <span className="whitespace-nowrap text-xs text-[var(--text-secondary)]">โทนสว่าง</span>
        </button>
      </div>
    </div>
  )
}

// Admin-only reset: removes all products and Stock In / Stock Out rows (keeps users).
// ---------- ข้อมูลรายปี (admin) ----------
// Reports already show one year at a time, so nothing has to be deleted for that. This is
// for clearing old years (balances carried forward as ยอดยกมา) or removing a year's rows
// that were entered / imported by mistake.
function YearDataSection() {
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  const counts = useMemo(() => yearCounts(stockIns, stockOuts), [stockIns, stockOuts])
  const thisYear = currentBeYear()
  const [dialog, setDialog] = useState(null) // { kind: 'close' | 'delete', year }
  const [notice, setNotice] = useState(null)
  const cell = 'px-3 py-2 text-right tabular-nums'
  const btn = 'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition'

  return (
    <div className="mt-6 rounded-xl border border-[var(--border-color)] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <CalendarRange size={16} className="text-[var(--text-accent)]" /> ข้อมูลรายปี
      </div>
      <p className="mb-3 text-xs text-[var(--text-secondary)]">
        หน้ารายงานเลือกดู/Export ทีละปีได้อยู่แล้ว (ไม่ต้องลบข้อมูล) — ใช้ส่วนนี้เมื่อต้องการล้างปีเก่า หรือลบข้อมูลปีที่ลงผิด
      </p>
      {notice && (
        <div role="status" className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-primary)] ${notice.ok ? 'bg-emerald-500/10' : 'bg-red-500/15'}`}>
          {notice.ok ? '✓ ' : '⚠ '}
          {notice.text}
        </div>
      )}
      {counts.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">ยังไม่มีรายการรับ-จ่าย</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="bg-[var(--bg-surface-soft)] text-[var(--text-secondary)]">
                <th className="px-3 py-2 text-left">ปี (พ.ศ.)</th>
                <th className="px-3 py-2 text-right">รับเข้า</th>
                <th className="px-3 py-2 text-right">จ่ายออก</th>
                <th className="px-3 py-2 text-right">ยอดยกมา</th>
                <th className="px-3 py-2 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.be} className="border-t border-[var(--border-color-soft)] text-[var(--text-primary)]">
                  <td className="px-3 py-2 font-semibold">{c.be}</td>
                  <td className={cell}>{c.in.toLocaleString('th-TH')}</td>
                  <td className={cell}>{c.out.toLocaleString('th-TH')}</td>
                  <td className={cell}>{c.opening.toLocaleString('th-TH')}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      {c.be < thisYear && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'close', year: c.be })}
                          className={`${btn} border-amber-500/50 text-[var(--text-primary)] hover:bg-amber-500/10`}
                        >
                          ปิดปีและล้างข้อมูล
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'delete', year: c.be })}
                        className={`${btn} border-red-500/50 text-[var(--text-primary)] hover:bg-red-500/10`}
                      >
                        ลบบางรายการ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog?.kind === 'close' && (
        <CloseYearDialog
          year={dialog.year}
          counts={counts}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            setDialog(null)
            setNotice({ ok: true, text })
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteYearDialog
          year={dialog.year}
          count={counts.find((c) => c.be === dialog.year)}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            setDialog(null)
            setNotice({ ok: true, text })
          }}
        />
      )}
    </div>
  )
}

// type the year to enable the red button
function ConfirmYear({ year, value, onChange }) {
  return (
    <label className="mt-4 block text-xs font-medium text-[var(--text-primary)]">
      พิมพ์ <span className="font-bold">{year}</span> เพื่อยืนยัน
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        inputMode="numeric"
        maxLength={4}
        aria-label={`พิมพ์ ${year} เพื่อยืนยัน`}
        className="mt-1.5 block w-32 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-red-500"
      />
    </label>
  )
}

function CloseYearDialog({ year, counts, onClose, onDone }) {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const costedOuts = useCostedStockOuts()
  const closeYears = useStore((s) => s.closeYears)
  const plan = useMemo(() => carryForward(products, stockIns, costedOuts, year), [products, stockIns, costedOuts, year])
  const oldest = Math.min(...counts.map((c) => c.be))
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run() {
    setBusy(true)
    setError(null)
    const res = await closeYears(year, plan.rows)
    setBusy(false)
    if (res.error) {
      setError(
        res.missing
          ? 'ฐานข้อมูลยังไม่มีคำสั่งปิดปี — ให้รัน supabase/migrations/007_close_years.sql ใน Supabase (SQL Editor → วาง → Run) แล้วลองใหม่ (ยังไม่มีข้อมูลใดถูกเปลี่ยน)'
          : `ไม่สำเร็จ: ${res.error.message} (ยังไม่มีข้อมูลใดถูกเปลี่ยน)`,
      )
      return
    }
    onDone(`ปิดปี ${oldest === year ? year : `${oldest}–${year}`} แล้ว — ลบ ${(res.data?.deleted ?? 0).toLocaleString('th-TH')} รายการ และสร้างยอดยกมาปี ${year + 1} ${(res.data?.inserted ?? 0).toLocaleString('th-TH')} บรรทัด`)
  }

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={`ปิดปีและล้างข้อมูล — ถึงปี ${year}`}>
      <div className="flex flex-col gap-3 text-sm text-[var(--text-primary)]">
        <p>
          ลบรายการรับ-จ่ายทั้งหมด{oldest < year ? `ตั้งแต่ปี ${oldest} ` : ''}ถึงปี {year} ({plan.removedCount.toLocaleString('th-TH')} รายการ) แล้วยกยอดคงเหลือของสินค้า{' '}
          {plan.productCount.toLocaleString('th-TH')} รายการไปเป็น <b>ยอดยกมา</b> วันที่ 01/01/{year + 1} ({plan.rows.length.toLocaleString('th-TH')} บรรทัด แยกตามชั้นต้นทุน FIFO)
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)]">
          <li>✓ ยอดคงเหลือ หน้าสินค้าคงเหลือ และรายงานปี {year + 1} เป็นต้นไป <b className="text-[var(--text-primary)]">ไม่เปลี่ยน</b> (รวมต้นทุน FIFO)</li>
          <li>✓ ทำทั้งหมดในครั้งเดียว — ถ้าขัดข้องกลางทาง จะไม่มีอะไรถูกเปลี่ยน</li>
          <li>✓ รายการที่ลบยังมีสำเนาใน LOG การใช้งาน</li>
          <li>⚠ ดูรายงานปี {year} และก่อนหน้าไม่ได้อีก — แนะนำ Export PDF/Excel เก็บไว้ก่อน</li>
        </ul>
        {plan.negative.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={14} className="text-amber-500" /> มีสินค้า {plan.negative.length.toLocaleString('th-TH')} รายการที่ยอดติดลบ ณ สิ้นปี {year}
            </div>
            <p className="mt-1 text-[var(--text-secondary)]">
              จะยกยอดติดลบไปตามเดิม แต่ต้นทุน FIFO ของการรับเข้าครั้งถัดไปของสินค้าเหล่านี้อาจต่างจากเดิมเล็กน้อย — แนะนำให้ตรวจแก้ก่อน:{' '}
              {plan.negative.slice(0, 5).map((n) => `${n.code} (${n.qty.toLocaleString('th-TH')})`).join(', ')}
              {plan.negative.length > 5 ? ' …' : ''}
            </p>
          </div>
        )}
        <ConfirmYear year={year} value={typed} onChange={setTyped} />
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium">
            ⚠ {error}
          </p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy || typed !== String(year) || plan.removedCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} ปิดปีและล้างข้อมูล
          </button>
        </div>
      </div>
    </Modal>
  )
}

const KIND_LABEL = { in: 'รายการรับเข้า', out: 'รายการจ่ายออก', opening: 'ยอดยกมา' }

function DeleteYearDialog({ year, count, onClose, onDone }) {
  const deleteYearMovements = useStore((s) => s.deleteYearMovements)
  const [kinds, setKinds] = useState([])
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const total = kinds.reduce((s, k) => s + (count?.[k] ?? 0), 0)
  const toggle = (k) => setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]))

  async function run() {
    setBusy(true)
    setError(null)
    const res = await deleteYearMovements(year, kinds)
    setBusy(false)
    if (res.error) {
      setError(`ลบไม่สำเร็จ: ${res.error.message}${res.deleted ? ` (ลบไปแล้ว ${res.deleted} รายการ)` : ''}`)
      return
    }
    onDone(`ลบ${kinds.map((k) => KIND_LABEL[k]).join(' / ')} ปี ${year} แล้ว ${res.deleted.toLocaleString('th-TH')} รายการ`)
  }

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={`ลบข้อมูลปี ${year}`}>
      <div className="flex flex-col gap-3 text-sm text-[var(--text-primary)]">
        <p className="text-xs text-[var(--text-secondary)]">
          ใช้เมื่อข้อมูลปีนี้ลงผิดหรือนำเข้าผิด แล้วต้องการลงใหม่ — <b className="text-[var(--text-primary)]">ยอดคงเหลือและรายงานปีถัดไปจะเปลี่ยนตาม</b>{' '}
          (ถ้าต้องการล้างปีเก่าโดยยอดไม่เปลี่ยน ให้ใช้ “ปิดปีและล้างข้อมูล”)
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold">เลือกข้อมูลที่จะลบ</legend>
          {['in', 'out', 'opening'].map((k) => (
            <label key={k} className={`flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs ${count?.[k] ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={kinds.includes(k)} disabled={!count?.[k]} onChange={() => toggle(k)} />
              <span className="flex-1">{KIND_LABEL[k]}</span>
              <span className="tabular-nums text-[var(--text-secondary)]">{(count?.[k] ?? 0).toLocaleString('th-TH')} รายการ</span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-[var(--text-secondary)]">⚠ กู้คืนไม่ได้ (มีสำเนาใน LOG การใช้งาน)</p>
        <ConfirmYear year={year} value={typed} onChange={setTyped} />
        {error && (
          <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium">
            ⚠ {error}
          </p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy || !kinds.length || typed !== String(year)}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />} ลบ {total.toLocaleString('th-TH')} รายการ
          </button>
        </div>
      </div>
    </Modal>
  )
}

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
      <div className="danger-title mb-1 flex items-center gap-2 text-sm font-semibold">
        <DatabaseZap size={16} /> ลบข้อมูลทั้งหมด
      </div>
      <p className="mb-3 text-xs text-[var(--text-secondary)]">
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
      <p className="mb-4 text-xs text-[var(--text-secondary)]">
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
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">ยังไม่มีผู้ใช้งาน</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
