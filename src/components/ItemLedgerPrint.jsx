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
// Each A4-landscape page is rendered on its own (one page in the DOM at a time),
// captured with html2canvas and placed on a jsPDF page as JPEG — page breaks land
// between rows instead of slicing one tall screenshot, and files stay small.
// ---------------------------------------------------------------------------------

export const COMPANY_NAME = 'บริษัท ซอยล์เทสติ้งสยาม จำกัด'

// A4 landscape at 96 dpi
const PAGE_W = 1123
const PAGE_H = 794
const PAD_X = 24
const PAD_TOP = 26
const PAD_BOTTOM = 22
const HEADER_H = 98 // company / title / filter block
const THEAD_H = 40 // boxed column header
const FOOTER_H = 18 // "page : n / N"
const BODY_BUDGET = PAGE_H - PAD_TOP - PAD_BOTTOM - HEADER_H - THEAD_H - FOOTER_H - 8

// fixed heights so pagination is deterministic (every cell is one line, clipped)
const H = { product: 26, row: 20, empty: 20, sum: 22, gap: 12, end: 26 }

// column widths (px) — 15 columns, sums to PAGE_W - 2 * PAD_X
const COLS = [70, 88, 38, 72, 80, 38, 72, 80, 38, 72, 80, 38, 72, 80]
const DETAIL_W = PAGE_W - 2 * PAD_X - COLS.reduce((a, b) => a + b, 0)

// Splits product blocks into pages of line items. A product's header always comes with
// at least its first line, its two summary rows stay together, and a product that runs
// onto the next page repeats its header marked (ต่อ).
export function paginateLedgers(blocks) {
  const pages = []
  let cur = []
  let used = 0
  const fits = (h) => used + h <= BODY_BUDGET
  const push = (item) => {
    cur.push(item)
    used += H[item.kind]
  }
  const newPage = () => {
    pages.push(cur)
    cur = []
    used = 0
  }

  blocks.forEach(({ product, ledger }, bi) => {
    const first = ledger.rows.length ? H.row : H.empty
    if (cur.length && !fits(H.product + first)) newPage()
    push({ kind: 'product', product })
    if (!ledger.rows.length) push({ kind: 'empty' })
    ledger.rows.forEach((row) => {
      if (!fits(H.row)) {
        newPage()
        push({ kind: 'product', product, cont: true })
      }
      push({ kind: 'row', row })
    })
    if (!fits(H.sum * 2)) {
      newPage()
      push({ kind: 'product', product, cont: true })
    }
    push({ kind: 'sum', variant: 'summary', ledger })
    push({ kind: 'sum', variant: 'total', ledger })
    if (bi < blocks.length - 1 && fits(H.gap)) push({ kind: 'gap' })
  })
  if (!fits(H.end)) newPage()
  push({ kind: 'end' })
  pages.push(cur)
  return pages
}

const cell = 'overflow-hidden text-ellipsis whitespace-nowrap px-1'
// numbers are never clipped/ellipsized; 9px so values into the tens of millions
// (12,345,678.90) and unit prices into the millions fit their columns
const num = 'whitespace-nowrap px-[3px] text-right text-[9px] tabular-nums'

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
  switch (item.kind) {
    case 'product': {
      const p = item.product
      return (
        <tr style={{ height: H.product }} className="font-bold">
          <td colSpan={15} className={`${cell} pt-1.5`}>
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
        <tr style={{ height: H.empty }}>
          <td colSpan={15} className={`${cell} pl-6`}>ไม่มีรายการเคลื่อนไหว</td>
        </tr>
      )
    case 'row': {
      const r = item.row
      const detail = [r.isReservation ? '[จองสินค้า SO]' : '', r.party && r.party !== '-' ? r.party : '', r.note]
        .filter(Boolean)
        .join(' ')
      return (
        <tr style={{ height: H.row }}>
          <td className={cell}>{r.date ? toThaiDate(r.date) : '-'}</td>
          <td className={cell}>{r.docNo}</td>
          <MoneyCells show={r.group === 'opening'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells show={r.group === 'in'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells show={r.group === 'out'} qty={r.qty} price={r.price} value={r.value} />
          <MoneyCells qty={r.balanceQty} price={r.balancePrice} value={r.balanceValue} />
          <td className={cell}>{detail}</td>
        </tr>
      )
    }
    case 'sum': {
      const l = item.ledger
      if (item.variant === 'summary') {
        // สรุปรายงานสินค้าคงเหลือ — ยอดยกมา kept separate from รายการรับ
        return (
          <tr style={{ height: H.sum }} className="border-t border-black font-bold">
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
        <tr style={{ height: H.sum }} className="border-y-[3px] border-double border-black font-bold">
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
        <tr style={{ height: H.gap }}>
          <td colSpan={15} />
        </tr>
      )
    case 'end':
      return (
        <tr style={{ height: H.end }}>
          <td colSpan={15} className={cell}>&lt;&lt;end of report&gt;&gt;</td>
        </tr>
      )
    default:
      return null
  }
}

function LedgerPrintPage({ items, pageNo, pageCount, meta }) {
  return (
    <div
      className="relative box-border bg-white text-[11px] text-black"
      // line-height must cover Noto Sans Thai's full glyph height (~1.5em): with a tighter
      // value html2canvas draws the text lower than the browser lays it out, clipping the
      // bottom of each line against the row edge / ruled lines
      style={{ width: PAGE_W, height: PAGE_H, padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`, lineHeight: 1.6 }}
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
  const pages = paginateLedgers(blocks)
  const meta = {
    codeFrom: blocks[0].product.code,
    codeTo: blocks[blocks.length - 1].product.code,
    rangeText: rangeText(range ?? {}),
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
