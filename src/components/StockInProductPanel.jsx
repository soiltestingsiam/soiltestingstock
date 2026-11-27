import { useState } from 'react'
import { PackagePlus, Loader2, X } from 'lucide-react'
import ProductImageUpload from './ProductImageUpload'
import { ImageLightbox } from './ProductThumbnail'
import MoneyInput from './MoneyInput'
import { inputClass } from './FormField'
import { useStore } from '../store/useStore'
import FxBoundary from './FxBoundary'

// "รูปสินค้า" on the Stock In form — always there, like the other fields.
//  - Pick / take a photo at any time (even before the code is typed). It is kept with the
//    form and saved for the product in ข้อ 2 when Save is pressed (StockIn applies it with
//    useStore.setProductImage after the receipt — a photo problem never blocks the receipt).
//  - The product already has a photo: it is shown, and can be replaced or removed the same way.
//  - The code isn't in PRODUCT LIST yet: "เพิ่มเป็นสินค้าใหม่" adds it (name · unit · price)
//    with the usual addProduct and fills it into the form; the photo goes with Save.
//   pending: null · { blob, previewUrl, … } · { remove: true }   (see ProductImageUpload)

function QuickAddProduct({ code, onCreated }) {
  const products = useStore((s) => s.products)
  const addProduct = useStore((s) => s.addProduct)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('EA')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const trimmed = code.trim()

  if (!trimmed) return null
  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>ไม่พบรหัส “{trimmed}” ใน PRODUCT LIST</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-3 py-1.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)]"
        >
          <PackagePlus size={14} /> เพิ่มเป็นสินค้าใหม่
        </button>
      </div>
    )
  }

  async function create() {
    if (!name.trim()) {
      setMsg('กรุณากรอกชื่อสินค้า')
      return
    }
    if (products.some((p) => p.code === trimmed)) {
      setMsg('รหัสสินค้านี้มีอยู่แล้ว')
      return
    }
    setBusy(true)
    setMsg('')
    await addProduct({ code: trimmed, name: name.trim(), unit: unit.trim() || 'EA', unitPrice: Number(price) || 0, openingQty: 1 })
    setBusy(false)
    const created = useStore.getState().products.find((p) => p.code === trimmed)
    if (!created) return // addProduct already explained why
    onCreated(created)
    setOpen(false)
  }

  return (
    <div
      className="quick-add mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3"
      onKeyDown={(e) => {
        // Enter here adds the product — it must not submit the Stock In form around it
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
          e.preventDefault()
          if (!busy) create()
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          เพิ่มสินค้าใหม่: <span className="font-mono text-[var(--text-accent)]">{trimmed}</span>
        </span>
        <button type="button" onClick={() => setOpen(false)} aria-label="ปิดฟอร์มเพิ่มสินค้าใหม่" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover-strong)]">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_9rem]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อสินค้า *" aria-label="ชื่อสินค้าใหม่" className={inputClass()} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="หน่วย" aria-label="หน่วยของสินค้าใหม่" className={inputClass()} />
        <MoneyInput value={price} onChange={setPrice} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">รูปที่เลือกด้านบนจะถูกบันทึกให้สินค้านี้เมื่อกด Save ของใบรับสินค้า</p>
      {msg && (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {msg}
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

export default function StockInProductPanel({ code, productId, pending, onPendingChange, onCreated }) {
  const product = useStore((s) => (productId ? s.products.find((p) => p.id === productId) : null))
  const hint = product
    ? `รูปจะถูกบันทึกให้ ${product.code} เมื่อกด Save`
    : code.trim()
      ? 'เลือกรูปไว้ได้เลย — จะบันทึกให้สินค้าตามรหัสในข้อ 2 เมื่อกด Save'
      : 'กรอกรหัสสินค้าในข้อ 2 แล้วกด Save — รูปจะถูกบันทึกให้สินค้านั้น (ไม่บังคับ)'
  return (
    <FxBoundary name="stock-in-image" fallback={null}>
      <ProductImageUpload
        label={product ? `รูปของ ${product.code}${product.imageUrl ? '' : ' (ยังไม่มีรูป)'}` : 'แนบรูปสินค้า (ไม่บังคับ)'}
        imageUrl={product?.imageUrl || null}
        pending={pending}
        onChange={onPendingChange}
        message={pending ? '' : hint}
      />
      {!product && <QuickAddProduct code={code} onCreated={onCreated} />}
    </FxBoundary>
  )
}

// the big photo beside the form (wide screens): the picked product's photo, or the one
// chosen on the form; click to see it full size. Falls back to `fallback` (the illustration).
export function StockInPhotoCard({ productId, pending, fallback }) {
  const product = useStore((s) => (productId ? s.products.find((p) => p.id === productId) : null))
  const [zoom, setZoom] = useState(false)
  const src = pending?.remove ? null : pending?.previewUrl || product?.imageUrl || null
  if (!src) return fallback
  const shown = { code: product?.code || 'รูปที่เลือก', name: product?.name || 'ยังไม่ได้บันทึก — จะบันทึกเมื่อกด Save', imageUrl: src }
  return (
    <figure className="stockin-photo w-48 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card-alt)] shadow-card" data-pdf-hide>
      <button type="button" onClick={() => setZoom(true)} className="block aspect-square w-full bg-white" aria-label={`ดูรูปใหญ่ ${shown.code}`}>
        <img src={src} alt="" className="h-full w-full object-cover" />
      </button>
      <figcaption className="px-3 py-2">
        <div className="truncate font-mono text-xs font-bold text-[var(--text-accent)]">{shown.code}</div>
        <div className="line-clamp-2 text-[11px] text-[var(--text-secondary)]">{product?.name || (pending?.blob ? 'รูปใหม่ — จะบันทึกเมื่อกด Save' : '')}</div>
        {pending?.blob && product && <div className="mt-0.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">รูปใหม่ · จะบันทึกเมื่อกด Save</div>}
      </figcaption>
      {zoom && <ImageLightbox product={shown} onClose={() => setZoom(false)} />}
    </figure>
  )
}

