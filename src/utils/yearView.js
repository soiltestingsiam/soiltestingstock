import { ddmmyyyyToSortable } from './date'
import { buildItemLedger, groupByProduct, movementsForProduct } from './stockCalc'

// ---------------------------------------------------------------------------------
// "One book per year" (like the CD program): pick a year and the reports show that
// year only, opening with ONE ยอดยกมา line = the balance at the end of the year before.
// Built on top of stockCalc.buildItemLedger, which already rolls every movement before
// the start date into ยอดยกมา — nothing here changes the stock maths.
//
// Also the helpers for closing old years (Settings → ข้อมูลรายปี): what each item has
// left at the end of a year, split into the FIFO cost layers it still holds, so those
// can become ยอดยกมา of the next year and every later balance / FIFO cost stays the same.
//
// Dates are stored as DD/MM/YYYY in ค.ศ.; years shown to people are พ.ศ.
// ---------------------------------------------------------------------------------

export const BE_OFFSET = 543
const EPS = 1e-9

export const currentBeYear = (d = new Date()) => d.getFullYear() + BE_OFFSET

export function beYearOf(dateStr) {
  const s = ddmmyyyyToSortable(dateStr)
  return s == null ? null : Math.floor(s / 10000) + BE_OFFSET
}

// a พ.ศ. year as a date range (stored ค.ศ. strings + sortable numbers)
export function yearRange(be) {
  const ce = be - BE_OFFSET
  return { from: `01/01/${ce}`, to: `31/12/${ce}`, fromSortable: ce * 10000 + 101, toSortable: ce * 10000 + 1231 }
}

// years that have any movement, newest first (this year is always offered)
export function yearsWithData(stockIns, stockOuts, now = new Date()) {
  const set = new Set([currentBeYear(now)])
  for (const list of [stockIns, stockOuts]) {
    for (const t of list) {
      const y = beYearOf(t.date)
      if (y) set.add(y)
    }
  }
  return [...set].sort((a, b) => b - a)
}

// An imported ยอดยกมา row is always counted by the ledger whatever the dates; one dated
// AFTER the chosen year opens a later year, so it is left out of that year's book.
export function withoutLaterOpenings(list, toSortable) {
  if (toSortable == null) return list
  return list.filter((t) => t.movementType !== 'opening_balance' || (ddmmyyyyToSortable(t.date) ?? 0) <= toSortable)
}

// The ยอดยกมา rows at the top of a ledger (rolled-up earlier movements and/or imported
// ยอดยกมา rows) shown as ONE line, e.g. "ยอดยกมาปี 2568", dated `date` (the last day of the
// year before — 31/12/2568 — like the CD program). Running balances are unchanged: the
// merged line carries the balance of the last row it replaces.
export function mergeLeadingOpening(ledger, label, date = null) {
  const rows = ledger.rows
  let n = 0
  while (n < rows.length && rows[n].group === 'opening') n += 1
  if (n === 0) return ledger
  const lead = rows.slice(0, n)
  const qty = lead.reduce((s, r) => s + r.qty, 0)
  const value = lead.reduce((s, r) => s + r.value, 0)
  const last = lead[n - 1]
  const merged = {
    ...last,
    group: 'opening',
    date,
    sortable: lead[0].sortable,
    docNo: label,
    qty,
    value,
    price: qty !== 0 ? value / qty : 0,
    party: '',
    note: '',
    isReservation: false,
  }
  return { ...ledger, rows: [merged, ...rows.slice(n)] }
}

export const openingLabel = (be) => `ยอดยกมาปี ${be - 1}`

// one product's book for a พ.ศ. year
export function yearLedger(product, ins, outs, be) {
  const { fromSortable, toSortable } = yearRange(be)
  const ledger = buildItemLedger(product, withoutLaterOpenings(ins, toSortable), withoutLaterOpenings(outs, toSortable), {
    fromSortable,
    toSortable,
  })
  // dated the last day of the previous year, e.g. 31/12/2568 for the 2569 book
  return mergeLeadingOpening(ledger, openingLabel(be), `31/12/${be - 1 - BE_OFFSET}`)
}

