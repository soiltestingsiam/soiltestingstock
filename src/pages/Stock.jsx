import { useCallback, useMemo, useState } from 'react'
import { Search, AlertTriangle, ScanLine } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import { inputClass } from '../components/FormField'
import QrScannerModal from '../components/QrScannerModal'
import Pagination, { usePagination } from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import { useStore } from '../store/useStore'
import { buildStockRows } from '../utils/stockStatus'
import { thaiCompare, formatNumber } from '../utils/format'

export default function Stock() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)

  const [query, setQuery] = useState('')
  const [scanOpen, setScanOpen] = useState(false)

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

      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
        <table className="w-full min-w-[640px] text-sm [&_th]:whitespace-nowrap [&_td:not(:nth-child(2))]:whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--bg-surface-soft)] text-left text-[var(--text-secondary)]">
              <th className="px-4 py-3 font-medium">รหัสสินค้า</th>
              <th className="px-4 py-3 font-medium">ชื่อผลิตภัณฑ์</th>
              <th className="px-4 py-3 text-right font-medium">เข้า</th>
              <th className="px-4 py-3 text-right font-medium">ออก</th>
              <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
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
                <td className={`px-4 py-3 font-mono ${r.low ? 'text-red-400' : 'text-[var(--text-accent)]'}`}>{r.code}</td>
                <td className="max-w-[320px] whitespace-normal break-words px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-right">{formatNumber(r.inQty)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(r.outQty)}</td>
                <td className="px-4 py-3 text-right font-bold">{formatNumber(r.qty)}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge row={r} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <EmptyState title="ไม่พบสินค้า" hint={query.trim() ? 'ลองค้นหาด้วยรหัสหรือชื่ออื่น หรือสแกน QR ดูนะ' : 'ยังไม่มีสินค้าในระบบ'} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
    </SidebarLayout>
  )
}

function StatusBadge({ row }) {
  if (!row.hasMovement) return <span className="text-xs text-[var(--text-faint)]">ยังไม่มีสต๊อก</span>
  const [label, cls] =
    row.qty <= 0
      ? ['หมดสต๊อก', 'bg-red-500/15 text-red-400']
      : row.low
      ? ['ใกล้หมด', 'bg-amber-500/15 text-amber-300']
      : ['ปกติ', 'bg-emerald-500/15 text-emerald-300']
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>{label}</span>
}
