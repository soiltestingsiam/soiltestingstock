import { ddmmyyyyToSortable } from './date'

// DISPLAY ONLY — which lots a Stock Out draws from, oldest first (for the FIFO batch
// timeline on the Stock Out page). It follows exactly the same order and rules as
// fifoOutCosts() in fifoCost.js, but also remembers each lot's date / document so the
// screen can show "ล็อต 01/11/2569 · ใช้ 2 @ 1,000". The cost that is SAVED still comes
// from fifoCost.js only; this file never feeds a saved value or a report.
//
// ins / outs: one product's movements (outs may include a draft row). Returns, for the
// out row `targetId`: { takes: [{ date, ref, lotQty, take, cost, leftAfter }], uncovered }
// where `uncovered` is the part not backed by any lot at that point (stock below zero).

const EPS = 1e-9

export function fifoLotsFor(ins, outs, targetId) {
  const events = []
  const add = (m, i, isOutList) => {
    const isOpening = m.movementType === 'opening_balance'
    events.push({ m, rank: isOpening ? 0 : isOutList ? 2 : 1, s: ddmmyyyyToSortable(m.date) ?? 0, i })
  }
  ins.forEach((m, i) => add(m, i, false))
  outs.forEach((m, i) => add(m, ins.length + i, true))
  events.sort((a, b) => a.s - b.s || a.rank - b.rank || a.i - b.i)

  const lots = []
  let head = 0
  const pending = []
  for (const { m, rank } of events) {
    const qty = Number(m.qty) || 0
    if (rank !== 2) {
      if (qty <= EPS) continue
      const cost = (Number(m.total) || 0) / qty
      let left = qty
      while (left > EPS && pending.length) {
        const p = pending[0]
        const take = Math.min(left, p.qty)
        p.qty -= take
        left -= take
        if (p.qty <= EPS) pending.shift()
      }
      if (left > EPS) {
        lots.push({ qty: left, start: qty, cost, date: m.date, ref: m.po || m.invoice || m.supplier || '', opening: rank === 0 })
      }
      continue
    }
    let need = qty
    const takes = []
    while (need > EPS && head < lots.length) {
      const lot = lots[head]
      const take = Math.min(need, lot.qty)
      takes.push({ date: lot.date, ref: lot.ref, opening: lot.opening, lotQty: lot.qty, take, cost: lot.cost, leftAfter: lot.qty - take })
      lot.qty -= take
      need -= take
      if (lot.qty <= EPS) head += 1
    }
    if (m.id === targetId) return { takes, uncovered: need > EPS ? need : 0 }
    if (need > EPS) pending.push({ id: m.id, qty: need })
  }
  return { takes: [], uncovered: 0 }
}
