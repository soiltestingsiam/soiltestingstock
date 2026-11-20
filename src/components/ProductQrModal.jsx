import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer } from 'lucide-react'
import Modal from './Modal'

// Shows a product's QR code (the QR holds the product code, so scanning it with
// "สแกนคิวอาร์" finds the product) with download and print buttons.
export default function ProductQrModal({ product, onClose }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!product) return
    let cancelled = false
    QRCode.toDataURL(product.code, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => !cancelled && setDataUrl(''))
    return () => {
      cancelled = true
    }
  }, [product])

  if (!product) return null

  function handleDownload() {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `QR-${product.code.replace(/[\\/:*?"<>|\s]+/g, '_')}.png`
    a.click()
  }

  function handlePrint() {
    const w = window.open('', '_blank', 'width=420,height=560')
    if (!w) return
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
    w.document.write(`<!doctype html><html><head><title>QR ${esc(product.code)}</title>
      <style>body{font-family:sans-serif;text-align:center;margin:24px}img{width:240px;height:240px}
      .code{font:700 18px monospace;margin-top:8px}.name{font-size:13px;margin-top:4px}</style></head>
      <body><img src="${dataUrl}" onload="window.print()" /><div class="code">${esc(product.code)}</div>
      <div class="name">${esc(product.name)}</div></body></html>`)
    w.document.close()
  }

  return (
    <Modal open onClose={onClose} title="QR Code สินค้า">
      <div className="flex flex-col items-center gap-3">
        {/* holographic tag card (screen only — download / print use the plain QR image) */}
        <div className="qr-holo">
          <span className="qr-holo-foil" aria-hidden="true" />
          <div className="qr-holo-head" aria-hidden="true">
            <span>STS · ASSET TAG</span>
            <span>SOIL TESTING SIAM</span>
          </div>
          <div className="relative rounded-xl bg-white p-3">
            {dataUrl ? (
              <img src={dataUrl} alt={`QR ${product.code}`} className="h-56 w-56" />
            ) : (
              <div className="h-56 w-56" />
            )}
          </div>
          <div className="relative mt-2 text-center font-mono text-lg font-bold text-[var(--text-accent)]">{product.code}</div>
        </div>
        <div className="text-center text-sm text-[var(--text-secondary)]">{product.name}</div>
        <div className="mt-2 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
          >
            <Download size={16} /> ดาวน์โหลด
          </button>
          <button
            onClick={handlePrint}
            disabled={!dataUrl}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] disabled:opacity-50"
          >
            <Printer size={16} /> พิมพ์
          </button>
        </div>
      </div>
    </Modal>
  )
}
