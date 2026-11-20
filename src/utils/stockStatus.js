import { groupByProduct, movementsForProduct, sumMovements } from './stockCalc'
import { todayDDMMYYYY } from './date'

// Shared "how is each product doing" view, built ONLY from the existing stockCalc helpers
// (no new stock maths): used by the Stock page, the dashboard's today summary and the pet.

// "สินค้าเหลือน้อย" threshold: 5 units or fewer -> pinned to the top in red.
export const LOW_STOCK_THRESHOLD = 5

export function buildStockRows(products, stockIns, stockOuts) {
  const insByProduct = groupByProduct(stockIns)
  const outsByProduct = groupByProduct(stockOuts)
  return products.map((p) => {
    const ins = movementsForProduct(insByProduct, p)
    const outs = movementsForProduct(outsByProduct, p)
    const inQty = sumMovements(ins).qty
    const outQty = sumMovements(outs).qty
    const qty = inQty - outQty
    // A product that has never been received isn't "running low" — it just isn't stocked.
    const hasMovement = ins.length > 0 || outs.length > 0
    return { ...p, inQty, outQty, qty, hasMovement, low: hasMovement && qty <= LOW_STOCK_THRESHOLD }
  })
}

// Low-stock products, emptiest first.
export function lowStockRows(rows) {
  return rows.filter((r) => r.low).sort((a, b) => a.qty - b.qty)
}

// Movements dated today (the document date — the same date the reports filter on), not
// counting imported ยอดยกมา. Counts lines and distinct products — quantities are not
// added up because products use different units.
export function todaysMovements(stockIns, stockOuts, today = todayDDMMYYYY()) {
  const pick = (list) => list.filter((t) => t.date === today && t.movementType !== 'opening_balance')
  const products = (list) => new Set(list.map((t) => t.productId || t.productCode)).size
  const ins = pick(stockIns)
  const outs = pick(stockOuts)
  return { today, inCount: ins.length, inProducts: products(ins), outCount: outs.length, outProducts: products(outs) }
}
