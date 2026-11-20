import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Trophy, RefreshCw, Info, EyeOff, Sparkles, Loader2 } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import Modal from '../components/Modal'
import FxBoundary from '../components/FxBoundary'
import PetSprite from '../pet/PetSprite'
import Wardrobe from '../pet/Wardrobe'
import { usePetStore } from '../store/usePetStore'
import { useThemeStore } from '../store/useThemeStore'
import { useActiveFestival } from '../store/useFestivalStore'
import { usePureWork } from '../store/useSpectacleStore'
import { teamLeaderboard, teamSendKudos, teamStatus } from '../lib/teamApi'
import { SKINS, normalizeSkin } from '../theme/skins'
import { formatNumber } from '../utils/format'
import {
  pickCoat,
  resolveOutfit,
  levelInfo,
  SPECIES,
  TITLES,
  FRAMES,
  WARDROBE_BY_ID,
  WARDROBE_SLOTS,
  WARDROBE_SLOT_IDS,
  DISPLAY_NAME_MAX,
  SUPPLY_DAILY_CAP,
  profileUnlocked,
} from '../pet/petData'

// อันดับทีม — a friendly, fair ranking + every teammate's pet card.
// Points are computed on the server (migration 008) from real, still-existing work
// (no edits, no deleted rows, capped per day), Supply Drops (server-capped), days checked
// in and festival-day drops. Hidden: anyone who chose to hide, and the owner in admin mode.
// Pure decoration around the stock system — it reads nothing the stock pages depend on.

const PERIODS = [
  { id: 'week', label: '7 วันล่าสุด' },
  { id: 'month', label: 'เดือนนี้' },
  { id: 'all', label: 'ทั้งหมด' },
]
const BOARDS = [
  { id: 'total', label: 'รวม', emoji: '🏆', key: 'total' },
  { id: 'work', label: 'งานคลัง', emoji: '📦', key: 'work_pts' },
  { id: 'supply', label: 'Supply Drop', emoji: '🪂', key: 'supply_pts' },
  { id: 'streak', label: 'ความต่อเนื่อง', emoji: '🔥', key: 'streak_pts' },
  { id: 'festival', label: 'เทศกาล', emoji: '🏮', key: 'festival_pts' },
]
const KUDOS = ['👏', '💪', '🌟', '🙏']

// a teammate's pet as drawn from their card
function TeamPet({ row, festival, size = 64, pose = 'walk', happy = false }) {
  const pet = row?.pet && typeof row.pet === 'object' ? row.pet : {}
  const species = pet.species === 'dog' ? 'dog' : 'cat'
  const coat = pickCoat(species, String(pet.coat || row?.username || ''))
  const outfit = resolveOutfit(festival, pet.wardrobe || {}, normalizeSkin(row?.skin))
  return (
    <div className="rk-pet" style={{ width: size, height: Math.round(size * 1.15), '--gx': 0, '--gy': 0.25 }}>
      <PetSprite species={species} coat={coat} outfit={outfit} pose={pose} happy={happy} />
    </div>
  )
}

const nameOf = (r) => (r?.display_name || '').trim() || r?.username || 'เพื่อนร่วมทีม'

