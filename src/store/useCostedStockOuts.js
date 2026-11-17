import { useMemo } from 'react'
import { useStore } from './useStore'
import { applyFifoCosting } from '../utils/fifoCost'

// Stock Out rows with price / total set to their FIFO cost (see utils/fifoCost.js).
// Everything that shows the value of goods issued (reports, transaction search) reads
// this instead of the price stored on each row.
export function useCostedStockOuts() {
  const products = useStore((s) => s.products)
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  return useMemo(() => applyFifoCosting(products, stockIns, stockOuts), [products, stockIns, stockOuts])
}

export default useCostedStockOuts
