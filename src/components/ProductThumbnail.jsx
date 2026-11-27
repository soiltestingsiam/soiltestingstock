import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Package, X } from 'lucide-react'

// A product's photo at a fixed square size (so every table row stays the same height),
// with a clean box placeholder when there is none. Click it to see the big photo with the
// product's code and name (lightbox). Screen only: hidden when printing and dropped from
// PDF captures (data-pdf-hide), so documents stay exactly as before.
//   size: xs 24 · sm 36 · md 44 · lg 64 (px)

const SIZES = { xs: 24, sm: 36, md: 44, lg: 64 }

export function ImageLightbox({ product, onClose }) {
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  if (!product?.imageUrl) return null
  return createPortal(
    <div
      className="product-lightbox anim-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`รูปสินค้า ${product.code}`}
      onClick={onClose}
    >
      <figure className="anim-modal relative max-h-full w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="ปิดรูป"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
        >
          <X size={18} />
        </button>
        <div className="flex max-h-[70vh] items-center justify-center bg-white">
          <img src={product.imageUrl} alt={`${product.code} ${product.name || ''}`} className="max-h-[70vh] w-auto max-w-full object-contain" />
        </div>
        <figcaption className="px-4 py-3">
          <div className="font-mono text-sm font-bold text-[var(--text-accent)]">{product.code}</div>
          {product.name && <div className="mt-0.5 text-sm text-[var(--text-primary)]">{product.name}</div>}
        </figcaption>
      </figure>
    </div>,
    document.body,
  )
}

// block: render as a block box (no text line around it) — used in report tables so a photo
// cell can never make a row taller than its text cells
export default function ProductThumbnail({ product, size = 'sm', zoom = true, block = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)
  const px = SIZES[size] || SIZES.sm
  const url = product?.imageUrl && !broken ? product.imageUrl : null
  // a new photo (or a different product) gets a fresh chance to load
  useEffect(() => setBroken(false), [product?.imageUrl])
  const box = `product-thumb ${block ? 'flex' : 'inline-flex align-middle'} flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] ${className}`
  const style = { width: px, height: px }

  if (!url) {
    return (
      <span className={`${box} text-[var(--text-faint)]`} style={style} data-pdf-hide aria-hidden="true">
        <Package size={Math.round(px * 0.5)} strokeWidth={1.6} />
      </span>
    )
  }
  const img = <img src={url} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-full w-full object-cover" />
  if (!zoom) {
    return (
      <span className={box} style={style} data-pdf-hide aria-hidden="true">
        {img}
      </span>
    )
  }
  return (
    <>
      <button
        type="button"
        className={`${box} transition hover:ring-2 hover:ring-[var(--text-accent)] focus-visible:ring-2 focus-visible:ring-[var(--text-accent)]`}
        style={style}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`ดูรูปสินค้า ${product.code}${product.name ? ` ${product.name}` : ''}`}
        title="ดูรูปใหญ่"
        data-pdf-hide
      >
        {img}
      </button>
      {open && <ImageLightbox product={product} onClose={() => setOpen(false)} />}
    </>
  )
}