export default function Ranking() {
  const pureWork = usePureWork()
  const festival = useActiveFestival()
  const [period, setPeriod] = useState('month')
  const [board, setBoard] = useState('total')
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(teamStatus())
  const [picked, setPicked] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [sent, setSent] = useState({}) // user_id → true (kudos sent this visit)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await teamLeaderboard(period)
    setRows(Array.isArray(data) ? data : null)
    setStatus(teamStatus())
    setLoading(false)
  }, [period])

  useEffect(() => {
    if (!pureWork) load()
  }, [load, pureWork])

  const key = BOARDS.find((b) => b.id === board)?.key || 'total'
  const sorted = useMemo(() => {
    if (!rows) return []
    return [...rows].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0) || nameOf(a).localeCompare(nameOf(b), 'th'))
  }, [rows, key])

  if (pureWork) return <Navigate to="/" replace />

  async function kudos(row, emoji = '👏') {
    if (!row || row.is_me) return
    const { data } = await teamSendKudos(row.user_id, emoji)
    if (data?.ok) {
      setSent((s) => ({ ...s, [row.user_id]: true }))
      setRows((list) => list?.map((r) => (r.user_id === row.user_id ? { ...r, kudos: data.already ? r.kudos : (Number(r.kudos) || 0) + 1, kudos_today: true } : r)))
      setPicked((p) => (p && p.user_id === row.user_id ? { ...p, kudos: data.already ? p.kudos : (Number(p.kudos) || 0) + 1, kudos_today: true } : p))
    }
  }

  const podium = sorted.slice(0, 3)
  const me = rows?.find((r) => r.is_me)

  return (
    <SidebarLayout
      title="อันดับทีม"
      backTo="/"
      heading={
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[var(--text-primary)]">
            <Trophy size={24} className="text-amber-500" /> อันดับทีม & สัตว์เลี้ยงเพื่อนร่วมทีม
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">ทำงานสม่ำเสมอ เก็บ Supply Drop ส่งกำลังใจให้กัน — คะแนนคิดจากงานจริงบนเซิร์ฟเวอร์</p>
        </div>
      }
    >
      <FxBoundary name="ranking" fallback={<p className="text-sm text-[var(--text-secondary)]">ไม่สามารถแสดงอันดับได้ในขณะนี้</p>}>
        {/* controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1" role="tablist" aria-label="ช่วงเวลา">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === p.id ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} className="flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="btn-shimmer ml-auto flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            <Sparkles size={14} /> แต่งโปรไฟล์ & สัตว์เลี้ยงของฉัน
          </button>
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="กระดานคะแนน">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={board === b.id}
              onClick={() => setBoard(b.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                board === b.id ? 'border-amber-400 bg-amber-400/15 text-[var(--text-primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {b.emoji} {b.label}
            </button>
          ))}
        </div>

        {status === 'missing' || (!loading && rows === null) ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-[var(--text-secondary)]">
            <div className="mb-1 flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Info size={16} className="text-amber-500" /> ระบบอันดับทีมยังไม่พร้อมใช้งาน
            </div>
            {status === 'missing'
              ? 'ผู้ดูแลระบบต้องรันไฟล์ supabase/migrations/008_team_pets_ranking.sql ใน Supabase (SQL Editor) ก่อน — ระหว่างนี้สัตว์เลี้ยง ตู้เสื้อผ้า และ Supply Drop ยังใช้ได้ตามปกติ (เก็บในเครื่องนี้)'
              : 'โหลดอันดับไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง'}
          </div>
        ) : loading && !rows ? (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--text-secondary)]" role="status">
            <Loader2 size={16} className="animate-spin" /> กำลังโหลดอันดับ...
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-secondary)]">ยังไม่มีใครในอันดับช่วงนี้ — เริ่มทำงานและเก็บ Supply Drop กันเลย!</p>
        ) : (
          <>
            {/* podium */}
            <div className="rk-podium mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[1, 0, 2].map((i) => {
                const r = podium[i]
                if (!r) return <div key={i} />
                return (
                  <button
                    key={r.user_id}
                    type="button"
                    onClick={() => setPicked(r)}
                    className={`rk-step rk-step-${i + 1} rk-frame flex flex-col items-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2 pb-3 pt-2 text-center transition hover:-translate-y-1`}
                    data-frame={r.frame || 'none'}
                    aria-label={`อันดับ ${i + 1} ${nameOf(r)} ${formatNumber(Number(r[key]) || 0)} คะแนน — ดูโปรไฟล์`}
                  >
                    <span className="rk-medal" aria-hidden="true">{['🥇', '🥈', '🥉'][i]}</span>
                    <TeamPet row={r} festival={festival} size={i === 0 ? 86 : 70} happy={i === 0} />
                    <span className="mt-1 w-full truncate text-sm font-bold text-[var(--text-primary)]">{nameOf(r)}</span>
                    <span className="w-full truncate text-[11px] text-[var(--text-secondary)]">{r.title || 'วิศวกรฝึกหัดประจำคลัง'}</span>
                    <span className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">{formatNumber(Number(r[key]) || 0)}</span>
                  </button>
                )
              })}
            </div>

            {/* the full list */}
            <ol className="flex flex-col gap-2">
              {sorted.map((r, i) => (
                <li key={r.user_id}>
                  <div className={`rk-row flex items-center gap-3 rounded-xl border px-3 py-2 ${r.is_me ? 'border-blue-500/60 bg-blue-500/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
                    <span className="w-6 flex-shrink-0 text-center text-sm font-extrabold text-[var(--text-secondary)]">{i + 1}</span>
                    <button type="button" onClick={() => setPicked(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`ดูโปรไฟล์ ${nameOf(r)}`}>
                      <TeamPet row={r} festival={festival} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                          {nameOf(r)} {r.is_me && <span className="text-xs font-semibold text-blue-500">(ฉัน)</span>}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--text-secondary)]">
                          {r.title || 'วิศวกรฝึกหัดประจำคลัง'} · 🔥 {formatNumber(Number(r.streak) || 0)} วัน · 👏 {formatNumber(Number(r.kudos) || 0)}
                        </span>
                      </span>
                    </button>
                    <span className="hidden flex-shrink-0 gap-1 text-[10.5px] text-[var(--text-secondary)] md:flex">
                      <span title="งานคลัง">📦 {formatNumber(Number(r.work_pts) || 0)}</span>
                      <span title="Supply Drop">🪂 {formatNumber(Number(r.supply_pts) || 0)}</span>
                      <span title="ความต่อเนื่อง">🔥 {formatNumber(Number(r.streak_pts) || 0)}</span>
                      <span title="เทศกาล">🏮 {formatNumber(Number(r.festival_pts) || 0)}</span>
                    </span>
                    <span className="w-14 flex-shrink-0 text-right text-base font-extrabold text-[var(--text-primary)]">{formatNumber(Number(r[key]) || 0)}</span>
                    {!r.is_me && (
                      <button
                        type="button"
                        disabled={r.kudos_today || sent[r.user_id]}
                        onClick={() => kudos(r)}
                        className="flex-shrink-0 rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-50"
                        aria-label={r.kudos_today || sent[r.user_id] ? `ส่งกำลังใจให้ ${nameOf(r)} แล้ววันนี้` : `ส่งกำลังใจให้ ${nameOf(r)}`}
                        title={r.kudos_today || sent[r.user_id] ? 'ส่งแล้ววันนี้ ✓' : 'ส่งกำลังใจ (วันละครั้งต่อคน)'}
                      >
                        {r.kudos_today || sent[r.user_id] ? '✓' : '👏'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {!me && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <EyeOff size={13} /> คุณไม่อยู่ในอันดับ (ซ่อนตัวอยู่ หรือยังไม่มีข้อมูลในช่วงนี้)
              </p>
            )}
          </>
        )}

        <details className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-secondary)]">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">คิดคะแนนอย่างไร (ยุติธรรม โปร่งใส)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>📦 งานคลัง: รายการรับ/จ่ายที่กรอกเอง สินค้าใหม่ และไฟล์นำเข้า (ไฟล์ละ 3 หน่วย) ที่ยังอยู่จริง — 2 คะแนน/หน่วย สูงสุด 15 หน่วย/วัน · การแก้ไขไม่นับ รายการที่ลบไปไม่นับ</li>
            <li>🪂 Supply Drop: 1 คะแนน/กล่อง — ได้จากเวลาทำงานจริง (ไม่ขยับเกิน {60} วินาทีนาฬิกาหยุด) สูงสุด {SUPPLY_DAILY_CAP} กล่อง/วัน ห่างกันอย่างน้อย 8 นาที (เซิร์ฟเวอร์ตรวจ)</li>
            <li>🔥 ความต่อเนื่อง: 3 คะแนนต่อวันที่เข้าใช้งาน (เติมไฟ)</li>
            <li>🏮 เทศกาล: +2 คะแนนต่อ Supply Drop ที่รับในวันเทศกาล</li>
            <li>👏 กำลังใจ: ส่งได้วันละครั้งต่อคน แสดงจำนวนแต่ไม่นับเป็นคะแนน (กันการปั่นคะแนนกันเอง)</li>
            <li>🙈 เลือก “ซ่อนตัวจากอันดับ” ได้ที่แต่งโปรไฟล์ · โหมดทำงานล้วนจะซ่อนหน้านี้ทั้งหมด</li>
          </ul>
        </details>
      </FxBoundary>

      <ProfileModal row={picked} festival={festival} onClose={() => setPicked(null)} onKudos={kudos} sent={picked ? sent[picked.user_id] : false} />
      <EditProfileModal open={editOpen} festival={festival} onClose={() => setEditOpen(false)} onSaved={() => setTimeout(load, 1500)} />
    </SidebarLayout>
  )
}

// a teammate's card: pet, title, theme, worn items, points, kudos
function ProfileModal({ row, festival, onClose, onKudos, sent }) {
  if (!row) return null
  const pet = row.pet && typeof row.pet === 'object' ? row.pet : {}
  const skin = SKINS[normalizeSkin(row.skin)]
  const worn = WARDROBE_SLOT_IDS.map((slot) => ({ slot, item: WARDROBE_BY_ID[pet.wardrobe?.[slot]] }))
  const done = row.kudos_today || sent
  return (
    <Modal open onClose={onClose} title={`โปรไฟล์ · ${nameOf(row)}`}>
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="rk-frame rounded-2xl p-2" data-frame={row.frame || 'none'}>
          <TeamPet row={row} festival={festival} size={110} happy />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold text-[var(--text-primary)]">{nameOf(row)}</div>
          <div className="text-sm text-[var(--text-secondary)]">{row.title || 'วิศวกรฝึกหัดประจำคลัง'}</div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[11px] sm:justify-start">
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-primary)]">
              {SPECIES[pet.species === 'dog' ? 'dog' : 'cat'].emoji} {pet.name || 'ไม่ระบุชื่อ'} · Lv.{Number(pet.level) || 1}
            </span>
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-primary)]">🎨 {skin.label}</span>
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-primary)]">🔥 {formatNumber(Number(row.streak) || 0)} วัน</span>
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-primary)]">👏 {formatNumber(Number(row.kudos) || 0)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {worn.map(({ slot, item }) => (
          <div key={slot} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-2 py-2 text-center">
            <div className="text-[10.5px] text-[var(--text-secondary)]">{WARDROBE_SLOTS[slot].label}</div>
            <div className="text-xl leading-tight">{item ? item.emoji : '🪄'}</div>
            <div className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{item ? item.name : 'อัตโนมัติ'}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        {[
          ['📦 งานคลัง', row.work_pts],
          ['🪂 Supply', row.supply_pts],
          ['🔥 ต่อเนื่อง', row.streak_pts],
          ['🏮 เทศกาล', row.festival_pts],
        ].map(([label, v]) => (
          <div key={label} className="rounded-xl border border-[var(--border-color)] px-2 py-2">
            <div className="text-[var(--text-secondary)]">{label}</div>
            <div className="text-base font-extrabold text-[var(--text-primary)]">{formatNumber(Number(v) || 0)}</div>
          </div>
        ))}
      </div>
      {!row.is_me && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">ส่งกำลังใจ:</span>
          {KUDOS.map((e) => (
            <button
              key={e}
              type="button"
              disabled={done}
              onClick={() => onKudos(row, e)}
              className="rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-base transition hover:bg-[var(--bg-hover)] disabled:opacity-50"
              aria-label={`ส่งกำลังใจ ${e} ให้ ${nameOf(row)}`}
            >
              {e}
            </button>
          ))}
          {done && <span className="text-xs text-emerald-600 dark:text-emerald-400">ส่งแล้ววันนี้ ✓</span>}
        </div>
      )}
    </Modal>
  )
}

// my card: display name · title · frame · hide from ranking · wardrobe
function EditProfileModal({ open, festival, onClose, onSaved }) {
  const pet = usePetStore((s) => s.pet)
  const owner = usePetStore((s) => s.owner)
  const ready = usePetStore((s) => s.ready)
  const skin = useThemeStore((s) => s.skin)
  const [draft, setDraft] = useState(null)
  useEffect(() => {
    if (open && ready) setDraft({ ...pet.profile })
    // only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready])
  if (!open || !ready || !draft) return null
  const ctx = { level: levelInfo(pet.xp).level, streak: pet.streak || 0, unlocked: pet.unlocked || [] }
  const coat = pickCoat(pet.species, owner)
  const outfit = resolveOutfit(festival, pet.wardrobe, skin)
  const save = () => {
    usePetStore.getState().setProfile(draft)
    onSaved?.()
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="แต่งโปรไฟล์ & สัตว์เลี้ยงของฉัน">
      <div className="flex items-start gap-4">
        <div className="rk-frame flex-shrink-0 rounded-2xl p-2" data-frame={draft.frame}>
          <div style={{ width: 90, height: 104, '--gx': 0, '--gy': 0.25 }}>
            <PetSprite species={pet.species} coat={coat} outfit={outfit} pose="walk" happy />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]" htmlFor="rk-name">
            ชื่อที่แสดงในอันดับ (ไม่เกิน {DISPLAY_NAME_MAX} ตัวอักษร — เว้นว่าง = ชื่อผู้ใช้)
          </label>
          <input
            id="rk-name"
            value={draft.displayName}
            maxLength={DISPLAY_NAME_MAX * 2}
            onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
            placeholder={owner || ''}
            className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
          />
          <label className="mt-3 block text-xs font-semibold text-[var(--text-secondary)]" htmlFor="rk-title">
            ฉายา
          </label>
          <select
            id="rk-title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
          >
            {TITLES.map((t) => (
              <option key={t.id} value={t.id} disabled={!profileUnlocked(t, ctx)}>
                {t.label}
                {profileUnlocked(t, ctx) ? '' : ` 🔒 (${t.unlock.level ? `Lv.${t.unlock.level}` : t.unlock.streak ? `สตรีค ${t.unlock.streak} วัน` : 'ท่าลับ'})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 text-xs font-semibold text-[var(--text-secondary)]">กรอบโปรไฟล์</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label="กรอบโปรไฟล์">
        {FRAMES.map((f) => {
          const ok = profileUnlocked(f, ctx)
          const on = draft.frame === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!ok}
              onClick={() => setDraft((d) => ({ ...d, frame: f.id }))}
              className={`rk-frame rounded-xl border px-2 py-2 text-[11px] font-semibold transition disabled:opacity-40 ${on ? 'border-blue-500 text-[var(--text-primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}
              data-frame={f.id}
            >
              {f.label}
              {!ok && ` 🔒 Lv.${f.unlock.level}`}
            </button>
          )
        })}
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2.5">
        <span className="text-xs">
          <span className="block font-semibold text-[var(--text-primary)]">🙈 ซ่อนตัวจากอันดับทีม</span>
          <span className="text-[var(--text-secondary)]">เพื่อนจะไม่เห็นคุณในอันดับและส่งกำลังใจไม่ได้ (คะแนนยังสะสมตามปกติ)</span>
        </span>
        <input type="checkbox" checked={!!draft.hidden} onChange={(e) => setDraft((d) => ({ ...d, hidden: e.target.checked }))} className="h-5 w-5 accent-blue-600" />
      </label>

      <div className="mt-4">
        <Wardrobe festival={festival} />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
          ปิด
        </button>
        <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">
          บันทึกโปรไฟล์
        </button>
      </div>
    </Modal>
  )
}
