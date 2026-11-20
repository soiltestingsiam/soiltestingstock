import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListFilter, Bookmark, BadgeCheck, Save, Upload } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import { FormRow, inputClass } from '../components/FormField'
import DateTextInput from '../components/DateTextInput'
import TransactionSearchModal from '../components/TransactionSearchModal'
import StockImportModal from '../components/StockImportModal'
import ProductCodeField from '../components/ProductCodeField'
import MoneyInput from '../components/MoneyInput'
import { TruckIllustration } from '../components/DashboardIllustrations'
import { useStore } from '../store/useStore'
import { isValidDDMMYYYY, todayDDMMYYYY } from '../utils/date'
import { formatMoney, formatNumber, lineTotal } from '../utils/format'
import { filterForProduct, sumMovements } from '../utils/stockCalc'
import { fifoOutCosts } from '../utils/fifoCost'
import FifoTimeline from '../components/FifoTimeline'

function makeEmptyForm() {
  return {
    date: todayDDMMYYYY(),
    productCode: '',
    productId: '',
    productName: '',
    customer: '',
    invoice: '',
    so: '',
    qty: '',
    price: '',
    total: '',
    note: '',
    movementType: 'out',
  }
}

export default function StockOut() {
  const stockIns = useStore((s) => s.stockIns)
  const stockOuts = useStore((s) => s.stockOuts)
  const addStockOut = useStore((s) => s.addStockOut)
  const updateStockOut = useStore((s) => s.updateStockOut)
  const products = useStore((s) => s.products)

  const [form, setForm] = useState(makeEmptyForm)
  const [editingId, setEditingId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      const row = stockOuts.find((t) => t.id === editId)
      if (row) handleEdit(row)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // On-hand quantity for the entered product, excluding the row being edited. Matched by
  // productId when the code resolved to a product, so it can't mix up two products that
  // happen to share a (not-yet-deduplicated) code.
  const available = useMemo(() => {
    if (!form.productId || !form.productName) return null
    const product = { id: form.productId, code: form.productCode.trim() }
    const outs = stockOuts.filter((t) => t.id !== editingId)
    return sumMovements(filterForProduct(stockIns, product)).qty - sumMovements(filterForProduct(outs, product)).qty
  }, [form.productId, form.productCode, form.productName, stockIns, stockOuts, editingId])

  // ราคา / หน่วย of an issue is its FIFO cost (เข้าก่อน-ออกก่อน): units come out of the
  // oldest receipts first, priced at what those lots cost, averaged into one line.
  // Recomputed live from the date + จำนวน; an imported ยอดยกมา row is a lot, not an issue,
  // so it keeps its own price.
  const isLotRow = form.movementType === 'opening_balance'
  const fifo = useMemo(() => {
    const qty = Number(form.qty)
    if (isLotRow || !form.productId || !form.productName || !(qty > 0) || !isValidDDMMYYYY(form.date)) return null
    const product = products.find((p) => p.id === form.productId) ?? { id: form.productId, code: form.productCode.trim() }
    const NEW = '__this_row__'
    const outs = filterForProduct(stockOuts.filter((t) => t.id !== editingId), product)
    const draft = { id: NEW, date: form.date, qty, price: Number(product.unitPrice) || 0, total: 0, movementType: 'out' }
    return fifoOutCosts(filterForProduct(stockIns, product), [...outs, draft]).get(NEW) ?? null
  }, [isLotRow, form.qty, form.date, form.productId, form.productCode, form.productName, products, stockIns, stockOuts, editingId])

  const isReservation = !!form.so.trim() && !form.invoice.trim()
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleQtyChange(qty) {
    setForm((f) => ({ ...f, qty, total: lineTotal(qty, f.price) }))
  }

  function handlePriceChange(price) {
    setForm((f) => ({ ...f, price, total: lineTotal(f.qty, price) }))
  }

  // Entering a code pops in the name and unit price from PRODUCT LIST; ราคารวม follows.
  function handleProductSelect(code, match) {
    setForm((f) => {
      if (!match) return { ...f, productCode: code, productId: '', productName: '' }
      const price = String(Number(match.unitPrice) || 0)
      return { ...f, productCode: code, productId: match.id, productName: match.name, price, total: lineTotal(f.qty, price) }
    })
  }

  function resetForm() {
    setForm(makeEmptyForm())
    setEditingId(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidDDMMYYYY(form.date)) return alert('กรุณากรอกวันที่ให้ถูกต้อง (วว/ดด/ปปปป เป็น พ.ศ.)')
    if (!form.productCode.trim()) return alert('กรุณากรอกรหัสสินค้า')
    if (!form.productName) return alert('ไม่พบรหัสสินค้านี้ใน PRODUCT LIST')
    const qty = Number(form.qty)
    if (!(qty > 0)) return alert('กรุณากรอกจำนวนให้มากกว่า 0')
    if (available !== null && qty > available &&
      !confirm(`สินค้าคงเหลือมีเพียง ${formatNumber(available)} แต่จะจ่ายออก ${formatNumber(qty)} — ยืนยันบันทึกหรือไม่?`))
      return
    const payload = {
      ...form,
      productCode: form.productCode.trim(),
      qty,
      price: isLotRow ? Number(form.price) || 0 : fifo?.price ?? 0,
      total: isLotRow ? Number(form.total) || 0 : fifo?.total ?? 0,
      // Preserve an imported row's movementType (e.g. opening_balance) when editing it
      // here — this ordinary form only ever creates new rows as 'out'.
      movementType: form.movementType || 'out',
    }
    if (editingId) updateStockOut(editingId, payload)
    else addStockOut(payload)
    setSavedMsg(editingId ? 'บันทึกการแก้ไขเรียบร้อย' : `บันทึกสินค้าออก ${payload.productCode} เรียบร้อย`)
    setTimeout(() => setSavedMsg(''), 3000)
    resetForm()
  }

  function handleEdit(row) {
    setEditingId(row.id)
    setForm({
      date: row.date,
      productCode: row.productCode,
      productId: row.productId ?? '',
      productName: row.productName,
      customer: row.customer ?? '',
      invoice: row.invoice ?? '',
      so: row.so ?? '',
      qty: String(row.qty),
      price: String(row.price),
      total: String(row.total),
      note: row.note ?? '',
      movementType: row.movementType || 'out',
    })
  }

  return (
    <SidebarLayout title="บันทึกสินค้าออก" backTo="/">
      <div className="mb-4 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)]"
        >
          <Upload size={16} /> นำเข้าไฟล์
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)]"
        >
          <ListFilter size={16} /> ค้นหา / แก้ไข / ลบ รายการที่บันทึกแล้ว
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-card sm:p-6"
      >
        <div className="mb-3 text-center text-sm font-semibold text-orange-400">
          {editingId ? 'แก้ไขรายการสินค้าออก' : 'ใบบันทึกสินค้าออก'}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <FormRow label="1. วันที่" required>
              <DateTextInput value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            </FormRow>
            <FormRow label="2. รหัสสินค้า" required>
              <ProductCodeField value={form.productCode} onSelect={handleProductSelect} listId="out-product-codes" />
            </FormRow>
            <FormRow
              label="3. ชื่อสินค้า"
              hint={available !== null ? `คงเหลือในสต๊อก: ${formatNumber(available)}` : undefined}
            >
              <input value={form.productName} readOnly placeholder="ขึ้นอัตโนมัติจาก PRODUCT LIST" className={inputClass('cursor-not-allowed opacity-80')} />
            </FormRow>
            <FormRow label="4. ลูกค้า / หน่วยงาน">
              <input value={form.customer} onChange={set('customer')} className={inputClass()} />
            </FormRow>
            <FormRow label="5. INVOICE">
              <input value={form.invoice} onChange={set('invoice')} placeholder="IV-XXXXXXXXX" className={inputClass()} />
            </FormRow>
            <FormRow label="6. SO" hint="ใส่ SO = จองสินค้า (ออกอินวอยแล้วไม่ต้องใส่)">
              <input value={form.so} onChange={set('so')} placeholder="SO-XXXXXXXXX" className={inputClass()} />
            </FormRow>
            <FormRow label="7. จำนวน" required>
              <input type="number" min="0" step="any" value={form.qty} onChange={(e) => handleQtyChange(e.target.value)} className={inputClass()} />
            </FormRow>
            {isLotRow ? (
              <>
                <FormRow label="8. ราคา / หน่วย" hint="รายการยอดยกมา: ใช้ราคาของรายการนี้เอง">
                  <MoneyInput value={form.price} onChange={handlePriceChange} />
                </FormRow>
                <FormRow label="9. ราคารวม" hint="คำนวณอัตโนมัติ แก้ไขเองได้">
                  <MoneyInput value={form.total} onChange={(v) => setForm((f) => ({ ...f, total: v }))} />
                </FormRow>
              </>
            ) : (
              <>
                <FormRow label="8. ราคา / หน่วย" hint="ต้นทุนแบบ FIFO (เข้าก่อน-ออกก่อน) เฉลี่ยจากล็อตที่รับเข้าก่อน คำนวณอัตโนมัติ">
                  <input
                    value={fifo ? formatMoney(fifo.price) : ''}
                    readOnly
                    placeholder="กรอกรหัสสินค้า วันที่ และจำนวน"
                    className={inputClass('cursor-not-allowed opacity-80')}
                  />
                </FormRow>
                <FormRow label="9. ราคารวม" hint="ต้นทุนรวมของจำนวนที่จ่ายออก">
                  <input
                    value={fifo ? formatMoney(fifo.total) : ''}
                    readOnly
                    className={inputClass('cursor-not-allowed opacity-80')}
                  />
                </FormRow>
                {fifo && (
                  <FifoTimeline
                    stockIns={stockIns}
                    stockOuts={stockOuts}
                    products={products}
                    productId={form.productId}
                    productCode={form.productCode}
                    date={form.date}
                    qty={form.qty}
                    editingId={editingId}
                    unit={products.find((p) => p.id === form.productId)?.unit || ''}
                  />
                )}
              </>
            )}
            <FormRow label="10. หมายเหตุ">
              <input value={form.note} onChange={set('note')} className={inputClass()} />
            </FormRow>
          </div>
          <div className="hidden w-56 flex-shrink-0 justify-center lg:flex">
            <div className="w-40">
              <TruckIllustration />
            </div>
          </div>
        </div>

        {(form.so.trim() || form.invoice.trim()) && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium ${
              isReservation ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {isReservation ? <Bookmark size={14} /> : <BadgeCheck size={14} />}
            {isReservation
              ? 'สถานะ: การจองสินค้า (SO) — เมื่อออก INVOICE แล้วให้ลบรายการ SO นี้ออก'
              : 'สถานะ: ออกสินค้าแล้ว (INVOICE)'}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {savedMsg && <span className="mr-auto text-sm text-emerald-300">{savedMsg}</span>}
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
          <button
            type="submit"
            data-magnetic
            className="btn-shimmer flex items-center gap-2 rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            <Save size={16} /> {editingId ? 'บันทึกการแก้ไข' : 'Save'}
          </button>
        </div>
      </form>

      <TransactionSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} initialType="out" />
      <StockImportModal open={importOpen} onClose={() => setImportOpen(false)} type="out" />
    </SidebarLayout>
  )
}
