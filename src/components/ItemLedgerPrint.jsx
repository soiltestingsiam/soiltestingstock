import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatMoney, formatNumber } from '../utils/format'
import { toThaiDate, todayDDMMYYYY } from '../utils/date'

// ---------------------------------------------------------------------------------
// Print layout for "รายงานสินค้าและวัตถุดิบ" PDF export, styled after the CD accounting
// program's printout: white paper, black text, a company/report header on every page,
// a boxed column header, plain rows, ruled summary lines, "page : n / N" and
// "<<end of report>>". Always black-on-white regardless of the app theme.
//
// The รายละเอียด / ผู้ขาย-ลูกค้า column (and a long product name) WRAP onto as many lines
// as the text needs, so nothing is cut off. Because that makes rows a variable height,
// pagination is measurement-based: every line is laid out once off-screen, its real
// height is read, and rows are packed into A4 pages from those heights — so a page break
// never lands inside a row and never overflows the page.
//
// Each A4-landscape page is then rendered on its own and captured with html2canvas as
// JPEG, so files stay small.
// ---------------------------------------------------------------------------------

export const COMPANY_NAME = 'บริษัท ซอยล์เทสติ้งสยาม จำกัด'

// A4 landscape at 96 dpi
const PAGE_W = 1123
const PAGE_H = 794
const PAD_X = 18
const PAD_TOP = 26
const PAD_BOTTOM = 22
const HEADER_H = 98 // company / title / filter block
const THEAD_H = 40 // boxed column header
const FOOTER_H = 18 // "page : n / N"
const BODY_BUDGET = PAGE_H - PAD_TOP - PAD_BOTTOM - HEADER_H - THEAD_H - FOOTER_H - 8

// fallback heights, used only if a row can't be measured (headless/edge cases)
const FALLBACK_H = { product: 26, empty: 20, row: 20, sum: 22, gap: 12, end: 26 }

// column widths (px); the รายละเอียด column takes whatever is left and wraps
const COLS = [66, 88, 38, 70, 78, 38, 70, 78, 38, 70, 78, 38, 70, 78]
const DETAIL_W = PAGE_W - 2 * PAD_X - COLS.reduce((a, b) => a + b, 0)

const wrapperStyle = { width: PAGE_W, padding: `0 ${PAD_X}px`, lineHeight: 1.6 }

// ---- flat item list (one <tr> each), independent of pages ----
// Continuation headers (a product spilling onto the next page) are added during packing;
// they reuse the measured height of that product's header.
function buildItems(blocks) {
  const items = []
  blocks.forEach(({ product, ledger }, blockIndex) => {
    items.push({ kind: 'product', product })
    if (!ledger.rows.length) items.push({ kind: 'empty' })
    ledger.rows.forEach((row) => items.push({ kind: 'row', row }))
    items.push({ kind: 'sum', variant: 'summary', ledger })
    items.push({ kind: 'sum', variant: 'total', ledger })
    if (blockIndex < blocks.length - 1) items.push({ kind: 'gap' })
  })
  items.push({ kind: 'end' })
  return items
}

// Packs measured items into pages. Keeps a product header with its first line and the two
// summary lines together, and repeats the header marked (ต่อ) when a product continues.
function packItems(items) {
  const pages = []
  let cur = []
  let used = 0
  let rowsSinceHeader = 0
  let lastHeader = null
  const fits = (h) => used + h <= BODY_BUDGET
  const push = (it) => {
    cur.push(it)
    used += it.h ?? 0
  }
  const newPage = () => {
    if (cur.length) pages.push(cur)
    cur = []
    used = 0
    rowsSinceHeader = 0
  }
  const contHeader = () => push({ kind: 'product', product: lastHeader.product, cont: true, h: lastHeader.h })

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const next = items[i + 1]
    switch (it.kind) {
      case 'product':
        lastHeader = it
        if (cur.length && !fits((it.h ?? 0) + (next?.h ?? 0))) newPage()
        push(it)
        rowsSinceHeader = 0
        break
      case 'empty':
        push(it)
        break
      case 'row':
        if (!fits(it.h ?? 0) && rowsSinceHeader > 0) {
          newPage()
          contHeader()
        }
        push(it)
        rowsSinceHeader += 1
        break
      case 'sum':
        if (it.variant === 'summary') {
          const pairH = (it.h ?? 0) + (next?.h ?? 0)
          if (!fits(pairH) && cur.length) {
            newPage()
            contHeader()
          }
        }
        push(it)
        break
      case 'gap':
        if (fits(it.h ?? 0)) push(it) // a gap never carries to the next page
        break
      case 'end':
        if (!fits(it.h ?? 0)) newPage()
        push(it)
        break
      default:
        break
    }
  }
  if (cur.length) pages.push(cur)
  return pages
}

