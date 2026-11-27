import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import Modal from './Modal'
import FormField, { inputClass } from './FormField'
import MoneyInput from './MoneyInput'
import ProductImageUpload from './ProductImageUpload'
import { useStore } from '../store/useStore'

// "แก้ไขสินค้า / รูปภาพ" from the Stock page: the same details and rules as PRODUCT LIST
// (รหัสสินค้า must stay unique; changing ราคาหน่วยละ never rewrites costs already recorded)
// plus the product photo. Details are saved with the existing updateProduct; the photo with
// setProductImage afterwards — if the photo fails, the details are still saved and the
// dialog says what went wrong.
export default function ProductEditModal({ product, onClose }) {
  const products = useStore((s) => s.products)
  const updateProduct = useStore((s) => s.updateProduct)
  const setProductImage = useStore((s) => s.setProductImage)
  const live = products.find((p) => p.id === product?.id) || product
  const [form, setForm] = useState(null)
  const [pending, setPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', tone: 'info' })

  useEffect(() => {
    if (!product) return
    setForm({ code: product.code, name: product.name, unit: product.unit, unitPrice: String(product.unitPrice ?? ''), openingQty: String(product.openingQty ?? '1') })
    setPending(null)
    setMsg({ text: '', tone: 'info' })
  }, [product])

  if (!product || !form) return null

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      setMsg({ text: 'กรุณากรอกรหัสสินค้าและชื่อสินค้า', tone: 'error' })
      return
    }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      unitPrice: Number(form.unitPrice) || 0,
      openingQty: Number(form.openingQty) || 0,
    }
    if (products.some((p) => p.code === payload.code && p.id !== product.id)) {
      setMsg({ text: 'รหัสสินค้านี้มีอยู่แล้ว', tone: 'error' })
      return
    }
    setSaving(true)
    const changed =
      payload.code !== live.code ||
      payload.name !== live.name ||
      payload.unit !== live.unit ||
      payload.unitPrice !== (Number(live.unitPrice) || 0) ||
      payload.openingQty !== (Number(live.openingQty) || 0)
    if (changed) {
      const ok = await updateProduct(product.id, payload)
      if (!ok) {
        setSaving(false)
        return // updateProduct already told the user why
      }
    }
    if (pending) {
      const res = await setProductImage(product.id, pending)
      if (!res.ok) {
        setSaving(false)
        setMsg({ text: `${changed ? 'บันทึกรายละเอียดแล้ว แต่' : ''}${res.message}`, tone: 'error' })
        return
      }
    }
    setSaving(false)
    onClose(changed || pending ? 'saved' : null)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open onClose={() => !saving && onClose(null)} title={`แก้ไขสินค้า / รูปภาพ · ${product.code}`}>
      <div className="mb-5">
        <ProductImageUpload imageUrl={live.imageUrl} pending={pending} onChange={setPending} busy={saving && !!pending?.blob} message={msg.tone === 'error' ? '' : msg.text} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="รหัสสินค้า" required>
          <input value={form.code} onChange={set('code')} className={inputClass()} />
        </FormField>
        <FormField label="ชื่อสินค้า" required>
          <input value={form.name} onChange={set('name')} className={inputClass()} />
        </FormField>
        <FormField label="จำนวน" hint="1 หน่วย (ราคาต่อ 1 ตัว)">
          <input type="number" value={form.openingQty} onChange={set('openingQty')} className={inputClass()} />
        </FormField>
        <FormField label="หน่วย" hint="เช่น EA">
          <input value={form.unit} onChange={set('unit')} className={inputClass()} />
        </FormField>
        <FormField label="ราคาหน่วยละ" hint="ราคาต้นทุนล่าสุด ไม่รวม VAT — ไม่เปลี่ยนต้นทุนของรายการที่บันทึกไปแล้ว">
          <MoneyInput value={form.unitPrice} onChange={(v) => setForm((f) => ({ ...f, unitPrice: v }))} />
        </FormField>
      </div>
      {msg.tone === 'error' && msg.text && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
          {msg.text}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onClose(null)}
          disabled={saving}
          className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} บันทึก
        </button>
      </div>
    </Modal>
  )
}
