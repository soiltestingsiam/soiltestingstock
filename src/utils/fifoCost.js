import { ddmmyyyyToSortable } from './date'
import { groupByProduct, movementsForProduct } from './stockCalc'

// ---------------------------------------------------------------------------------
// FIFO (เข้าก่อน-ออกก่อน) cost of every Stock Out row.
//
// Every receipt (and every ยอดยกมา row) is a lot with its own unit cost. A Stock Out
// takes units from the oldest lot first, and its cost is what those units cost, shown
// as one line at the averaged unit cost. Example:
//   day 1 in 10 @ 1,000 · out 9 (9 @ 1,000) · day 5 in 10 @ 1,500
//   out 2 = 1 @ 1,000 (day-1 lot) + 1 @ 1,500 (day-5 lot) = 2,500 → 1,250 / unit
//   balance 9 @ 1,500 = 13,500
//
// Nothing here changes the stock calculation itself (stockCalc.js): the reports feed
// these re-costed Stock Out rows into the same buildItemLedger / buildAllStockSummary,
// so ยอดยกมา, totals and running balances all follow from them. Costs are recomputed
// from the full history every time, so a back-dated or edited row re-costs every later
// issue correctly.
// ---------------------------------------------------------------------------------

const EPS = 1e-9

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// ins / outs: one product's movements. Returns Map(outId -> { price, total }).
// Same-day order: ยอดยกมา lots first, then receipts, then issues (as the ledger shows
// them); rows on the same day keep their list order. If stock goes below zero, the
// missing units take their cost from the next receipt (which is reduced by them).
export function fifoOutCosts(ins, outs) {
  const events = []
  const add = (m, i, isOutList) => {
    const isOpening = m.movementType === 'opening_balance'
    // an imported ยอดยกมา row is a lot whichever list it was imported into (the ledger
    // also always adds it to stock)
    events.push({ m, rank: isOpening ? 0 : isOutList ? 2 : 1, s: ddmmyyyyToSortable(m.date) ?? 0, i })
  }
  ins.forEach((m, i) => add(m, i, false))
  outs.forEach((m, i) => add(m, ins.length + i, true))
  events.sort((a, b) => a.s - b.s || a.rank - b.rank || a.i - b.i)

  const lots = []
  let head = 0
  let lastCost = null
  const value = new Map() // outId -> cost so far
  const qtyOf = new Map() // outId -> { qty, price } as entered
  const pending = [] // issued units not yet covered by any receipt: { id, qty }

  for (const { m, rank } of events) {
    const qty = Number(m.qty) || 0
    if (rank !== 2) {
      if (qty <= EPS) continue
      const cost = (Number(m.total) || 0) / qty
      lastCost = cost
      let left = qty
      // stock went below zero earlier: this receipt covers those units first, so they
      // take this lot's cost (and the lot is reduced by them)
      while (left > EPS && pending.length) {
        const p = pending[0]
        const take = Math.min(left, p.qty)
        value.set(p.id, value.get(p.id) + take * cost)
        p.qty -= take
        left -= take
        if (p.qty <= EPS) pending.shift()
      }
      if (left > EPS) lots.push({ qty: left, cost })
      continue
    }
    let need = qty
    let v = 0
    while (need > EPS && head < lots.length) {
      const lot = lots[head]
      const take = Math.min(need, lot.qty)
      v += take * lot.cost
      lot.qty -= take
      need -= take
      lastCost = lot.cost
      if (lot.qty <= EPS) head += 1
    }
    value.set(m.id, v)
    qtyOf.set(m.id, { qty, price: Number(m.price) || 0 })
    if (need > EPS) pending.push({ id: m.id, qty: need })
  }

  // issued more than was ever received: the uncovered units take the latest known cost
  // (or the row's own price when the product never had a receipt)
  pending.forEach((p) => value.set(p.id, value.get(p.id) + p.qty * (lastCost ?? qtyOf.get(p.id).price)))

  const costs = new Map()
  value.forEach((v, id) => {
    const total = round2(v)
    const { qty } = qtyOf.get(id)
    costs.set(id, { price: qty > EPS ? total / qty : 0, total })
  })
  return costs
}

// All products at once: returns stockOuts with price / total replaced by their FIFO
// cost. Rows that already match (or whose product no longer exists) are returned as-is.
export function applyFifoCosting(products, stockIns, stockOuts) {
  if (!stockOuts.length) return stockOuts
  const insMap = groupByProduct(stockIns)
  const outsMap = groupByProduct(stockOuts)
  const costs = new Map()
  products.forEach((p) => {
    const outs = movementsForProduct(outsMap, p)
    if (!outs.length) return
    fifoOutCosts(movementsForProduct(insMap, p), outs).forEach((c, id) => costs.set(id, c))
  })
  if (!costs.size) return stockOuts
  return stockOuts.map((o) => {
    const c = costs.get(o.id)
    return c && (c.total !== o.total || c.price !== o.price) ? { ...o, price: c.price, total: c.total } : o
  })
}
