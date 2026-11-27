import { useCallback, useMemo, useState } from 'react'
import { Search, AlertTriangle, ScanLine, Pencil } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import { inputClass } from '../components/FormField'
import QrScannerModal from '../components/QrScannerModal'
import Pagination, { usePagination } from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import ProductThumbnail from '../components/ProductThumbnail'
import ProductEditModal from '../components/ProductEditModal'
import { useMediaQuery, PHONE_QUERY } from '../utils/useMediaQuery'
import { useStore } from '../store/useStore'
import { buildStockRows } from '../utils/stockStatus'
import { thaiCompare, formatNumber } from '../utils/format'

export default function Stock() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)

  const [query, setQuery] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  // แก้ไขสินค้า / รูปภาพ (details + photo) and phone layout
  const [editing, setEditing] = useState(null)
  const [savedMsg, setSavedMsg] = useState('')
  const phone = useMediaQuery(PHONE_QUERY)

  const allRows = useMemo(() => buildStockRows(products, stockIns, stockOuts), [products, stockIns, stockOuts])

  const lowStockCount = useMemo(() => allRows.filter((r) => r.low).length, [allRows])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows
      .filter((p) => !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        // low-stock items pinned to top; each group otherwise A-Z / ก-ฮ
        if (a.low !== b.low) return a.low ? -1 : 1
        return thaiCompare(a.code, b.code)
      })
  }, [allRows, query])

  const page = usePagination(rows, 100, query)

  const handleScan = useCallback((text) => setQuery(text), [])

  return (
    <SidebarLayout
      title="สินค้าคงเหลือ"
      backTo="/"
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>สินค้าทั้งหมด {formatNumber(allRows.length)} รายการ</span>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-red-400">
              <AlertTriangle size={14} /> สินค้าเหลือน้อย: {formatNumber(lowStockCount)} รายการ
            </span>
          )}
        </span>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาโดยใช้รหัสสินค้า (SKU) หรือชื่อผลิตภัณฑ์..."
            className={inputClass('pl-9')}
          />
        </div>
        <button
          onClick={() => setScanOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <ScanLine size={16} /> สแกนคิวอาร์
        </button>
      </div>

      {savedMsg && (
        <div className="mb-3 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-300" role="status">
          {savedMsg}
        </div>
      )}
      {phone ? (
        // phone: one card per product — photo left; code, name, balance and status right
        <ul className="flex flex-col gap-2">
          {page.pageItems.map((r) => (
            <li key={r.id} className="stock-card flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
              <ProductThumbnail product={r} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-mono text-sm font-semibold ${r.low ? 'text-red-400' : 'text-[var(--text-accent)]'}`}>{r.code}</span>
                  <EditButton row={r} onEdit={setEditing} />
                </div>
                <div className="break-words text-sm text-[var(--text-primary)]">{r.name}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span>
                    คงเหลือ <b className={`text-sm ${r.low ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{formatNumber(r.qty)}</b> {r.unit}
                  </span>
                  <span>
                    เข้า {formatNumber(r.inQty)} · ออก {formatNumber(r.outQty)}
                  </span>
                  <StatusBadge row={r} />
                </div>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="rounded-xl border border-[var(--border-color)] px-4 py-6">
              <EmptyState title="ไม่พบสินค้า" hint={query.trim() ? 'ลองค้นหาด้วยรหัสหรือชื่ออื่น หรือสแกน QR ดูนะ' : 'ยังไม่มีสินค้าในระบบ'} />
            </li>
          )}
        </ul>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
        <table className="w-full min-w-[720px] text-sm [&_th]:whitespace-nowrap [&_td:not(:nth-child(3))]:whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--bg-surface-soft)] text-left text-[var(--text-secondary)]">
              <th className="w-14 px-3 py-3 font-medium">
                <span className="sr-only">รูปสินค้า</span>
              </th>
              <th className="px-4 py-3 font-medium">รหัสสินค้า</th>
              <th className="px-4 py-3 font-medium">ชื่อผลิตภัณฑ์</th>
              <th className="px-4 py-3 text-right font-medium">เข้า</th>
              <th className="px-4 py-3 text-right font-medium">ออก</th>
              <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
              <th className="px-3 py-3 text-center font-medium">
                <span className="sr-only">แก้ไข</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {page.pageItems.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-[var(--border-color-soft)] hover:bg-[var(--bg-hover)] ${
                  r.low ? 'text-red-400' : 'text-[var(--text-primary)]'
                }`}
              >
                <td className="px-3 py-2">
                  <ProductThumbnail product={r} size="sm" />
                </td>
                <td className={`px-4 py-3 font-mono ${r.low ? 'text-red-400' : 'text-[var(--text-accent)]'}`}>{r.code}</td>
                <td className="max-w-[320px] whitespace-normal break-words px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-right">{formatNumber(r.inQty)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(r.outQty)}</td>
                <td className="px-4 py-3 text-right font-bold">{formatNumber(r.qty)}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge row={r} />
                </td>
                <td className="px-3 py-3 text-center">
                  <EditButton row={r} onEdit={setEditing} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  <EmptyState title="ไม่พบสินค้า" hint={query.trim() ? 'ลองค้นหาด้วยรหัสหรือชื่ออื่น หรือสแกน QR ดูนะ' : 'ยังไม่มีสินค้าในระบบ'} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        totalItems={rows.length}
        onFirst={page.goFirst}
        onPrev={page.goPrev}
        onNext={page.goNext}
        onLast={page.goLast}
      />

      <QrScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onResult={handleScan} />
      {editing && (
        <ProductEditModal
          product={editing}
          onClose={(result) => {
            setEditing(null)
            if (result === 'saved') {
              setSavedMsg(`บันทึกสินค้า ${editing.code} เรียบร้อย`)
              setTimeout(() => setSavedMsg(''), 3500)
            }
          }}
        />
      )}
    </SidebarLayout>
  )
}

// opens แก้ไขสินค้า / รูปภาพ for this product
function EditButton({ row, onEdit }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(row)}
      title="แก้ไขสินค้า / รูปภาพ"
      aria-label={`แก้ไขสินค้า / รูปภาพ ${row.code}`}
      className="print-hide inline-flex flex-shrink-0 items-center justify-center rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
    >
      <Pencil size={15} />
    </button>
  )
}

// Field-Ready / Lab status aura: the same rule as before (stockStatus.js), shown as a pill
// with a soft glowing dot — ready (green) · near reorder (amber) · out / below zero (red,
// "ติดลบ · ตรวจสอบ" when the balance went negative). The glow is screen-only.
function StatusBadge({ row }) {
  if (!row.hasMovement) return <span className="text-xs text-[var(--text-faint)]">ยังไม่มีสต๊อก</span>
  const [state, label, cls, tip] =
    row.qty < 0
      ? ['negative', 'ติดลบ · ตรวจสอบ', 'bg-red-500/15 text-red-400', 'ยอดติดลบ — อาจยังไม่ได้บันทึกรับเข้า ตรวจสอบรายการ']
      : row.qty <= 0
      ? ['out', 'หมดสต๊อก', 'bg-red-500/15 text-red-400', 'หมดสต๊อก — เติมก่อนเบิกออกภาคสนาม']
      : row.low
      ? ['reorder', 'ใกล้หมด', 'bg-amber-500/15 text-amber-300', 'ใกล้จุดสั่งซื้อ — วางแผนเติมสต๊อก']
      : ['ready', 'ปกติ', 'bg-emerald-500/15 text-emerald-300', 'Field-Ready — พร้อมใช้งาน / ออกภาคสนาม']
  return (
    <span className={`stock-aura inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`} data-state={state} title={tip}>
      <span className="stock-aura-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
