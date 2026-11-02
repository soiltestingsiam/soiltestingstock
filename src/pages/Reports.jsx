import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, FileDown, PackageSearch, CalendarRange, ClipboardList, ArrowLeft, ArrowRight, Search, Loader2, XCircle } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import ProductPickerModal from '../components/ProductPickerModal'
import DateTextInput from '../components/DateTextInput'
import Pagination, { usePagination } from '../components/Pagination'
import { useStore } from '../store/useStore'
import { buildItemLedger, buildAllStockSummary, groupByProduct, movementsForProduct, filterForProduct } from '../utils/stockCalc'
import { ddmmyyyyToSortable, todayDDMMYYYY, toThaiDate } from '../utils/date'
import { formatMoney, formatNumber, thaiCompare } from '../utils/format'
import { exportAoaToExcel, exportElementToPdf, exportElementsToPdf } from '../utils/export'

const REPORT_OPTIONS = [
  {
    key: 'item',
    title: 'รายงานสินค้าและวัตถุดิบ',
    subtitle: 'รายงานรายตัว (Individual Product Report)',
    description: 'ดูรายการเคลื่อนไหวรับ-จ่ายและยอดคงเหลือของสินค้าแต่ละรายการ',
  },
  {
    key: 'summary',
    title: 'สรุปยอดสินค้าคงเหลือ รวมทุกคลัง',
    subtitle: 'All-Stock Summary Report',
    description: 'สรุปยอดยกมา ซื้อ ออก และคงเหลือของสินค้าทุกรายการ ตามช่วงวันที่',
  },
]

function startOfYear() {
  return '01/01/' + new Date().getFullYear()
}

export default function Reports() {
  const [view, setView] = useState(null) // null | 'item' | 'summary'

  return (
    <SidebarLayout title="รายงาน (Reports)">
      {!view && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setView(opt.key)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-left shadow-card transition hover:-translate-y-1 hover:border-[var(--border-color-strong)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white">
                <ClipboardList size={22} />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{opt.title}</div>
                <div className="mt-0.5 text-xs font-medium text-[var(--text-accent)]">{opt.subtitle}</div>
                <div className="mt-2 text-sm text-[var(--text-muted)]">{opt.description}</div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-blue-400">
                เปิดรายงาน <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {view && (
        <div>
          <button
            onClick={() => setView(null)}
            className="mb-5 flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={15} /> กลับไปเลือกรายงาน
          </button>
          {view === 'item' ? <ItemLedgerReport /> : <AllStockSummaryReport />}
        </div>
      )}
    </SidebarLayout>
  )
}

function ExportButtons({ onPdf, onExcel, count = 0, busy = false }) {
  const suffix = count > 0 ? ` (เลือก ${formatNumber(count)})` : ''
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onPdf}
        disabled={busy}
        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} EXPORT - PDF{suffix}
      </button>
      <button
        onClick={onExcel}
        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
      >
        <FileSpreadsheet size={14} /> EXPORT - EXCEL{suffix}
      </button>
    </div>
  )
}

// ---------- multi-select (ติ๊กเลือกหลายรหัส แล้ว export เฉพาะที่เลือก) ----------

// A Set of product ids that survives paging. `resetKey` empties it (e.g. a new report).
function useSelection(resetKey) {
  const [ids, setIds] = useState(() => new Set())
  useEffect(() => {
    setIds(new Set())
  }, [resetKey])
  return {
    ids,
    toggle: (id) =>
      setIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    setAll: (allIds, on) => setIds(on ? new Set(allIds) : new Set()),
    clear: () => setIds(new Set()),
  }
}

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      title={label}
      className="h-4 w-4 cursor-pointer align-middle accent-blue-600"
    />
  )
}

// "เลือกแล้ว N รายการ · ล้างที่เลือก" strip shown while anything is ticked.
function SelectionInfo({ count, onClear }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs">
      <span className="font-semibold text-blue-300">เลือกแล้ว {formatNumber(count)} รายการ</span>
      <button onClick={onClear} className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <XCircle size={13} /> ล้างที่เลือก
      </button>
    </div>
  )
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

