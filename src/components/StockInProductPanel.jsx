import { useEffect, useState } from 'react'
import { PackagePlus, Loader2, X } from 'lucide-react'
import ProductImageUpload from './ProductImageUpload'
import ProductThumbnail from './ProductThumbnail'
import MoneyInput from './MoneyInput'
import { inputClass } from './FormField'
import { useStore } from '../store/useStore'
import FxBoundary from './FxBoundary'

// "รูปสินค้า" on the Stock In page.
//  - A product from PRODUCT LIST is picked: its current photo, and "เพิ่มรูป / เปลี่ยนรูป"
//    that saves the product's photo right away (useStore.setProductImage) — independent of
//    the receipt, so a photo problem can never block saving the Stock In.
//  - The code isn't in PRODUCT LIST yet: "เพิ่มเป็นสินค้าใหม่" opens a small form (name ·
//    unit · price · photo) that adds the product with the usual addProduct, fills it into
//    the receipt, then uploads the photo.

function ExistingProductImage({ product }) {
  const setProductImage = useStore((s) => s.setProductImage)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', tone: 'info' })

  // a new product picked → start clean
  useEffect(() => {
    setPending(null)
    setMsg({ text: '', tone: 'info' })
  }, [product.id])

  async function onChange(next) {
    if (!next) {
      setPending(null)
      return
    }
    if (next.remove && !window.confirm(`ลบรูปของสินค้า ${product.code} ใช่หรือไม่?`)) return
    setPending(next)
    setBusy(true)
    const res = await setProductImage(product.id, next)
    setBusy(false)
    setPending(null)
    setMsg(res.ok ? { text: next.remove ? 'ลบรูปสินค้าแล้ว' : 'บันทึกรูปสินค้าแล้ว ✓', tone: 'ok' } : { text: res.message, tone: 'error' })
  }

  return <ProductImageUpload label={`รูปของ ${product.code}`} imageUrl={product.imageUrl} pending={pending} onChange={onChange} busy={busy} message={msg.text} tone={msg.tone} />
}

function QuickAddProduct({ code, onCreated }) {
  const products = useStore((s) => s.products)
  const addProduct = useStore((s) => s.addProduct)
  const setProductImage = useStore((s) => s.setProductImage)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('EA')
  const [price, setPrice] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', tone: 'info' })
  const trimmed = code.trim()

  if (!trimmed) return null
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>ไม่พบรหัส “{trimmed}” ใน PRODUCT LIST</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)]"
        >
          <PackagePlus size={14} /> เพิ่มเป็นสินค้าใหม่ (พร้อมรูป)
        </button>
      </div>
    )
  }

  async function create() {
    if (!name.trim()) {
      setMsg({ text: 'กรุณากรอกชื่อสินค้า', tone: 'error' })
      return
    }
    if (products.some((p) => p.code === trimmed)) {
      setMsg({ text: 'รหัสสินค้านี้มีอยู่แล้ว', tone: 'error' })
      return
    }
    setBusy(true)
    setMsg({ text: '', tone: 'info' })
    await addProduct({ code: trimmed, name: name.trim(), unit: unit.trim() || 'EA', unitPrice: Number(price) || 0, openingQty: 1 })
    const created = useStore.getState().products.find((p) => p.code === trimmed)
    if (!created) {
      setBusy(false)
      return // addProduct already explained why
    }
    onCreated(created)
    if (pending?.blob) {
      const res = await setProductImage(created.id, pending)
      setBusy(false)
      if (!res.ok) {
        setMsg({ text: `เพิ่มสินค้าแล้ว แต่ยังไม่ได้บันทึกรูป — ${res.message}`, tone: 'error' })
        return
      }
    }
    setBusy(false)
    setOpen(false)
  }

  return (
    <div
      className="quick-add rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3"
      onKeyDown={(e) => {
        // Enter here adds the product — it must not submit the Stock In form around it
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
          e.preventDefault()
          if (!busy) create()
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">เพิ่มสินค้าใหม่: <span className="font-mono text-[var(--text-accent)]">{trimmed}</span></span>
        <button type="button" onClick={() => setOpen(false)} aria-label="ปิดฟอร์มเพิ่มสินค้าใหม่" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover-strong)]">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_9rem]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อสินค้า *" aria-label="ชื่อสินค้าใหม่" className={inputClass()} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="หน่วย" aria-label="หน่วยของสินค้าใหม่" className={inputClass()} />
        <MoneyInput value={price} onChange={setPrice} />
      </div>
      <div className="mt-3">
        <ProductImageUpload label="รูปสินค้า (ไม่บังคับ)" pending={pending} onChange={setPending} busy={busy && !!pending?.blob} />
      </div>
      {msg.text && (
        <p className={`mt-2 text-xs ${msg.tone === 'error' ? 'text-red-500' : 'text-[var(--text-secondary)]'}`} role={msg.tone === 'error' ? 'alert' : undefined}>
          {msg.text}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={15} />} เพิ่มสินค้าใหม่
        </button>
      </div>
    </div>
  )
}

export default function StockInProductPanel({ code, productId, onCreated }) {
  const product = useStore((s) => (productId ? s.products.find((p) => p.id === productId) : null))
  return (
    <FxBoundary name="stock-in-image" fallback={null}>
      {product ? (
        <div className="flex items-start gap-3">
          <ProductThumbnail product={product} size="md" />
          <div className="min-w-0 flex-1">
            <ExistingProductImage product={product} />
          </div>
        </div>
      ) : (
        <QuickAddProduct code={code} onCreated={onCreated} />
      )}
    </FxBoundary>
  )
}
