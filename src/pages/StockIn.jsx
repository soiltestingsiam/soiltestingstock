import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListFilter, Save, Upload } from 'lucide-react'
import SidebarLayout from '../components/SidebarLayout'
import { FormRow, inputClass } from '../components/FormField'
import DateTextInput from '../components/DateTextInput'
import TransactionSearchModal from '../components/TransactionSearchModal'
import StockImportModal from '../components/StockImportModal'
import ProductCodeField from '../components/ProductCodeField'
import StockInProductPanel, { StockInPhotoCard } from '../components/StockInProductPanel'
import MoneyInput from '../components/MoneyInput'
import { WarehouseIllustration } from '../components/DashboardIllustrations'
import { useStore } from '../store/useStore'
import { ddmmyyyyToSortable, isValidDDMMYYYY, todayDDMMYYYY } from '../utils/date'
import { formatMoney, lineTotal } from '../utils/format'
import { filterForProduct } from '../utils/stockCalc'

function makeEmptyForm() {
  return {
    date: todayDDMMYYYY(),
    productCode: '',
    productId: '',
    productName: '',
    supplier: '',
    po: '',
    qty: '',
    price: '',
    total: '',
    soLot: '',
    customer: '',
    note: '',
    movementType: 'in',
  }
}

export default function StockIn() {
  const stockIns = useStore((s) => s.stockIns)
  const addStockIn = useStore((s) => s.addStockIn)
  const updateStockIn = useStore((s) => s.updateStockIn)
  const updateProduct = useStore((s) => s.updateProduct)
  const setProductImage = useStore((s) => s.setProductImage)
  const products = useStore((s) => s.products)

  const [form, setForm] = useState(makeEmptyForm)
  const [editingId, setEditingId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  // the product photo picked on this form (saved for the product when Save is pressed)
  const [photoPending, setPhotoPending] = useState(null)
  const [photoMsg, setPhotoMsg] = useState(null) // { text, tone: 'busy' | 'ok' | 'error' }

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId) {
      const row = stockIns.find((t) => t.id === editId)
      if (row) handleEdit(row)
      setSearchParams({}, { replace: true })
      return
    }
    // ?product=<id> — from the pet's "ภารกิจด่วน" shortcut: start a receipt for that product
    const productId = searchParams.get('product')
    if (productId) {
      const p = products.find((x) => x.id === productId)
      if (p) handleProductSelect(p.code, p)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleQtyChange(qty) {
    setForm((f) => ({ ...f, qty, total: lineTotal(qty, f.price) }))
  }

  function handlePriceChange(price) {
    setForm((f) => ({ ...f, price, total: lineTotal(f.qty, price) }))
  }

  // ราคา / หน่วย starts from PRODUCT LIST but is the real cost of this receipt (each
  // receipt is its own FIFO lot, as in the CD accounting program). Saving the newest
  // receipt at a different price moves PRODUCT LIST to that price, so the next receipt
  // starts from the latest cost.
  function productFor(f) {
    return (f.productId && products.find((p) => p.id === f.productId)) || products.find((p) => p.code === f.productCode)
  }

  // Entering a code pops in the name and unit price from PRODUCT LIST; ราคารวม follows.
  function handleProductSelect(code, match) {
    setForm((f) => {
      if (!match) return { ...f, productCode: code, productId: '', productName: '', price: '', total: '' }
      const price = String(Number(match.unitPrice) || 0)
      return { ...f, productCode: code, productId: match.id, productName: match.name, price, total: lineTotal(f.qty, price) }
    })
  }

  function resetForm() {
    setForm(makeEmptyForm())
    setPhotoPending(null)
    setEditingId(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidDDMMYYYY(form.date)) return alert('กรุณากรอกวันที่ให้ถูกต้อง (วว/ดด/ปปปป เป็น พ.ศ.)')
    if (!form.productCode.trim()) return alert('กรุณากรอกรหัสสินค้า')
    if (!form.productName) return alert('ไม่พบรหัสสินค้านี้ใน PRODUCT LIST')
    if (!(Number(form.qty) > 0)) return alert('กรุณากรอกจำนวนให้มากกว่า 0')
    const product = productFor(form)
    if (!product) return alert('ไม่พบรหัสสินค้านี้ใน PRODUCT LIST')
    const price = Number(form.price) || 0
    const payload = {
      ...form,
      productId: product.id,
      productCode: form.productCode.trim(),
      qty: Number(form.qty) || 0,
      price,
      total: Number(form.total) || 0,
      // Preserve an imported row's movementType (e.g. opening_balance) when editing it
      // here — this ordinary form only ever creates new rows as 'in'.
      movementType: form.movementType || 'in',
    }
    if (editingId) updateStockIn(editingId, payload)
    else addStockIn(payload)

    // newest receipt of this product (by date) at a new price -> PRODUCT LIST follows.
    // A back-dated receipt or a ยอดยกมา row never changes it.
    const otherDates = filterForProduct(stockIns, product)
      .filter((t) => t.id !== editingId)
      .map((t) => ddmmyyyyToSortable(t.date) ?? 0)
    const isNewest = (ddmmyyyyToSortable(payload.date) ?? 0) >= Math.max(0, ...otherDates)
    const updatesList =
      payload.movementType !== 'opening_balance' && isNewest && price !== (Number(product.unitPrice) || 0)
    if (updatesList) updateProduct(product.id, { unitPrice: price })

    const msg = editingId ? 'บันทึกการแก้ไขเรียบร้อย' : `บันทึกรับสินค้า ${payload.productCode} เรียบร้อย`
    setSavedMsg(updatesList ? `${msg} · อัปเดตราคาใน PRODUCT LIST เป็น ${formatMoney(price)} บาท` : msg)

    // the photo picked on this form goes to the product — after the receipt, and a photo
    // problem only shows a message (the receipt itself is never affected)
    if (photoPending) {
      const change = photoPending
      const code = product.code
      setPhotoPending(null)
      setPhotoMsg({ text: `กำลังบันทึกรูปของ ${code}…`, tone: 'busy' })
      setProductImage(product.id, change).then((res) => {
        setPhotoMsg(
          res.ok
            ? { text: change.remove ? `ลบรูปของ ${code} แล้ว` : `บันทึกรูปของ ${code} แล้ว ✓`, tone: 'ok' }
            : { text: `บันทึกรับสินค้าแล้ว แต่ยังไม่ได้บันทึกรูป — ${res.message}`, tone: 'error' },
        )
        if (res.ok) setTimeout(() => setPhotoMsg(null), 4500)
      })
    }
    setTimeout(() => setSavedMsg(''), 4000)
    resetForm()
  }

  function handleEdit(row) {
    setEditingId(row.id)
    setForm({
      date: row.date,
      productCode: row.productCode,
      productId: row.productId ?? '',
      productName: row.productName,
      supplier: row.supplier ?? '',
      po: row.po ?? '',
      qty: String(row.qty),
      price: String(row.price),
      total: String(row.total),
      soLot: row.soLot ?? '',
      customer: row.customer ?? '',
      note: row.note ?? '',
      movementType: row.movementType || 'in',
    })
  }

  return (
    <SidebarLayout title="บันทึกรับสินค้าเข้า" backTo="/">
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
          {editingId ? 'แก้ไขรายการรับสินค้า' : 'ใบรับสินค้าเข้า'}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <FormRow label="1. วันที่" required>
              <DateTextInput value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            </FormRow>
            <FormRow label="2. รหัสสินค้า" required>
              <ProductCodeField value={form.productCode} onSelect={handleProductSelect} listId="in-product-codes" />
            </FormRow>
            <FormRow label="3. ชื่อสินค้า">
              <input value={form.productName} readOnly placeholder="ขึ้นอัตโนมัติจาก PRODUCT LIST" className={inputClass('cursor-not-allowed opacity-80')} />
            </FormRow>
            <FormRow label="รูปสินค้า">
              <StockInProductPanel
                code={form.productCode}
                productId={form.productId}
                pending={photoPending}
                onPendingChange={setPhotoPending}
                onCreated={(p) => handleProductSelect(p.code, p)}
              />
            </FormRow>
            <FormRow label="4. ผู้ผลิต / ผู้ขาย">
              <input value={form.supplier} onChange={set('supplier')} className={inputClass()} />
            </FormRow>
            <FormRow label="5. PO">
              <input value={form.po} onChange={set('po')} placeholder="PO-XXXXXXXXX" className={inputClass()} />
            </FormRow>
            <FormRow label="6. จำนวน" required>
              <input type="number" min="0" step="any" value={form.qty} onChange={(e) => handleQtyChange(e.target.value)} className={inputClass()} />
            </FormRow>
            <FormRow label="7. ราคา / หน่วย" hint="ต้นทุนจริงของการรับเข้าครั้งนี้ (ดึงราคาล่าสุดจาก PRODUCT LIST มาให้ แก้ได้)">
              <MoneyInput value={form.price} onChange={handlePriceChange} />
            </FormRow>
            <FormRow label="8. ราคารวม" hint="คำนวณอัตโนมัติ แก้ไขเองได้">
              <MoneyInput value={form.total} onChange={(v) => setForm((f) => ({ ...f, total: v }))} />
            </FormRow>
            <FormRow label="9. SO / LOT">
              <input value={form.soLot} onChange={set('soLot')} className={inputClass()} />
            </FormRow>
            <FormRow label="10. ลูกค้า / หน่วยงาน">
              <input value={form.customer} onChange={set('customer')} className={inputClass()} />
            </FormRow>
            <FormRow label="11. หมายเหตุ">
              <input value={form.note} onChange={set('note')} className={inputClass()} />
            </FormRow>
          </div>
          <div className="hidden w-56 flex-shrink-0 justify-center lg:flex">
            <StockInPhotoCard
              productId={form.productId}
              pending={photoPending}
              fallback={
                <div className="w-40">
                  <WarehouseIllustration />
                </div>
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {(savedMsg || photoMsg) && (
            <span className="mr-auto flex flex-col gap-0.5 text-sm">
              {savedMsg && <span className="text-emerald-300">{savedMsg}</span>}
              {photoMsg && (
                <span role="status" className={photoMsg.tone === 'error' ? 'text-red-500' : photoMsg.tone === 'ok' ? 'text-emerald-300' : 'text-[var(--text-secondary)]'}>
                  {photoMsg.text}
                </span>
              )}
            </span>
          )}
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
            className="btn-shimmer flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Save size={16} /> {editingId ? 'บันทึกการแก้ไข' : 'Save'}
          </button>
        </div>
      </form>

      <TransactionSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} initialType="in" />
      <StockImportModal open={importOpen} onClose={() => setImportOpen(false)} type="in" />
    </SidebarLayout>
  )
}