// Renders a PDF job's content in a container parked off-screen, then hands every
// [data-pdf-chunk] inside it to exportElementsToPdf (so the PDF holds ALL selected rows,
// not just the page currently on screen). `job` = { filename } | null.
function OffscreenPdf({ job, width, onDone, children }) {
  const ref = useRef(null)
  const ran = useRef(null)
  useEffect(() => {
    if (!job || ran.current === job) return
    ran.current = job
    ;(async () => {
      try {
        // let fonts/layout settle before capturing
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        await exportElementsToPdf([...ref.current.querySelectorAll('[data-pdf-chunk]')], job.filename)
      } finally {
        onDone()
      }
    })()
  }, [job, onDone])
  if (!job) return null
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'absolute', left: '-99999px', top: 0, width }}>
      {children}
    </div>
  )
}

// Date range inputs + "ค้นหาตามวันที่": the range only applies when the button is pressed
// (or Enter), so half-typed dates don't reshuffle the report.
// `optional`: blank dates are allowed and mean "from the beginning" / "up to now".
function DateRangeBar({ from, to, onApply, optional = false }) {
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)

  function apply(e) {
    e.preventDefault()
    const blankFrom = optional && !draftFrom.trim()
    const blankTo = optional && !draftTo.trim()
    const f = ddmmyyyyToSortable(draftFrom)
    const t = ddmmyyyyToSortable(draftTo)
    if ((!f && !blankFrom) || (!t && !blankTo)) return alert('กรุณากรอกวันที่ให้ถูกต้อง (วว/ดด/ปปปป เป็น พ.ศ.)')
    if (f && t && f > t) return alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด')
    onApply(blankFrom ? '' : draftFrom, blankTo ? '' : draftTo)
  }

  return (
    <form onSubmit={apply} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex items-center gap-2 pt-2.5 text-[var(--text-muted)]">
        <CalendarRange size={16} />
        <span className="text-xs">ช่วงวันที่</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="w-36">
          <DateTextInput value={draftFrom} onChange={setDraftFrom} placeholder={optional ? 'ตั้งแต่ (ทั้งหมด)' : undefined} />
        </div>
        <span className="pt-2.5 text-[var(--text-faint)]">—</span>
        <div className="w-36">
          <DateTextInput value={draftTo} onChange={setDraftTo} placeholder={optional ? 'ถึง (ปัจจุบัน)' : undefined} />
        </div>
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <Search size={14} /> ค้นหาตามวันที่
      </button>
    </form>
  )
}

// ledger blocks per PDF capture: grouped by row count so one capture stays well under
// the browser's maximum canvas height
const LEDGER_ROWS_PER_PDF_CHUNK = 120

function chunkLedgers(blocks) {
  const out = []
  let cur = []
  let rows = 0
  blocks.forEach((b) => {
    const n = b.ledger.rows.length + 8 // + title/header/summary rows
    if (cur.length && rows + n > LEDGER_ROWS_PER_PDF_CHUNK) {
      out.push(cur)
      cur = []
      rows = 0
    }
    cur.push(b)
    rows += n
  })
  if (cur.length) out.push(cur)
  return out
}