// how many rows each year holds: { be, in, out, opening, total } newest first
export function yearCounts(stockIns, stockOuts) {
  const map = new Map()
  const bump = (be, key) => {
    if (!be) return
    const c = map.get(be) ?? { be, in: 0, out: 0, opening: 0, total: 0 }
    c[key] += 1
    c.total += 1
    map.set(be, c)
  }
  for (const t of stockIns) bump(beYearOf(t.date), t.movementType === 'opening_balance' ? 'opening' : 'in')
  for (const t of stockOuts) bump(beYearOf(t.date), t.movementType === 'opening_balance' ? 'opening' : 'out')
  return [...map.values()].sort((a, b) => b.be - a.be)
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// FIFO always leaves the NEWEST units in stock (issues take the oldest first), so the
// layers an item still holds are its latest receipts, walking back until they add up to
// what is left. Receipt order matches fifoCost.js: by date, ยอดยกมา lots before receipts
// on the same day, then list order.
function remainingLayers(ins, outs, left) {
  const lots = []
  ins.forEach((m, i) => lots.push({ m, rank: m.movementType === 'opening_balance' ? 0 : 1, i }))
  outs.forEach((m, j) => {
    if (m.movementType === 'opening_balance') lots.push({ m, rank: 0, i: ins.length + j })
  })
  lots.forEach((l) => (l.s = ddmmyyyyToSortable(l.m.date) ?? 0))
  lots.sort((a, b) => a.s - b.s || a.rank - b.rank || a.i - b.i)

  const layers = []
  let need = left
  for (let k = lots.length - 1; k >= 0 && need > EPS; k -= 1) {
    const qty = Number(lots[k].m.qty) || 0
    if (qty <= EPS) continue
    const take = Math.min(qty, need)
    layers.unshift({ qty: take, cost: (Number(lots[k].m.total) || 0) / qty, date: lots[k].m.date })
    need -= take
  }
  if (need > EPS) {
    // more left than was ever received (corrections with negative qty): the extra units
    // take the latest known cost
    const cost = layers.length ? layers[layers.length - 1].cost : 0
    layers.push({ qty: need, cost, date: null })
  }
  return layers
}

// Closing every year up to and including `throughBe`: for each item, the ยอดยกมา rows to
// open year throughBe+1 with (one per FIFO layer still in stock). `stockOuts` should be
// the FIFO-costed rows (useCostedStockOuts) so values match what the reports show.
// Returns { rows, removedCount, productCount, negative } — rows in the database's column
// names; `negative` lists items that are below zero at the cut-off (their quantity carries
// over, but FIFO cannot carry "owed" units, so their next receipts may cost differently —
// worth fixing before closing).
export function carryForward(products, stockIns, stockOuts, throughBe) {
  const { toSortable } = yearRange(throughBe)
  const upTo = (list) => list.filter((t) => (ddmmyyyyToSortable(t.date) ?? 0) <= toSortable)
  const ins = upTo(stockIns)
  const outs = upTo(stockOuts)
  const insMap = groupByProduct(ins)
  const outsMap = groupByProduct(outs)
  const note = `ยกยอดจากปี ${throughBe}`
  const rows = []
  const negative = []
  let productCount = 0

  for (const p of products) {
    const pi = movementsForProduct(insMap, p)
    const po = movementsForProduct(outsMap, p)
    if (!pi.length && !po.length) continue
    const { closing } = buildItemLedger(p, pi, po, {})
    const qty = Math.round(closing.qty * 1e6) / 1e6
    const value = round2(closing.value)
    if (Math.abs(qty) <= EPS && Math.abs(value) < 0.005) continue
    if (qty < -EPS) negative.push({ id: p.id, code: p.code, name: p.name, qty })

    const layers = qty > EPS ? remainingLayers(pi, po, qty) : [{ qty, cost: qty !== 0 ? value / qty : 0 }]
    const parts = layers.map((l) => ({ qty: l.qty, total: round2(l.qty * l.cost) }))
    // keep the carried value exactly what the report shows (rounding goes on the oldest layer)
    const diff = round2(value - parts.reduce((s, x) => s + x.total, 0))
    if (diff !== 0) parts[0].total = round2(parts[0].total + diff)

    productCount += 1
    for (const part of parts) {
      rows.push({
        product_id: p.id,
        product_code: p.code,
        product_name: p.name,
        qty: part.qty,
        unit_price: part.qty !== 0 ? part.total / part.qty : 0,
        total: part.total,
        note,
      })
    }
  }
  return { rows, removedCount: ins.length + outs.length, productCount, negative }
}