const cell = 'overflow-hidden text-ellipsis whitespace-nowrap px-1 align-top'
// the one column that wraps so every character shows
const detailCell = 'whitespace-normal break-words px-1 align-top'
// numbers are never clipped/ellipsized; 9px so values into the tens of millions
// (12,345,678.90) and unit prices into the millions fit their columns
const num = 'whitespace-nowrap px-[3px] text-right text-[9px] tabular-nums align-top'

function GroupLabel({ children }) {
  // CD-style bracket: |------ label ------|
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="h-2 border-l border-black" />
      <span className="flex-1 border-t border-dashed border-black" />
      <span>{children}</span>
      <span className="flex-1 border-t border-dashed border-black" />
      <span className="h-2 border-r border-black" />
    </div>
  )
}

function MoneyCells({ qty, value, price, show = true, priceDash = false }) {
  if (!show) {
    return (
      <>
        <td className={num} />
        <td className={num} />
        <td className={num} />
      </>
    )
  }
  return (
    <>
      <td className={num}>{formatNumber(qty)}</td>
      <td className={num}>{priceDash ? '-' : formatMoney(price)}</td>
      <td className={num}>{formatMoney(value)}</td>
    </>
  )
}

function LineItem({ item }) {
  const h = item.h ? { height: item.h } : undefined
  switch (item.kind) {
    case 'product': {
      const p = item.product
      return (
        <tr style={h} className="font-bold">
          <td colSpan={15} className={`${detailCell} pt-1.5`}>
            รหัส&nbsp;&nbsp;{p.code}
            <span className="ml-6">{p.name}</span>
            {p.unit && <span className="ml-6 font-normal">หน่วย {p.unit}</span>}
            {item.cont && <span className="ml-3 font-normal">(ต่อ)</span>}
          </td>
        </tr>
      )
    }
    case 'empty':
      return (
        <tr style={h}>
          <td colSpan={15} className={`${cell} pl-6`}>ไม่มีรายการเคลื่อนไหว</td>
        </tr>
      )
    case 'row': {
      const r = item.row
      const detail = [r.isReservation ? '[จองสินค้า SO]' : '', r.party && r.party !== '-' ? r.party : '', r.note]
        .filter(Boolean)
        .join(' ')
      return (
        <tr style={h}>
          <td className={cell}>{r.date ? toThaiDate(r.date) : '-'}</td>
          <td className={cell}>{r.docNo}</td>
          <MoneyCells show={r.group === 'opening'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells show={r.group === 'in'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells show={r.group === 'out'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells qty={r.balanceQty} price={r.balancePrice} value={r.balanceValue} />
          <td className={detailCell}>{detail}</td>
        </tr>
      )
    }
    case 'sum': {
      const l = item.ledger
      if (item.variant === 'summary') {
        // สรุปรายงานสินค้าคงเหลือ — ยอดยกมา kept separate from รายการรับ
        return (
          <tr style={h} className="border-t border-black font-bold">
            <td colSpan={2} className={cell}>สรุปรายงานสินค้าคงเหลือ</td>
            <MoneyCells qty={l.opening.qty} value={l.opening.value} priceDash />
            <MoneyCells qty={l.totalIn.qty} value={l.totalIn.value} priceDash />
            <MoneyCells qty={l.totalOut.qty} value={l.totalOut.value} priceDash />
            <MoneyCells qty={l.closing.qty} value={l.closing.value} priceDash />
            <td />
          </tr>
        )
      }
      // รวมรายการ — ยอดยกมา folded into รายการรับ (as in the CD program)
      return (
        <tr style={h} className="border-y-[3px] border-double border-black font-bold">
          <td colSpan={2} className={cell}>รวมรายการ</td>
          <MoneyCells show={false} />
          <MoneyCells qty={l.opening.qty + l.totalIn.qty} value={l.opening.value + l.totalIn.value} priceDash />
          <MoneyCells qty={l.totalOut.qty} value={l.totalOut.value} priceDash />
          <MoneyCells qty={l.closing.qty} value={l.closing.value} priceDash />
          <td />
        </tr>
      )
    }
    case 'gap':
      return (
        <tr style={h ?? { height: FALLBACK_H.gap }}>
          <td colSpan={15} />
        </tr>
      )
    case 'end':
      return (
        <tr style={h}>
          <td colSpan={15} className={cell}>&lt;&lt;end of report&gt;&gt;</td>
        </tr>
      )
    default:
      return null
  }
}

// The table itself (colgroup + boxed header + rows) — identical markup whether it is
// being measured or captured, so measured heights match the printed ones exactly.
function LedgerTable({ items }) {
  return (
    <table className="w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        {COLS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
        <col style={{ width: DETAIL_W }} />
      </colgroup>
      <thead>
        <tr className="border-x border-t border-black" style={{ height: THEAD_H / 2 }}>
          <th colSpan={2} />
          <th colSpan={3} className="font-normal"><GroupLabel>ยอดยกมา</GroupLabel></th>
          <th colSpan={3} className="font-normal"><GroupLabel>รายการรับ</GroupLabel></th>
          <th colSpan={3} className="font-normal"><GroupLabel>รายการจ่าย</GroupLabel></th>
          <th colSpan={3} className="font-normal"><GroupLabel>คงเหลือ</GroupLabel></th>
          <th className={`${cell} text-left font-normal`}>รายละเอียดรายการ</th>
        </tr>
        <tr className="border-x border-b border-black font-normal" style={{ height: THEAD_H / 2 }}>
          <th className={`${cell} text-left font-normal`}>วันที่</th>
          <th className={`${cell} text-left font-normal`}>เลขเอกสาร</th>
          {[0, 1, 2, 3].map((g) => (
            <ThGroup key={g} />
          ))}
          <th className={`${cell} text-left font-normal`}>ผู้ขาย/ลูกค้า</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <LineItem key={i} item={item} />
        ))}
      </tbody>
    </table>
  )
}