function ItemLedgerReport() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  // the spec opens the รหัสสินค้า popup straight away
  const [pickerOpen, setPickerOpen] = useState(true)
  // null | 'ALL' | product | { multi: true, ids } (เลือกหลายรหัส from the picker)
  const [selected, setSelected] = useState(null)
  // "*" + Enter promises "every product record" (see the help text below), so ALL defaults
  // to including idle products too; the checkbox lets you narrow to movement-only after.
  const [includeIdle, setIncludeIdle] = useState(true)
  // like the spec, the report lists every movement by default; a start date adds ยอดยกมา
  const [range, setRange] = useState({ from: '', to: '' })
  const printRef = useRef(null)
  const [pdfJob, setPdfJob] = useState(null)

  const isMulti = !!selected?.multi
  const isList = selected === 'ALL' || isMulti // a list of product blocks (vs one product)

  const bounds = useMemo(
    () => ({
      fromSortable: ddmmyyyyToSortable(range.from) ?? undefined,
      toSortable: ddmmyyyyToSortable(range.to) ?? undefined,
    }),
    [range],
  )

  const sortedProducts = useMemo(() => [...products].sort((a, b) => thaiCompare(a.code, b.code)), [products])

  const singleLedger = useMemo(() => {
    if (!selected || isList) return null
    return buildItemLedger(selected, filterForProduct(stockIns, selected), filterForProduct(stockOuts, selected), bounds)
  }, [selected, isList, stockIns, stockOuts, bounds])

  // With ~10k products, "ALL" defaults to products that actually have movements.
  // เลือกหลายรหัส shows exactly the picked products (idle or not).
  const allLedgers = useMemo(() => {
    if (!isList) return null
    const pickedIds = isMulti ? new Set(selected.ids) : null
    const insByProduct = groupByProduct(stockIns)
    const outsByProduct = groupByProduct(stockOuts)
    return (pickedIds ? sortedProducts.filter((p) => pickedIds.has(p.id)) : sortedProducts)
      .map((p) => ({ product: p, ins: movementsForProduct(insByProduct, p), outs: movementsForProduct(outsByProduct, p) }))
      .filter(({ ins, outs }) => pickedIds || includeIdle || ins.length > 0 || outs.length > 0)
      .map(({ product, ins, outs }) => ({ product, ledger: buildItemLedger(product, ins, outs, bounds) }))
  }, [isList, isMulti, selected, sortedProducts, stockIns, stockOuts, includeIdle, bounds])
  const ledgerPage = usePagination(allLedgers ?? [], 100, `${isList}-${includeIdle}-${isMulti ? selected.ids.join(',') : ''}`)

  // ticked product blocks (list modes only); reset whenever a different report is opened
  const selection = useSelection(selected)
  const selectedLedgers = useMemo(
    () => (allLedgers ?? []).filter(({ product }) => selection.ids.has(product.id)),
    [allLedgers, selection.ids],
  )
  const selCount = selectedLedgers.length
  const allChecked = !!allLedgers?.length && selCount === allLedgers.length
  const exportBase = selected === 'ALL' ? 'item-ledger-all' : isMulti ? 'item-ledger-multi' : `item-ledger-${selected?.code}`

  function exportBlocks() {
    if (!isList) return [{ product: selected, ledger: singleLedger }]
    return selCount > 0 ? selectedLedgers : allLedgers
  }

  function handleExportExcel() {
    if (!selected) return
    const blocks = exportBlocks()
    const aoa = [[`รายงานสินค้าและวัตถุดิบ${rangeLabel(range)}`]]
    blocks.forEach(({ product, ledger }) => {
      aoa.push([])
      aoa.push([`รหัสสินค้า: ${product.code}`, '', `ชื่อสินค้า: ${product.name}`])
      aoa.push([
        'วันที่', 'เลขเอกสาร',
        'ยอดยกมา-จำนวน', 'ยอดยกมา-ราคา', 'ยอดยกมา-มูลค่า',
        'รับ-จำนวน', 'รับ-ราคา', 'รับ-มูลค่า',
        'จ่าย-จำนวน', 'จ่าย-ราคา', 'จ่าย-มูลค่า',
        'คงเหลือ-จำนวน', 'คงเหลือ-ราคา', 'คงเหลือ-มูลค่า',
        'ผู้ขาย/ลูกค้า', 'หมายเหตุ',
      ])
      ledger.rows.forEach((r) => {
        const isOpening = r.group === 'opening'
        const isIn = r.group === 'in'
        const isOut = r.group === 'out'
        aoa.push([
          r.date ? toThaiDate(r.date) : '-',
          r.docNo,
          isOpening ? r.qty : '',
          isOpening ? r.price : '',
          isOpening ? r.value : '',
          isIn ? r.qty : '',
          isIn ? r.price : '',
          isIn ? r.value : '',
          isOut ? r.qty : '',
          isOut ? r.price : '',
          isOut ? r.value : '',
          r.balanceQty,
          r.balancePrice,
          r.balanceValue,
          r.party,
          [r.note, r.isReservation ? 'จองสินค้า (SO)' : ''].filter(Boolean).join(' '),
        ])
      })
      aoa.push([
        'สรุปรายงานสินค้าคงเหลือ', '',
        ledger.opening.qty, '', ledger.opening.value,
        ledger.totalIn.qty, '', ledger.totalIn.value,
        ledger.totalOut.qty, '', ledger.totalOut.value,
        ledger.closing.qty, '', ledger.closing.value,
        '', '',
      ])
      aoa.push([
        'รวมรายการ', '',
        '', '', '',
        round2(ledger.opening.qty + ledger.totalIn.qty), '', round2(ledger.opening.value + ledger.totalIn.value),
        ledger.totalOut.qty, '', ledger.totalOut.value,
        ledger.closing.qty, '', ledger.closing.value,
        '', '',
      ])
    })
    exportAoaToExcel(aoa, `${exportBase}${selCount > 0 ? '-selected' : ''}.xlsx`, 'ItemLedger')
  }

  function handleExportPdf() {
    if (!selected || pdfJob) return
    if (isList && selCount > 0) {
      setPdfJob({ filename: `${exportBase}-selected.pdf` })
      return
    }
    exportElementToPdf(printRef.current, `${exportBase}.pdf`)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          onClick={() => setPickerOpen(true)}
          className="flex min-w-0 max-w-full items-center gap-2 self-start rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)]"
        >
          <PackageSearch size={16} className="flex-shrink-0" />
          <span className="truncate">
          {selected === 'ALL'
            ? 'สินค้าทั้งหมด (*)'
            : isMulti
            ? `เลือก ${formatNumber(selected.ids.length)} รหัส`
            : selected
            ? `${selected.code} — ${selected.name}`
            : 'รหัสสินค้า — กรอกรหัส หรือ * เพื่อดูทั้งหมด'}
          </span>
        </button>
        {selected && <ExportButtons onPdf={handleExportPdf} onExcel={handleExportExcel} count={selCount} busy={!!pdfJob} />}
      </div>

      <div className="mb-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
        <DateRangeBar optional from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        <p className="mt-2 text-xs text-[var(--text-faint)]">
          {range.from
            ? `ยอดยกมา = ยอดคงเหลือจากรายการรับ-จ่ายก่อนวันที่ ${toThaiDate(range.from)}`
            : 'ไม่ใส่วันที่ = แสดงทุกรายการ'}
        </p>
      </div>

      {!selected && (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] py-16 text-center text-sm text-[var(--text-faint)]">
          กรุณากรอกรหัสสินค้าเพื่อดูรายงาน (หรือใส่ * แล้ว Enter เพื่อดูทุกรายการ)
        </div>
      )}

      {isList && (
        <div className="mb-4 flex flex-col gap-2 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {allLedgers.length > 0 && (
              <label className="flex items-center gap-2 font-medium text-[var(--text-secondary)]">
                <Checkbox
                  checked={allChecked}
                  indeterminate={selCount > 0}
                  onChange={(e) => selection.setAll(allLedgers.map((b) => b.product.id), e.target.checked)}
                  label="เลือกทั้งหมด"
                />
                เลือกทั้งหมด
              </label>
            )}
            <span>
              {isMulti
                ? `แสดงเฉพาะรหัสที่เลือก (${formatNumber(allLedgers.length)} รายการ)`
                : includeIdle
                ? `แสดงสินค้าทุกรายการ (${formatNumber(allLedgers.length)} รายการ)`
                : `แสดงเฉพาะสินค้าที่มีรายการรับ-จ่าย (${formatNumber(allLedgers.length)} จาก ${formatNumber(products.length)} รายการ)`}
            </span>
            <SelectionInfo count={selCount} onClear={selection.clear} />
          </div>
          {!isMulti && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeIdle} onChange={(e) => setIncludeIdle(e.target.checked)} />
              รวมสินค้าที่ไม่มีการเคลื่อนไหว
            </label>
          )}
        </div>
      )}

      {selected && (
        <div ref={printRef} className="flex flex-col gap-6">
          {isList
            ? ledgerPage.pageItems.map(({ product, ledger }) => (
                <ItemLedgerTable
                  key={product.id}
                  product={product}
                  ledger={ledger}
                  selectable
                  checked={selection.ids.has(product.id)}
                  onToggle={() => selection.toggle(product.id)}
                />
              ))
            : singleLedger && <ItemLedgerTable product={selected} ledger={singleLedger} />}
          {isList && allLedgers.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] py-16 text-center text-sm text-[var(--text-faint)]">
              ยังไม่มีสินค้าที่มีรายการรับ-จ่าย
            </div>
          )}
        </div>
      )}
      {isList && (
        <Pagination
          page={ledgerPage.page}
          totalPages={ledgerPage.totalPages}
          totalItems={allLedgers.length}
          onFirst={ledgerPage.goFirst}
          onPrev={ledgerPage.goPrev}
          onNext={ledgerPage.goNext}
          onLast={ledgerPage.goLast}
        />
      )}

      <OffscreenPdf job={pdfJob} width={1440} onDone={() => setPdfJob(null)}>
        {chunkLedgers(selectedLedgers).map((group, i) => (
          <div key={i} data-pdf-chunk className="flex flex-col gap-6">
            {group.map(({ product, ledger }) => (
              <ItemLedgerTable key={product.id} product={product} ledger={ledger} />
            ))}
          </div>
        ))}
      </OffscreenPdf>

      <ProductPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setSelected} />
    </div>
  )
}

