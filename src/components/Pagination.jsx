import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { formatNumber } from '../utils/format'

// Real paged navigation (100 rows/page by default) to replace the old "show N more" pattern.
// `resetKey` jumps back to page 1 whenever a search/filter changes.
export function usePagination(items, pageSize = 100, resetKey) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page_ = Math.min(page, totalPages)
  const start = (page_ - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return {
    page: page_,
    totalPages,
    pageItems,
    goFirst: () => setPage(1),
    goPrev: () => setPage((p) => Math.max(1, p - 1)),
    goNext: () => setPage((p) => Math.min(totalPages, p + 1)),
    goLast: () => setPage(totalPages),
    // jump straight to a page (1-based), clamped to the valid range
    goTo: (n) => setPage(Math.min(totalPages, Math.max(1, Math.floor(Number(n)) || 1))),
  }
}

const btnClass =
  'flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export default function Pagination({ page, totalPages, totalItems, onFirst, onPrev, onNext, onLast }) {
  if (totalItems === 0) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-[var(--text-muted)]">ทั้งหมด {formatNumber(totalItems)} รายการ</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onFirst} disabled={page <= 1} className={btnClass} title="หน้าแรก">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" onClick={onPrev} disabled={page <= 1} className={btnClass}>
          <ChevronLeft size={14} /> ก่อนหน้า
        </button>
        <span className="px-2 text-sm font-medium text-[var(--text-primary)]">
          หน้า {formatNumber(page)} จาก {formatNumber(totalPages)}
        </span>
        <button type="button" onClick={onNext} disabled={page >= totalPages} className={btnClass}>
          ถัดไป <ChevronRight size={14} />
        </button>
        <button type="button" onClick={onLast} disabled={page >= totalPages} className={btnClass} title="หน้าสุดท้าย">
          หน้าสุดท้าย <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}
