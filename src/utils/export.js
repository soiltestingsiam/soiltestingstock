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

export async function exportElementToPdf(element, filename, { orientation = 'landscape' } = {}) {
  if (!element) return
  // Wide report tables scroll sideways on screen; un-clip them in the capture so the PDF
  // gets every column instead of just the visible part.
  const fullWidth = Math.max(element.scrollWidth, ...[...element.querySelectorAll('table')].map((t) => t.scrollWidth + 48))
  // Match the current theme's background, otherwise the light theme's black text would be
  // captured on the dark theme's background (black on black). The dark theme keeps the
  // exact background it always had.
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim()
  const backgroundColor = isLight ? themeBg || '#ffffff' : '#0B0F19'
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: 2,
    width: fullWidth,
    windowWidth: fullWidth + 400,
    onclone: (doc, clone) => {
      clone.style.width = `${fullWidth}px`
      clone.querySelectorAll('.overflow-x-auto, .overflow-auto').forEach((el) => {
        el.style.overflow = 'visible'
      })
    },
  })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const imgWidth = pageWidth - 40
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 20

  pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight)
  heightLeft -= pageHeight - 40

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 20
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - 40
  }

  pdf.save(filename)
}