function rangeLabel({ from, to }) {
  if (!from && !to) return ''
  return ` (${from ? toThaiDate(from) : 'เริ่มต้น'} - ${to ? toThaiDate(to) : 'ปัจจุบัน'})`
}

const numCell = 'px-2 py-2 text-right'

// avoids float noise (e.g. 141700.00000000003) when adding two money totals for Excel
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function ItemLedgerTable({ product, ledger, selectable = false, checked = false, onToggle }) {
  return (
    <div className={`rounded-xl border bg-[var(--bg-card)] p-5 ${checked ? 'border-blue-500/60' : 'border-[var(--border-color)]'}`}>
      <div className="mb-1 text-center text-lg font-bold text-[var(--text-primary)]">รายงานสินค้าและวัตถุดิบ</div>
      <div className="mb-4 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-6">
        {selectable && (
          <span data-pdf-hide className="flex items-center">
            <Checkbox checked={checked} onChange={onToggle} label={`เลือก ${product.code}`} />
          </span>
        )}
        <span className="whitespace-nowrap text-[var(--text-secondary)]">
          รหัสสินค้า : <span className="font-semibold text-red-400">{product.code}</span>
        </span>
        <span className="break-words text-[var(--text-secondary)]">
          ชื่อสินค้า : <span className="font-semibold text-red-400">{product.name}</span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
        <table className="w-full min-w-[1350px] text-xs [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--bg-surface-soft)] text-[var(--text-secondary)]">
              <th rowSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-left align-bottom">วันที่</th>
              <th rowSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-left align-bottom">เลขเอกสาร</th>
              <th colSpan={3} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-amber-300">ยอดยกมา</th>
              <th colSpan={3} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-emerald-300">รายการรับ</th>
              <th colSpan={3} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-sky-300">รายการจ่าย</th>
              <th colSpan={3} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-red-400">คงเหลือ</th>
              <th className="border-b border-[var(--border-color)] px-2 py-2 text-left text-violet-300">รายละเอียด</th>
            </tr>
            <tr className="bg-[var(--bg-surface-soft)] text-right text-[var(--text-muted)]">
              {['จำนวน', 'ราคา', 'มูลค่า', 'จำนวน', 'ราคา', 'มูลค่า', 'จำนวน', 'ราคา', 'มูลค่า', 'จำนวน', 'ราคา', 'มูลค่า'].map((h, i) => (
                <th key={i} className="px-2 py-1.5 font-medium">{h}</th>
              ))}
              <th className="px-2 py-1.5 text-left font-medium text-violet-300">ผู้ขาย/ลูกค้า</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((r, idx) => {
              const isOpening = r.group === 'opening'
              const isIn = r.group === 'in'
              const isOut = r.group === 'out'
              return (
                <tr
                  key={idx}
                  className={`border-t border-[var(--border-color-soft)] hover:bg-[var(--bg-hover)] ${
                    r.isReservation
                      ? 'bg-amber-400/20 text-amber-200'
                      : isOpening
                      ? 'text-amber-300'
                      : isIn
                      ? 'text-emerald-300'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  <td className="px-2 py-2">{r.date ? toThaiDate(r.date) : '-'}</td>
                  <td className="px-2 py-2">{r.docNo}</td>
                  <td className={numCell}>{isOpening ? formatNumber(r.qty) : ''}</td>
                  <td className={numCell}>{isOpening ? formatMoney(r.price) : ''}</td>
                  <td className={numCell}>{isOpening ? formatMoney(r.value) : ''}</td>
                  <td className={numCell}>{isIn ? formatNumber(r.qty) : ''}</td>
                  <td className={numCell}>{isIn ? formatMoney(r.price) : ''}</td>
                  <td className={numCell}>{isIn ? formatMoney(r.value) : ''}</td>
                  <td className={numCell}>{isOut ? formatNumber(r.qty) : ''}</td>
                  <td className={numCell}>{isOut ? formatMoney(r.price) : ''}</td>
                  <td className={numCell}>{isOut ? formatMoney(r.value) : ''}</td>
                  <td className={`${numCell} font-medium`}>{formatNumber(r.balanceQty)}</td>
                  <td className={`${numCell} font-medium`}>{formatMoney(r.balancePrice)}</td>
                  <td className={`${numCell} font-medium`}>{formatMoney(r.balanceValue)}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">
                    {r.party}
                    {r.isReservation && (
                      <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        จองสินค้า (SO)
                      </span>
                    )}
                    {r.note && <span className="ml-2 text-[11px] text-[var(--text-faint)]">· {r.note}</span>}
                  </td>
                </tr>
              )
            })}
            {ledger.rows.length === 0 && (
              <tr>
                <td colSpan={15} className="px-2 py-6 text-center text-[var(--text-faint)]">
                  ไม่มีรายการเคลื่อนไหว
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border-color)] bg-amber-500/10 font-bold text-red-400">
              <td className="px-2 py-2.5" colSpan={2}>สรุปรายงานสินค้าคงเหลือ</td>
              <td className={numCell}>{formatNumber(ledger.opening.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.opening.value)}</td>
              <td className={numCell}>{formatNumber(ledger.totalIn.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.totalIn.value)}</td>
              <td className={numCell}>{formatNumber(ledger.totalOut.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.totalOut.value)}</td>
              <td className={numCell}>{formatNumber(ledger.closing.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.closing.value)}</td>
              <td></td>
            </tr>
            {/* รวมรายการ (like the CD accounting program): ยอดยกมา folded into รายการรับ */}
            <tr className="border-t-2 border-double border-[var(--border-color-strong)] bg-sky-500/10 font-bold text-red-400">
              <td className="px-2 py-2.5" colSpan={2}>รวมรายการ</td>
              <td className={numCell}></td>
              <td className={numCell}></td>
              <td className={numCell}></td>
              <td className={numCell}>{formatNumber(ledger.opening.qty + ledger.totalIn.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.opening.value + ledger.totalIn.value)}</td>
              <td className={numCell}>{formatNumber(ledger.totalOut.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.totalOut.value)}</td>
              <td className={numCell}>{formatNumber(ledger.closing.qty)}</td>
              <td className={numCell}>-</td>
              <td className={numCell}>{formatMoney(ledger.closing.value)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// rows per PDF capture for the summary report (same as one on-screen page)
const SUMMARY_ROWS_PER_PDF_CHUNK = 100

function sumSummaryTotals(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.openingValue += r.opening.value
      acc.inValue += r.in.value
      acc.outValue += r.out.value
      acc.closingValue += r.closing.value
      return acc
    },
    { openingValue: 0, inValue: 0, outValue: 0, closingValue: 0 },
  )
}

function AllStockSummaryReport() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  const printRef = useRef(null)
  const [pdfJob, setPdfJob] = useState(null)

  const [range, setRange] = useState(() => ({ from: startOfYear(), to: todayDDMMYYYY() }))
  const fromSortable = ddmmyyyyToSortable(range.from)
  const toSortable = ddmmyyyyToSortable(range.to)

  const rows = useMemo(() => {
    const sortedProducts = [...products].sort((a, b) => thaiCompare(a.code, b.code))
    const all = buildAllStockSummary(sortedProducts, stockIns, stockOuts, fromSortable ?? undefined, toSortable ?? undefined)
    // Hide products with zero movement in the period (ยอดยกมา, ซื้อ, ออก, คงเหลือ all zero).
    return all.filter(
      (r) =>
        r.opening.qty !== 0 ||
        r.opening.value !== 0 ||
        r.in.qty !== 0 ||
        r.in.value !== 0 ||
        r.out.qty !== 0 ||
        r.out.value !== 0 ||
        r.closing.qty !== 0 ||
        r.closing.value !== 0,
    )
  }, [products, stockIns, stockOuts, fromSortable, toSortable])

  const summaryPage = usePagination(rows, 100, `${fromSortable}-${toSortable}`)

  const totals = useMemo(() => sumSummaryTotals(rows), [rows])

  // ticked rows (product ids) — kept across pages and date-range changes
  const selection = useSelection('summary')
  const selectedRows = useMemo(() => rows.filter((r) => selection.ids.has(r.id)), [rows, selection.ids])
  const selectedTotals = useMemo(() => sumSummaryTotals(selectedRows), [selectedRows])
  const selCount = selectedRows.length

  const fromThai = toThaiDate(range.from)
  const toThai = toThaiDate(range.to)

  function handleExportExcel() {
    const exportRows = selCount > 0 ? selectedRows : rows
    const t = selCount > 0 ? selectedTotals : totals
    const aoa = [
      ['สรุปยอดสินค้าคงเหลือ รวมทุกคลัง'],
      [`สิ้นสุดวันที่ ${fromThai} - ${toThai}`],
      [],
      ['รหัส', 'ชื่อสินค้า', `ยอดยกมา - ${fromThai} จำนวน`, `ยอดยกมา - ${fromThai} เป็นเงิน`, 'ซื้อ-จำนวน', 'ซื้อ-เป็นเงิน', 'ออก-จำนวน', 'ออก-เป็นเงิน', 'คงเหลือ-จำนวน', 'คงเหลือ-เป็นเงิน'],
      ...exportRows.map((r) => [r.code, r.name, r.opening.qty, r.opening.value, r.in.qty, r.in.value, r.out.qty, r.out.value, r.closing.qty, r.closing.value]),
      ['', 'รวมเงิน', '', round2(t.openingValue), '', round2(t.inValue), '', round2(t.outValue), '', round2(t.closingValue)],
    ]
    exportAoaToExcel(aoa, selCount > 0 ? 'all-stock-summary-selected.xlsx' : 'all-stock-summary.xlsx', 'Summary')
  }

  function handleExportPdf() {
    if (pdfJob) return
    if (selCount > 0) {
      setPdfJob({ filename: 'all-stock-summary-selected.pdf' })
      return
    }
    exportElementToPdf(printRef.current, `all-stock-summary.pdf`)
  }

  const allChecked = rows.length > 0 && selCount === rows.length
  const pdfChunks = chunk(selectedRows, SUMMARY_ROWS_PER_PDF_CHUNK)

  return (
    <div className="mx-auto max-w-[1123px]">
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 lg:flex-row lg:items-start lg:justify-between">
        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        <ExportButtons onPdf={handleExportPdf} onExcel={handleExportExcel} count={selCount} busy={!!pdfJob} />
      </div>
      {selCount > 0 && (
        <div className="mb-4 flex">
          <SelectionInfo count={selCount} onClear={selection.clear} />
        </div>
      )}

      {/* Sized to A4 landscape (297 x 210mm ≈ 1123 x 794px @96dpi) so the on-screen report
          previews the way it will print/export. */}
      <div ref={printRef}>
        <SummarySheet
          rows={summaryPage.pageItems}
          totals={totals}
          fromThai={fromThai}
          toThai={toThai}
          empty={rows.length === 0}
          select={{
            ids: selection.ids,
            toggle: selection.toggle,
            allChecked,
            someChecked: selCount > 0,
            toggleAll: (on) => selection.setAll(rows.map((r) => r.id), on),
          }}
        />
      </div>
      <Pagination
        page={summaryPage.page}
        totalPages={summaryPage.totalPages}
        totalItems={rows.length}
        onFirst={summaryPage.goFirst}
        onPrev={summaryPage.goPrev}
        onNext={summaryPage.goNext}
        onLast={summaryPage.goLast}
      />

      <OffscreenPdf job={pdfJob} width={1123} onDone={() => setPdfJob(null)}>
        {pdfChunks.map((part, i) => (
          <div key={i} data-pdf-chunk>
            <SummarySheet
              rows={part}
              totals={selectedTotals}
              showTotals={i === pdfChunks.length - 1}
              fromThai={fromThai}
              toThai={toThai}
            />
          </div>
        ))}
      </OffscreenPdf>
    </div>
  )
}

// One A4-landscape sheet of the All-Stock Summary. `select` (on-screen only) adds the
// checkbox column, which is marked data-pdf-hide so it never reaches the PDF.
function SummarySheet({ rows, totals, fromThai, toThai, empty = false, showTotals = true, select = null }) {
  return (
    <div className="report-a4-page min-h-[794px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="text-center text-lg font-bold text-[var(--text-primary)]">สรุปยอดสินค้าคงเหลือ รวมทุกคลัง</div>
      <div className="mb-4 text-center text-sm text-[var(--text-secondary)]">
        สิ้นสุดวันที่ {fromThai} - {toThai}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
        <table className="w-full min-w-[980px] text-xs [&_th]:whitespace-nowrap">
          <thead>
            <tr className="bg-[var(--bg-surface-soft)] text-[var(--text-secondary)]">
              {select && (
                <th rowSpan={2} data-pdf-hide className="w-8 border-b border-[var(--border-color)] px-2 py-2 text-center align-bottom">
                  <Checkbox
                    checked={select.allChecked}
                    indeterminate={select.someChecked}
                    onChange={(e) => select.toggleAll(e.target.checked)}
                    label="เลือกทั้งหมด (ทุกรายการในรายงาน)"
                  />
                </th>
              )}
              <th rowSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-left align-bottom">รหัส</th>
              <th rowSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-left align-bottom">ชื่อสินค้า</th>
              <th colSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-red-400">ยอดยกมา - {fromThai}</th>
              <th colSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-emerald-300">ซื้อ</th>
              <th colSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-sky-300">ออก</th>
              <th colSpan={2} className="border-b border-[var(--border-color)] px-2 py-2 text-center text-red-400">คงเหลือ</th>
            </tr>
            <tr className="bg-[var(--bg-surface-soft)] text-right text-[var(--text-muted)]">
              {['จำนวน', 'เป็นเงิน', 'จำนวน', 'เป็นเงิน', 'จำนวน', 'เป็นเงิน', 'จำนวน', 'เป็นเงิน'].map((h, i) => (
                <th key={i} className="px-2 py-1.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border-color-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                {select && (
                  <td data-pdf-hide className="px-2 py-2 text-center">
                    <Checkbox checked={select.ids.has(r.id)} onChange={() => select.toggle(r.id)} label={`เลือก ${r.code}`} />
                  </td>
                )}
                <td className="whitespace-nowrap px-2 py-2 font-mono text-[var(--text-accent)]">{r.code}</td>
                <td className="max-w-[260px] whitespace-normal break-words px-2 py-2">{r.name}</td>
                <td className={`${numCell} text-red-400`}>{formatNumber(r.opening.qty)}</td>
                <td className={`${numCell} text-red-400`}>{formatMoney(r.opening.value)}</td>
                <td className={`${numCell} text-emerald-300`}>{formatNumber(r.in.qty)}</td>
                <td className={`${numCell} text-emerald-300`}>{formatMoney(r.in.value)}</td>
                <td className={`${numCell} text-sky-300`}>{formatNumber(r.out.qty)}</td>
                <td className={`${numCell} text-sky-300`}>{formatMoney(r.out.value)}</td>
                <td className={`${numCell} font-medium text-red-400`}>{formatNumber(r.closing.qty)}</td>
                <td className={`${numCell} font-medium text-red-400`}>{formatMoney(r.closing.value)}</td>
              </tr>
            ))}
            {empty && (
              <tr>
                <td colSpan={select ? 11 : 10} className="px-4 py-8 text-center text-[var(--text-faint)]">ไม่มีข้อมูลสินค้า</td>
              </tr>
            )}
          </tbody>
          {showTotals && (
            <tfoot>
              <tr className="border-t-2 border-[var(--border-color)] bg-amber-500/10 font-bold text-red-400">
                {select && <td data-pdf-hide></td>}
                <td className="px-2 py-2.5 text-center" colSpan={2}>รวมเงิน</td>
                <td></td>
                <td className={numCell}>{formatMoney(totals.openingValue)}</td>
                <td></td>
                <td className={numCell}>{formatMoney(totals.inValue)}</td>
                <td></td>
                <td className={numCell}>{formatMoney(totals.outValue)}</td>
                <td></td>
                <td className={numCell}>{formatMoney(totals.closingValue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
