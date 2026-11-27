import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, CalendarRange } from 'lucide-react'
import { inputClass } from './FormField'
import DateTextInput from './DateTextInput'
import EmptyState from './EmptyState'
import { useStore } from '../store/useStore'
import { useCostedStockOuts } from '../store/useCostedStockOuts'
import { ddmmyyyyToSortable, toThaiDate } from '../utils/date'
import ProductThumbnail from './ProductThumbnail'
import { formatMoney, formatNumber } from '../utils/format'

const TYPE_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'in', label: 'รับเข้า' },
  { key: 'out', label: 'จ่ายออก' },
]

// Search / edit / delete every row keyed in on the Stock In and Stock Out pages.
export default function TransactionSearchPanel({ initialType = 'all', onBeforeNavigate, tableMaxHeight }) {
  const stockIns = useStore((s) => s.stockIns)
  // product photos (display only) by product id
  const products = useStore((s) => s.products)
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  // จ่ายออก rows show their FIFO cost, matching the reports
  const stockOuts = useCostedStockOuts()
  const deleteStockIn = useStore((s) => s.deleteStockIn)
  const deleteStockOut = useStore((s) => s.deleteStockOut)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [type, setType] = useState(initialType) // all | in | out
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const combined = useMemo(() => {
    const ins = stockIns.map((t) => ({
      type: 'in',
      id: t.id,
      date: t.date,
      productId: t.productId,
      productCode: t.productCode,
      productName: t.productName,
      docNo: t.po,
      party: t.supplier,
      soLot: t.soLot,
      qty: t.qty,
      price: t.price,
      total: t.total,
      note: t.note,
    }))
    const outs = stockOuts.map((t) => ({
      type: 'out',
      id: t.id,
      date: t.date,
      productId: t.productId,
      productCode: t.productCode,
      productName: t.productName,
      docNo: t.invoice || t.so,
      party: t.customer,
      soLot: t.so,
      qty: t.qty,
      price: t.price,
      total: t.total,
      note: t.note,
    }))
    return [...ins, ...outs].sort(
      (a, b) => (ddmmyyyyToSortable(b.date) ?? 0) - (ddmmyyyyToSortable(a.date) ?? 0),
    )
  }, [stockIns, stockOuts])

  const fromSortable = ddmmyyyyToSortable(from)
  const toSortable = ddmmyyyyToSortable(to)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return combined.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      const d = ddmmyyyyToSortable(r.date)
      if (fromSortable && (d === null || d < fromSortable)) return false
      if (toSortable && (d === null || d > toSortable)) return false
      if (!q) return true
      return [r.productCode, r.productName, r.docNo, r.party, r.soLot, r.note, toThaiDate(r.date)].some((v) =>
        String(v ?? '').toLowerCase().includes(q),
      )
    })
  }, [combined, query, type, fromSortable, toSortable])

  function handleEdit(row) {
    onBeforeNavigate?.()
    navigate(`${row.type === 'in' ? '/stock-in' : '/stock-out'}?edit=${row.id}`)
  }

  function handleDelete(row) {
    if (!confirm(`ลบรายการ ${row.productCode} วันที่ ${toThaiDate(row.date)} ใช่หรือไม่? รายงานทั้งหมดจะอัปเดตทันที`)) return
    if (row.type === 'in') deleteStockIn(row.id)
    else deleteStockOut(row.id)
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหารหัสสินค้า / ชื่อสินค้า / เลขเอกสาร / ผู้ขาย-ลูกค้า / หมายเหตุ"
            className={inputClass('pl-9')}
          />
        </div>
        <div className="flex gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setType(opt.key)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                type === opt.key
                  ? 'border-blue-500/50 bg-blue-500/15 text-[var(--text-accent)]'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex items-center gap-2 pt-2.5 text-[var(--text-muted)]">
          <CalendarRange size={16} />
          <span className="text-xs">ช่วงวันที่ (ไม่ระบุ = ทั้งหมด)</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-40">
            <DateTextInput value={from} onChange={setFrom} placeholder="ตั้งแต่ (พ.ศ.)" />
          </div>
          <span className="pt-2.5 text-[var(--text-faint)]">—</span>
          <div className="w-40">
            <DateTextInput value={to} onChange={setTo} placeholder="ถึง (พ.ศ.)" />
          </div>
        </div>
        <div className="pt-2.5 text-xs text-[var(--text-faint)] sm:ml-auto">พบ {formatNumber(filtered.length)} รายการ</div>
      </div>

      <div className={`overflow-auto rounded-xl border border-[var(--border-color)] ${tableMaxHeight ?? ''}`}>
        <table className="w-full min-w-[1100px] text-sm [&_td:not(:nth-child(4))]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="sticky top-0 bg-[var(--bg-card-alt)] text-left text-[var(--text-secondary)]">
              <th className="px-3 py-3 font-medium">ประเภท</th>
              <th className="px-3 py-3 font-medium">วันที่</th>
              <th className="px-3 py-3 font-medium">รหัสสินค้า</th>
              <th className="px-3 py-3 font-medium">ชื่อสินค้า</th>
              <th className="px-3 py-3 font-medium">เลขเอกสาร</th>
              <th className="px-3 py-3 font-medium">ผู้ขาย / ลูกค้า</th>
              <th className="px-3 py-3 text-right font-medium">จำนวน</th>
              <th className="px-3 py-3 text-right font-medium">ราคา/หน่วย</th>
              <th className="px-3 py-3 text-right font-medium">มูลค่า</th>
              <th className="px-3 py-3 font-medium">หมายเหตุ</th>
              <th className="px-3 py-3 text-center font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.type}-${r.id}`} className="border-t border-[var(--border-color-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                <td className="px-3 py-3">
                  {r.type === 'in' ? (
                    <span className="flex items-center gap-1 text-orange-400">
                      <ArrowDownCircle size={14} /> รับเข้า
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sky-400">
                      <ArrowUpCircle size={14} /> จ่ายออก
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">{toThaiDate(r.date)}</td>
                <td className="px-3 py-2 font-mono text-[var(--text-accent)]">
                  <span className="flex items-center gap-2">
                    <ProductThumbnail product={{ ...(productById.get(r.productId) || {}), code: r.productCode, name: r.productName }} size="xs" />
                    {r.productCode}
                  </span>
                </td>
                <td className="max-w-[260px] whitespace-normal break-words px-3 py-3">{r.productName}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{r.docNo || '-'}</td>
                <td className="px-3 py-3 text-[var(--text-secondary)]">{r.party || '-'}</td>
                <td className="px-3 py-3 text-right">{formatNumber(r.qty)}</td>
                <td className="px-3 py-3 text-right">{formatMoney(r.price)}</td>
                <td className="px-3 py-3 text-right font-semibold">{formatMoney(r.total)}</td>
                <td className="px-3 py-3 text-[var(--text-muted)]">{r.note || ''}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(r)}
                      title="แก้ไข"
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      title="ลบ"
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6">
                  <EmptyState title="ไม่พบรายการ" hint="ลองเปลี่ยนคำค้นหรือช่วงวันที่ดูนะ" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
