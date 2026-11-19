import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FileSpreadsheet, History, Loader2, RefreshCw, Search, ShieldAlert, X } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import DateTextInput from '../components/DateTextInput'
import { inputClass } from '../components/FormField'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { ddmmyyyyToDate } from '../utils/date'
import { formatNumber } from '../utils/format'
import { exportAoaToExcel } from '../utils/export'
import { ACTION_LABELS, CATEGORY_LABELS, actorLabel, describeEntry, detailRows } from '../utils/auditLog'

// LOG การใช้งาน (admins only): who added / edited / deleted what, from public.audit_log,
// which database triggers fill on every change (supabase/migrations/003_audit_log.sql).

const PAGE_SIZE = 50
const EXPORT_LIMIT = 20000

const ACTION_STYLES = {
  INSERT: 'bg-emerald-500/15 text-emerald-300',
  UPDATE: 'bg-sky-500/15 text-sky-300',
  DELETE: 'bg-red-500/15 text-red-300',
}

const emptyFilters = { actorId: '', category: '', action: '', code: '', from: '', to: '', hideImportRows: false }

function isMissingTableError(error) {
  const msg = `${error?.code ?? ''} ${error?.message ?? ''}`
  return /PGRST205|42P01|audit_log/.test(msg)
}

// Applies the filters to a supabase query on audit_log.
function applyFilters(query, f) {
  let q = query
  if (f.actorId) q = q.eq('actor_id', f.actorId)
  if (f.category) q = q.eq('category', f.category)
  if (f.action) q = q.eq('action', f.action)
  const code = f.code.trim().replace(/[,()*%]/g, '')
  if (code) q = q.or(`product_code.ilike.*${code}*,record_label.ilike.*${code}*`)
  const from = ddmmyyyyToDate(f.from)
  if (from) q = q.gte('created_at', from.toISOString())
  const to = ddmmyyyyToDate(f.to)
  if (to) q = q.lt('created_at', new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).toISOString())
  // single rows written by a file import (the import itself stays: category นำเข้าไฟล์)
  if (f.hideImportRows) q = q.or('new_data->>source.is.null,new_data->>source.neq.import')
  return q
}

function formatWhen(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' })
}

