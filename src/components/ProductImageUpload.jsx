import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Camera, Trash2, RotateCcw, Loader2, Package } from 'lucide-react'
import { compressProductImage, ImageError, ACCEPT_ATTR } from '../utils/imageUpload'

// Pick / replace / remove a product photo. It never uploads by itself: it hands the parent
// a "pending" change, and the parent applies it (useStore.setProductImage) when it saves —
//   pending: null (no change) · { blob, previewUrl, width, height, size, compressed } ·
//            { remove: true }
// The photo is checked and shrunk right away (≤ 800 px, WebP/JPEG) so the preview shows
// exactly what will be uploaded. On phones there is a camera button (capture="environment")
// for taking a photo of the real item in the warehouse / field.

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export default function ProductImageUpload({ imageUrl = null, pending = null, onChange, busy = false, message = '', tone = 'info', label = 'รูปภาพสินค้า', disabled = false }) {
  const fileRef = useRef(null)
  const camRef = useRef(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [touch] = useState(isTouch)

  // object URLs are released when the preview changes or the component goes away
  const previewUrl = pending?.previewUrl || null
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  const shown = pending?.remove ? null : previewUrl || imageUrl
  const hasSaved = !!imageUrl
  const locked = disabled || busy || working

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // the same file can be picked again
    if (!file) return
    setError('')
    setWorking(true)
    try {
      const out = await compressProductImage(file)
      onChange?.({ ...out, previewUrl: URL.createObjectURL(out.blob) })
    } catch (err) {
      setError(err instanceof ImageError ? err.message : 'ย่อรูปไม่สำเร็จ ลองเลือกรูปอื่น')
    } finally {
      setWorking(false)
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)] disabled:cursor-not-allowed disabled:opacity-50'
  const status = working ? 'กำลังย่อรูป…' : busy ? 'กำลังอัปโหลดรูป…' : ''
  const note =
    error ||
    message ||
    (pending?.remove ? 'จะลบรูปเมื่อกดบันทึก' : pending?.blob ? `รูปใหม่ ${pending.width}×${pending.height} px · ${Math.max(1, Math.round(pending.size / 1024))} KB — จะอัปโหลดเมื่อกดบันทึก` : '')
  const noteTone = error || tone === 'error' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-secondary)]'

  return (
    <div className="product-image-upload print-hide" data-pdf-hide>
      <div className="mb-1.5 text-sm font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="flex items-start gap-3">
        <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border-color-strong)] bg-[var(--bg-surface-soft)]">
          {shown ? (
            <img src={shown} alt="ตัวอย่างรูปสินค้า" className="h-full w-full object-cover" />
          ) : (
            <Package size={34} strokeWidth={1.4} className="text-[var(--text-faint)]" aria-hidden="true" />
          )}
          {(working || busy) && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white" role="status" aria-label={status}>
              <Loader2 size={22} className="animate-spin" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={locked} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={14} /> {shown ? 'เปลี่ยนรูป' : 'เลือกรูป'}
            </button>
            {touch && (
              <button type="button" className={btn} disabled={locked} onClick={() => camRef.current?.click()}>
                <Camera size={14} /> ถ่ายรูป
              </button>
            )}
            {(hasSaved || pending?.blob) && !pending?.remove && (
              <button
                type="button"
                className={`${btn} text-red-500`}
                disabled={locked}
                onClick={() => {
                  setError('')
                  onChange?.(hasSaved ? { remove: true } : null)
                }}
              >
                <Trash2 size={14} /> ลบรูป
              </button>
            )}
            {pending && (
              <button
                type="button"
                className={btn}
                disabled={locked}
                onClick={() => {
                  setError('')
                  onChange?.(null)
                }}
              >
                <RotateCcw size={14} /> ยกเลิกการเปลี่ยน
              </button>
            )}
          </div>
          <p className={`mt-1.5 text-[11px] leading-snug ${note ? noteTone : 'text-[var(--text-muted)]'}`} aria-live="polite">
            {status || note || 'JPG / PNG / WEBP ไม่เกิน 10 MB — ระบบย่อให้อัตโนมัติ (ไม่เกิน 800 px)'}
          </p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={onFile} aria-label="เลือกรูปสินค้า" />
      <input ref={camRef} type="file" accept={ACCEPT_ATTR} capture="environment" className="hidden" onChange={onFile} aria-label="ถ่ายรูปสินค้า" />
    </div>
  )
}
