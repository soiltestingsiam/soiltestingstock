import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { ImageUp } from 'lucide-react'
import Modal from './Modal'

function decodeFromCanvas(canvas, source, width, height) {
  if (!width || !height) return null
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null
}

// Opens the camera and reads a QR code. Calls onResult(text) once, then closes.
// Falls back to reading a photo when the camera isn't available (no permission,
// not HTTPS, or no camera on the device).
export default function QrScannerModal({ open, onClose, onResult }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  // latest callbacks without restarting the camera whenever the parent re-renders
  const callbacks = useRef({ onClose, onResult })
  callbacks.current = { onClose, onResult }

  useEffect(() => {
    if (!open) return
    setError('')
    let stream = null
    let frame = 0
    let stopped = false

    function done(text) {
      stopped = true
      callbacks.current.onResult(text.trim())
      callbacks.current.onClose()
    }

    function tick() {
      if (stopped) return
      const video = videoRef.current
      if (video && video.readyState >= 2) {
        const text = decodeFromCanvas(canvasRef.current, video, video.videoWidth, video.videoHeight)
        if (text) return done(text)
      }
      frame = requestAnimationFrame(tick)
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('เบราว์เซอร์นี้เปิดกล้องไม่ได้ — ใช้ปุ่ม "เลือกรูปภาพ QR" แทน')
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((s) => {
          if (stopped) {
            s.getTracks().forEach((t) => t.stop())
            return
          }
          stream = s
          const video = videoRef.current
          video.srcObject = s
          video.setAttribute('playsinline', 'true')
          video.play().catch(() => {})
          frame = requestAnimationFrame(tick)
        })
        .catch(() => setError('เปิดกล้องไม่ได้ (ไม่ได้อนุญาตให้ใช้กล้อง หรือไม่มีกล้อง) — ใช้ปุ่ม "เลือกรูปภาพ QR" แทน'))
    }

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open])

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // large phone photos decode faster and just as reliably when scaled down
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
      const text = decodeFromCanvas(canvasRef.current, img, Math.round(img.width * scale), Math.round(img.height * scale))
      URL.revokeObjectURL(url)
      if (text) {
        onResult(text.trim())
        onClose()
      } else {
        setError('ไม่พบ QR Code ในรูปนี้ ลองถ่ายใหม่ให้ QR อยู่กลางภาพและชัดขึ้น')
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setError('เปิดไฟล์รูปนี้ไม่ได้')
    }
    img.src = url
  }

  return (
    <Modal open={open} onClose={onClose} title="สแกนคิวอาร์">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted className="h-full w-full object-cover" />
        <div className="qr-scan-frame pointer-events-none absolute inset-[18%] rounded-lg border-2 border-violet-400/80" aria-hidden="true">
          <span className="qr-scan-corner tl" />
          <span className="qr-scan-corner tr" />
          <span className="qr-scan-corner bl" />
          <span className="qr-scan-corner br" />
          <span className="qr-scan-laser" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p className="mt-3 text-center text-sm text-[var(--text-muted)]">ส่อง QR Code ของสินค้าให้อยู่ในกรอบ</p>
      {error && <p className="mt-2 text-center text-sm text-amber-300">{error}</p>}
      <div className="mt-4 flex justify-center">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)]"
        >
          <ImageUp size={16} /> เลือกรูปภาพ QR
        </button>
      </div>
    </Modal>
  )
}
