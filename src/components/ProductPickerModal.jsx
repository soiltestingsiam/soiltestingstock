import { useEffect, useMemo, useState } from 'react'
import { Search, Layers, ListChecks, X } from 'lucide-react'
import Modal from './Modal'
import { inputClass } from './FormField'
import { useStore } from '../store/useStore'
import { thaiCompare } from '../utils/format'

const PICKER_LIMIT = 100

// "รหัสสินค้า" popup for the item report: type a code and press ค้นหา / Enter to open that
// product's report, or type * and Enter for every product. Partial text lists matches.
// "เลือกหลายรหัส" mode: tick several products, then ยืนยัน → onPick({ multi: true, ids }).
export default function ProductPickerModal({ open, onClose, onPick }) {
  const products = useStore((s) => s.products)
  const [query, setQuery] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [multi, setMulti] = useState(false)
  const [picked, setPicked] = useState(() => new Map()) // id -> product (keeps tick order)

  // always start fresh in "เลือกรหัสเดียว" mode — the modal stays mounted between opens,
  // and a leftover multi mode made Enter only tick codes and * do nothing
  useEffect(() => {
    if (!open) return
    setMulti(false)
    setQuery('')
    setNotFound(false)
    setPicked(new Map())
  }, [open])

  const q = query.trim()
  const isWildcard = q === '*'

  const filtered = useMemo(() => {
    if (!q || isWildcard) return []
    const lower = q.toLowerCase()
    return products
      .filter((p) => p.code.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower))
      .sort((a, b) => thaiCompare(a.code, b.code))
  }, [products, q, isWildcard])

  const shown = filtered.slice(0, PICKER_LIMIT)

  function pick(value) {
    onPick(value)
    setQuery('')
    setNotFound(false)
    setPicked(new Map())
    onClose()
  }

  function togglePicked(p) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(p.id)) next.delete(p.id)
      else next.set(p.id, p)
      return next
    })
  }

  function confirmMulti() {
    if (picked.size === 0) return
    pick({ multi: true, ids: [...picked.keys()] })
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!q) return
    // * means every product in either mode
    if (isWildcard) return pick('ALL')
    const exact =
      products.find((p) => p.code === q) ??
      (() => {
        const loose = products.filter((p) => p.code.toLowerCase() === q.toLowerCase())
        return loose.length === 1 ? loose[0] : null
      })()
    const hit = exact ?? (filtered.length === 1 ? filtered[0] : null)
    if (hit && multi) {
      // multi mode: Enter on an exact code ticks it and clears the box for the next code
      togglePicked(hit)
      setQuery('')
      return
    }
    if (hit) return pick(hit)
    setNotFound(filtered.length === 0)
  }

  return (
    <Modal open={open} onClose={onClose} title="รหัสสินค้า">
      <div className="mb-3 flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-1">
        {[
          [false, 'เลือกรหัสเดียว'],
          [true, 'เลือกหลายรหัส'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setMulti(value)
              setNotFound(false)
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
              multi === value ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {value && <ListChecks size={14} />} {label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSearch}>
        <p className="mb-2 text-sm text-[var(--text-muted)]">
          {multi
            ? 'ค้นหาแล้วติ๊กเลือกรหัสที่ต้องการ (กรอกรหัสตรงแล้ว Enter เพื่อติ๊กได้เลย) จากนั้นกดยืนยัน'
            : 'กรอกรหัสสินค้าลงไป ข้อมูลจะเด้งเป็นรายงานสินค้าและวัตถุดิบของรหัสนั้น'}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setNotFound(false)
              }}
              placeholder="รหัสสินค้า หรือ * เพื่อดูทั้งหมด"
              className={inputClass('pl-9')}
            />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500">
            ค้นหา
          </button>
        </div>
        {!multi && (
          <p className="mt-2 text-xs text-[var(--text-faint)]">
            ถ้าไม่ทราบรหัสสินค้า ให้ใส่ * (ดอกจัน) แล้ว Enter เพื่อแสดงข้อมูลรหัสสินค้าทุกรายการ
          </p>
        )}
      </form>

      {multi && (
        <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">เลือกแล้ว {picked.size.toLocaleString('th-TH')} รหัส</span>
            {picked.size > 0 && (
              <button type="button" onClick={() => setPicked(new Map())} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                ล้างที่เลือก
              </button>
            )}
          </div>
          {picked.size > 0 && (
            <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {[...picked.values()].map((p) => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 font-mono text-[11px] text-blue-300">
                  {p.code}
                  <button type="button" onClick={() => togglePicked(p)} aria-label={`เอา ${p.code} ออก`} className="hover:text-[var(--text-primary)]">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={confirmMulti}
            disabled={picked.size === 0}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ยืนยัน ({picked.size.toLocaleString('th-TH')} รหัส)
          </button>
        </div>
      )}

      {notFound && <p className="mt-3 text-sm text-amber-300">ไม่พบรหัสสินค้า "{q}"</p>}

      {isWildcard && (
        <button
          onClick={() => pick('ALL')}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-left transition hover:bg-blue-500/20"
        >
          <Layers size={16} className="text-blue-300" />
          <span className="text-sm text-[var(--text-secondary)]">สินค้าทั้งหมด (All Products)</span>
        </button>
      )}

      {shown.length > 0 && (
        <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-[var(--border-color)]">
          {shown.map((p) => (
            <button
              key={p.code}
              onClick={() => (multi ? togglePicked(p) : pick(p))}
              className="flex w-full items-center justify-between gap-3 border-b border-[var(--border-color-soft)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--bg-hover)]"
            >
              {multi && (
                <input type="checkbox" readOnly tabIndex={-1} checked={picked.has(p.id)} className="pointer-events-none h-4 w-4 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-[var(--text-accent)]">{p.code}</div>
                <div className="text-sm text-[var(--text-secondary)]">{p.name}</div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{p.unit}</div>
            </button>
          ))}
          {filtered.length > PICKER_LIMIT && (
            <div className="px-4 py-3 text-center text-xs text-[var(--text-faint)]">
              แสดง {PICKER_LIMIT} จาก {filtered.length.toLocaleString('th-TH')} รายการ — พิมพ์ให้ละเอียดขึ้นเพื่อค้นหาให้แคบลง
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
