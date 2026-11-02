import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// aoa: array-of-arrays (rows of cell values)
export function exportAoaToExcel(aoa, filename, sheetName = 'Sheet1') {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename)
}

const PDF_MARGIN = 20 // pt

// Renders one element to a canvas and reports where it may be split between pages:
// the bottom edge of every table row / block (in canvas pixels). Elements marked
// data-pdf-hide (e.g. the report's selection checkboxes) are dropped from the capture.
async function captureElement(element) {
  // Wide report tables scroll sideways on screen; un-clip them in the capture so the PDF
  // gets every column instead of just the visible part.
  const fullWidth = Math.max(element.scrollWidth, ...[...element.querySelectorAll('table')].map((t) => t.scrollWidth + 48))
  // Match the current theme's background, otherwise the light theme's black text would be
  // captured on the dark theme's background (black on black). The dark theme keeps the
  // exact background it always had.
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim()
  const backgroundColor = isLight ? themeBg || '#ffffff' : '#0B0F19'
  const scale = 2
  let breaks = []
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale,
    width: fullWidth,
    windowWidth: fullWidth + 400,
    onclone: (doc, clone) => {
      clone.style.width = `${fullWidth}px`
      clone.querySelectorAll('.overflow-x-auto, .overflow-auto').forEach((el) => {
        el.style.overflow = 'visible'
      })
      clone.querySelectorAll('[data-pdf-hide]').forEach((el) => el.remove())
      // measured on the clone (after the changes above) so the positions match the image
      const top = clone.getBoundingClientRect().top
      breaks = [...clone.querySelectorAll('tr, [data-pdf-chunk] > *, :scope > *')]
        .map((el) => Math.round((el.getBoundingClientRect().bottom - top) * scale))
        .filter((y) => y > 0)
        .sort((a, b) => a - b)
    },
  })
  return { canvas, breaks, backgroundColor }
}

// Cuts the canvas into page-sized slices that end on a row boundary: no row is cut in
// half and nothing is repeated on the next page (the old version drew the whole image
// on every page with an offset, which overlapped by the margin and sliced through rows).
function sliceAtBreaks(height, pageHeightPx, breaks) {
  const slices = []
  let start = 0
  while (start < height) {
    const limit = start + pageHeightPx
    let end = height
    if (limit < height) {
      const fit = breaks.filter((b) => b > start && b <= limit)
      // a single row taller than a page (never in practice) falls back to a hard cut
      end = fit.length ? fit[fit.length - 1] : limit
    }
    slices.push([start, end])
    start = end
  }
  return slices
}

export async function exportElementToPdf(element, filename, options) {
  if (!element) return
  return exportElementsToPdf([element], filename, options)
}

// Several elements -> one PDF; each element starts on a new page and long ones flow over
// as many pages as they need, broken between rows. Pages are JPEG to keep files small.
export async function exportElementsToPdf(elements, filename, { orientation = 'landscape' } = {}) {
  const list = elements.filter(Boolean)
  if (!list.length) return
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth - PDF_MARGIN * 2
  const usableHeight = pageHeight - PDF_MARGIN * 2
  let firstPage = true

  for (const element of list) {
    const { canvas, breaks, backgroundColor } = await captureElement(element)
    const ptPerPx = imgWidth / canvas.width
    const slices = sliceAtBreaks(canvas.height, Math.floor(usableHeight / ptPerPx), breaks)

    for (const [start, end] of slices) {
      const part = document.createElement('canvas')
      part.width = canvas.width
      part.height = end - start
      const ctx = part.getContext('2d')
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, part.width, part.height)
      ctx.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, canvas.width, end - start)

      if (!firstPage) pdf.addPage()
      firstPage = false
      pdf.addImage(part.toDataURL('image/jpeg', 0.9), 'JPEG', PDF_MARGIN, PDF_MARGIN, imgWidth, (end - start) * ptPerPx, undefined, 'FAST')
    }
  }

  pdf.save(filename)
}