function LedgerPrintPage({ items, pageNo, pageCount, meta }) {
  return (
    <div
      className="relative box-border bg-white text-[11px] text-black"
      // line-height must cover Noto Sans Thai's full glyph height (~1.5em): with a tighter
      // value html2canvas draws the text lower than the browser lays it out, clipping the
      // bottom of each line against the row edge / ruled lines
      style={{ ...wrapperStyle, height: PAGE_H, paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
    >
      {/* header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start whitespace-nowrap" style={{ height: HEADER_H }}>
        <div className="flex flex-col gap-1">
          <div className="text-[13px] font-bold">{COMPANY_NAME}</div>
          <div>
            <span className="inline-block w-16 font-semibold">รหัส</span>
            {meta.codeFrom}
            {meta.codeTo !== meta.codeFrom && <> &nbsp;-&nbsp; {meta.codeTo}</>}
          </div>
          <div>
            <span className="inline-block w-16 font-semibold">ช่วงวันที่</span>
            {meta.rangeText}
          </div>
          <div>
            <span className="inline-block w-16 font-semibold">จำนวน</span>
            {formatNumber(meta.productCount)} รายการ
          </div>
        </div>
        <div className="px-6 text-center">
          <div className="text-[18px] font-bold">รายงานสินค้าและวัตถุดิบ</div>
          <div className="mt-1.5 text-[12px]">
            <span className="font-semibold">ณ.วันที่</span>&nbsp;&nbsp;{meta.printedOn}
          </div>
        </div>
        <div />
      </div>

      <LedgerTable items={items} />

      <div className="absolute text-[10px]" style={{ right: PAD_X, bottom: PAD_BOTTOM - 6 }}>
        page : {pageNo} / {pageCount}
      </div>
    </div>
  )
}

function ThGroup() {
  return (
    <>
      <th className={`${num} font-normal`}>จำนวน</th>
      <th className={`${num} font-normal`}>ราคา</th>
      <th className={`${num} font-normal`}>มูลค่า</th>
    </>
  )
}

function rangeText({ from, to }) {
  if (!from && !to) return 'ทั้งหมด'
  return `${from ? toThaiDate(from) : 'เริ่มต้น'}  -  ${to ? toThaiDate(to) : 'ปัจจุบัน'}`
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

// Lays every line out once (off-screen, full width, nothing clipped) and reads its real
// height, so packItems knows exactly how tall each row is after wrapping.
async function measureItemHeights(root, host, items) {
  flushSync(() => {
    root.render(
      <div className="box-border bg-white text-[11px] text-black" style={wrapperStyle}>
        <LedgerTable items={items} />
      </div>,
    )
  })
  await nextFrame()
  const trs = host.querySelectorAll('tbody tr')
  items.forEach((it, i) => {
    const measured = trs[i]?.offsetHeight
    it.h = measured && measured > 0 ? measured : FALLBACK_H[it.kind] ?? FALLBACK_H.row
  })
}

// html2canvas' own text renderer draws Thai text a few px lower than the browser lays it
// out (clipping glyph bottoms against row edges / ruled lines), so the page is rendered
// by the browser itself via SVG foreignObject. Browsers that refuse that (older Safari
// taints the canvas) fall back to the default renderer.
let foreignObjectWorks = true
async function capturePage(el) {
  const host = el.parentElement
  const opts = {
    backgroundColor: '#ffffff',
    scale: 2,
    width: PAGE_W,
    height: PAGE_H,
    windowWidth: PAGE_W + 400,
    // clone only the print page (plus <head> styles), not the whole app — much faster,
    // and nothing else can overlap the page
    ignoreElements: (node) =>
      node !== document.body && document.body.contains(node) && !node.contains(host) && !host.contains(node),
    // foreignObject only captures what sits at the document's top-left, so bring the
    // (otherwise off-screen) page there inside the clone
    onclone: (doc, clone) => {
      doc.documentElement.removeAttribute('data-festival') // exports are never festival-tinted
      doc.documentElement.removeAttribute('data-skin') // …nor in the user's personal theme
      clone.parentElement.style.left = '0px'
      clone.parentElement.style.top = '0px'
    },
  }
  if (foreignObjectWorks) {
    try {
      const canvas = await html2canvas(el, { ...opts, foreignObjectRendering: true })
      return canvas.toDataURL('image/jpeg', 0.9)
    } catch {
      foreignObjectWorks = false
    }
  }
  const canvas = await html2canvas(el, opts)
  return canvas.toDataURL('image/jpeg', 0.9)
}

// blocks: [{ product, ledger }] in report order. onProgress(done, total) per page.
export async function exportItemLedgerPdf({ blocks, range, filename, onProgress }) {
  if (!blocks?.length) return
  const meta = {
    codeFrom: blocks[0].product.code,
    codeTo: blocks[blocks.length - 1].product.code,
    // a chosen year prints as "ปี 2569  (01/01/2569 - 31/12/2569)"; own dates as before
    rangeText: range?.label || rangeText(range ?? {}),
    productCount: blocks.length,
    printedOn: toThaiDate(todayDDMMYYYY()),
  }

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:absolute;left:-99999px;top:0;width:${PAGE_W}px;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    if (document.fonts?.ready) await document.fonts.ready
    const items = buildItems(blocks)
    await measureItemHeights(root, host, items)
    const pages = packItems(items)

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()

    for (let i = 0; i < pages.length; i++) {
      onProgress?.(i, pages.length)
      flushSync(() => {
        root.render(<LedgerPrintPage items={pages[i]} pageNo={i + 1} pageCount={pages.length} meta={meta} />)
      })
      await nextFrame()
      const jpeg = await capturePage(host.firstElementChild)
      if (i > 0) pdf.addPage()
      pdf.addImage(jpeg, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST')
    }
    onProgress?.(pages.length, pages.length)
    pdf.save(filename)
  } finally {
    root.unmount()
    host.remove()
  }
}
