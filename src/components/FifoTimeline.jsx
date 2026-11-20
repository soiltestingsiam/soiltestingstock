import { useMemo } from 'react'
import { filterForProduct } from '../utils/stockCalc'
import { fifoLotsFor } from '../utils/fifoLots'
import { formatMoney, formatNumber } from '../utils/format'
import FxBoundary from './FxBoundary'

// FIFO batch timeline (Stock Out, screen only): which lots this issue draws from, oldest
// first — "ล็อต 01/11/2569 · ใช้ 2 จาก 10 @ 1,000". Read-only: the saved cost is still the
// FIFO figure in ราคา / หน่วย and ราคารวม (fifoCost.js); this only explains it.
const NEW = '__this_row__'

function Timeline({ stockIns, stockOuts, products, productId, productCode, date, qty, editingId, unit }) {
  const data = useMemo(() => {
    const n = Number(qty)
    if (!productId || !(n > 0)) return null
    const product = products.find((p) => p.id === productId) ?? { id: productId, code: String(productCode || '').trim() }
    const outs = filterForProduct(stockOuts.filter((t) => t.id !== editingId), product)
    const draft = { id: NEW, date, qty: n, price: Number(product.unitPrice) || 0, total: 0, movementType: 'out' }
    return fifoLotsFor(filterForProduct(stockIns, product), [...outs, draft], NEW)
  }, [stockIns, stockOuts, products, productId, productCode, date, qty, editingId])

  if (!data || (!data.takes.length && !data.uncovered)) return null
  return (
    <div className="fifo-timeline mt-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3" aria-label="ลำดับล็อตที่ตัดจ่ายแบบ FIFO">
      <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">🧭 ลำดับล็อตที่ตัดจ่าย (เข้าก่อน-ออกก่อน)</div>
      <ol className="fifo-steps flex flex-wrap items-stretch gap-2">
        {data.takes.map((t, i) => (
          <li key={i} className="fifo-step" data-opening={t.opening ? 'yes' : undefined}>
            <span className="fifo-step-n">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-[var(--text-primary)]">
                {t.opening ? 'ยอดยกมา' : 'ล็อต'} {t.date}
                {t.ref ? <span className="font-normal text-[var(--text-secondary)]"> · {t.ref}</span> : null}
              </span>
              <span className="block text-[11px] text-[var(--text-secondary)]">
                ใช้ <b className="text-[var(--text-primary)]">{formatNumber(t.take)}</b> จาก {formatNumber(t.lotQty)} {unit} @ {formatMoney(t.cost)}
              </span>
              <span className="fifo-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(4, Math.min(100, (t.take / t.lotQty) * 100))}%` }} />
              </span>
            </span>
          </li>
        ))}
        {data.uncovered > 0 && (
          <li className="fifo-step warn">
            <span className="fifo-step-n">!</span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              เกินยอดคงเหลือ <b className="text-red-500">{formatNumber(data.uncovered)}</b> {unit} — คิดต้นทุนจากล็อตรับเข้าถัดไป/ล่าสุด
            </span>
          </li>
        )}
      </ol>
    </div>
  )
}

export default function FifoTimeline(props) {
  return (
    <FxBoundary name="fifo-timeline">
      <Timeline {...props} />
    </FxBoundary>
  )
}