export default function AuditLog() {
  const profiles = useAuthStore((s) => s.profiles)
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [missingTable, setMissingTable] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set())
  const [newCount, setNewCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const pageRef = useRef(page)
  pageRef.current = page

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setLoading(true)
    const start = (page - 1) * PAGE_SIZE
    const { data, error: err, count } = await applyFilters(
      supabase.from('audit_log').select('*', { count: 'exact' }),
      filters,
    )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(start, start + PAGE_SIZE - 1)
    setLoading(false)
    if (err) {
      setMissingTable(isMissingTableError(err))
      setError(err.message)
      return
    }
    setError(null)
    setMissingTable(false)
    setRows(data ?? [])
    setTotal(count ?? 0)
    setNewCount(0)
  }, [page, filters])

  useEffect(() => {
    load()
  }, [load])

  // live: new entries reload page 1 (debounced, imports write many rows at once); on other
  // pages a "มีรายการใหม่" counter appears on the refresh button instead
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let timer = null
    const channel = supabase
      .channel('sts-audit-log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => {
        if (pageRef.current === 1) {
          clearTimeout(timer)
          timer = setTimeout(() => load(), 800)
        } else {
          setNewCount((n) => n + 1)
        }
      })
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [load])

  const actorOptions = useMemo(
    () => [...profiles].sort((a, b) => a.username.localeCompare(b.username)),
    [profiles],
  )

  function applyDraft(e) {
    e?.preventDefault()
    setPage(1)
    setExpanded(new Set())
    setFilters({ ...draft })
  }

  function clearFilters() {
    setDraft(emptyFilters)
    setPage(1)
    setFilters(emptyFilters)
  }

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = []
      for (let start = 0; start < EXPORT_LIMIT; start += 1000) {
        const { data, error: err } = await applyFilters(supabase.from('audit_log').select('*'), filters)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(start, start + 999)
        if (err) throw err
        all.push(...(data ?? []))
        if (!data || data.length < 1000) break
      }
      const aoa = [
        ['LOG การใช้งาน'],
        [],
        ['วันเวลา', 'ผู้ใช้', 'การกระทำ', 'ประเภท', 'รหัส / รายการ', 'รายละเอียด'],
        ...all.map((r) => [
          formatWhen(r.created_at),
          actorLabel(r),
          ACTION_LABELS[r.action] ?? r.action,
          CATEGORY_LABELS[r.category] ?? r.category,
          r.record_label ?? '',
          describeEntry(r),
        ]),
      ]
      exportAoaToExcel(aoa, 'activity-log.xlsx', 'Log')
    } catch (err) {
      alert(`Export ไม่สำเร็จ: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(emptyFilters)

  return (
    <SidebarLayout title="LOG การใช้งาน" subtitle="ดูว่าใครเพิ่ม แก้ไข หรือลบข้อมูลอะไร เมื่อไหร่ (เฉพาะผู้ดูแลระบบ)">
      {missingTable ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-300">
            <ShieldAlert size={18} /> ยังไม่ได้ติดตั้งระบบ LOG ในฐานข้อมูล
          </div>
          <p className="text-[var(--text-secondary)]">
            ให้เปิด Supabase → SQL Editor → New query แล้ววางเนื้อหาไฟล์{' '}
            <code className="rounded bg-[var(--bg-surface-soft)] px-1">supabase/migrations/003_audit_log.sql</code> แล้วกด Run
            ครั้งเดียว จากนั้นกลับมาหน้านี้ (ระบบจะเริ่มบันทึก LOG ตั้งแต่ตอนที่รัน)
          </p>
        </div>
      ) : (
        <>
          <form
            onSubmit={applyDraft}
            className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              ผู้ใช้
              <select value={draft.actorId} onChange={(e) => setDraft((d) => ({ ...d, actorId: e.target.value }))} className={inputClass()}>
                <option value="">ทุกคน</option>
                {actorOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              ประเภท
              <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className={inputClass()}>
                <option value="">ทั้งหมด</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              การกระทำ
              <select value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))} className={inputClass()}>
                <option value="">ทั้งหมด</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              รหัสสินค้า / ชื่อผู้ใช้ / ชื่อไฟล์
              <input
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder="เช่น STS-C050.1"
                className={inputClass()}
              />
            </label>
            <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              ตั้งแต่วันที่
              <DateTextInput value={draft.from} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} placeholder="ทั้งหมด" />
            </div>
            <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              ถึงวันที่
              <DateTextInput value={draft.to} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} placeholder="ปัจจุบัน" />
            </div>
            <label className="flex items-center gap-2 self-end pb-2.5 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={draft.hideImportRows}
                onChange={(e) => setDraft((d) => ({ ...d, hideImportRows: e.target.checked }))}
              />
              ซ่อนรายการย่อยจากการนำเข้าไฟล์
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
                <Search size={14} /> ค้นหา
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <X size={14} /> ล้าง
                </button>
              )}
            </div>
          </form>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <History size={14} /> {loading ? 'กำลังโหลด...' : `พบ ${formatNumber(total)} รายการ`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => load()}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)]"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
                {newCount > 0 && (
                  <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">+{newCount}</span>
                )}
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || total === 0}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} EXPORT - EXCEL
              </button>
            </div>
          </div>

          {error && <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">โหลด LOG ไม่สำเร็จ: {error}</div>}

          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="bg-[var(--bg-card-alt)] text-left text-xs text-[var(--text-muted)]">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-3 py-3 font-medium">วันเวลา</th>
                  <th className="px-3 py-3 font-medium">ผู้ใช้</th>
                  <th className="px-3 py-3 font-medium">การกระทำ</th>
                  <th className="px-3 py-3 font-medium">ประเภท</th>
                  <th className="px-3 py-3 font-medium">รหัส / รายการ</th>
                  <th className="px-3 py-3 font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = expanded.has(r.id)
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => toggle(r.id)}
                        className="cursor-pointer border-t border-[var(--border-color-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                      >
                        <td className="px-2 py-2.5 text-[var(--text-muted)]">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-secondary)]">{formatWhen(r.created_at)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium">{actorLabel(r)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACTION_STYLES[r.action] ?? ''}`}>
                            {ACTION_LABELS[r.action] ?? r.action}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-secondary)]">{CATEGORY_LABELS[r.category] ?? r.category}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-[var(--text-accent)]">{r.record_label ?? '-'}</td>
                        <td className="max-w-[460px] whitespace-normal break-words px-3 py-2.5 text-xs text-[var(--text-secondary)]">{describeEntry(r)}</td>
                      </tr>
                      {open && (
                        <tr className="border-t border-[var(--border-color-soft)] bg-[var(--bg-surface-soft)]">
                          <td />
                          <td colSpan={6} className="px-3 py-3">
                            <DetailTable entry={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {!loading && rows.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <EmptyState title={hasFilters ? 'ไม่พบ LOG ตามเงื่อนไขที่ค้นหา' : 'ยังไม่มี LOG (ระบบเริ่มบันทึกตั้งแต่ติดตั้ง 003_audit_log.sql)'} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            onFirst={() => setPage(1)}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onLast={() => setPage(totalPages)}
          />
        </>
      )}
    </SidebarLayout>
  )
}

// Field-by-field view of one entry: ก่อน / หลัง for edits (changed fields highlighted),
// the saved values for additions, the removed values for deletions.
function DetailTable({ entry }) {
  const rows = detailRows(entry)
  const isUpdate = entry.action === 'UPDATE'
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr className="text-left text-[var(--text-muted)]">
            <th className="py-1 pr-6 font-medium">ข้อมูล</th>
            {isUpdate ? (
              <>
                <th className="py-1 pr-6 font-medium">ก่อนแก้ไข</th>
                <th className="py-1 pr-6 font-medium">หลังแก้ไข</th>
              </>
            ) : (
              <th className="py-1 pr-6 font-medium">{entry.action === 'DELETE' ? 'ข้อมูลที่ถูกลบ' : 'ข้อมูลที่เพิ่ม'}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className={r.changed ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
              <td className="py-1 pr-6">
                {r.label}
                {r.changed && <span className="ml-1 text-sky-300">•</span>}
              </td>
              {isUpdate ? (
                <>
                  <td className="py-1 pr-6">{r.before}</td>
                  <td className="py-1 pr-6">{r.after}</td>
                </>
              ) : (
                <td className="py-1 pr-6">{entry.action === 'DELETE' ? r.before : r.after}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
