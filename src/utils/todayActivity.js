import { todayDDMMYYYY } from './date'

// "วันนี้" on the home page — what the team actually did today. A row counts when:
//  - it was RECORDED today (created_at, Thai local day), whatever its document date —
//    receipts / issues are often keyed in with the invoice's own earlier date; or
//  - its document date is today (also covers a file of today's documents imported today).
// Not counted: ยอดยกมา (opening balances), and files imported today that carry older
// document dates (that's loading history, not today's work). Edits never count (an edit
// keeps its created_at). Display only — the stock figures and reports are not affected.

const pad = (n) => String(n).padStart(2, '0')
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function recordedOn(t, dayKey) {
  if (!t?.createdAt) return false
  const d = new Date(t.createdAt)
  return !Number.isNaN(d.getTime()) && localDay(d) === dayKey
}

export function todaysActivity(stockIns, stockOuts, now = new Date()) {
  const today = todayDDMMYYYY()
  const dayKey = localDay(now)
  const counts = (t) => t.movementType !== 'opening_balance' && (t.date === today || (t.source !== 'import' && recordedOn(t, dayKey)))
  const products = (list) => new Set(list.map((t) => t.productId || t.productCode)).size
  const ins = stockIns.filter(counts)
  const outs = stockOuts.filter(counts)
  const backdated = (list) => list.filter((t) => t.date !== today).length
  return {
    today,
    inCount: ins.length,
    inProducts: products(ins),
    inBackdated: backdated(ins),
    outCount: outs.length,
    outProducts: products(outs),
    outBackdated: backdated(outs),
  }
}
