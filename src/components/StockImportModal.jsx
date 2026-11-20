import { useMemo, useRef, useState } from 'react'
import { Upload, AlertTriangle, CheckCircle2, History } from 'lucide-react'
import Modal from './Modal'
import { inputClass } from './FormField'
import { useStore } from '../store/useStore'
import { parseStockWorkbook, planStockImport } from '../utils/stockImport'
import { formatNumber, formatMoney } from '../utils/format'

const TITLE = { in: 'นำเข้าไฟล์ยอดยกมา — Stock In', out: 'นำเข้าไฟล์ยอดยกมา — Stock Out' }
const MOVEMENT_LABEL = { opening_balance: 'ยอดยกมา', in: 'ซื้อ/รับเข้า', out: 'จ่ายออก' }
const ORDINARY_LABEL = { in: 'รายการซื้อปกติ', out: 'รายการจ่ายออกปกติ' }

export default function StockImportModal({ open, onClose, type }) {
  const products = useStore((s) => s.products)
  const importBatches = useStore((s) => s.importBatches)
  const applyStockImport = useStore((s) => s.applyStockImport)
  const fileInputRef = useRef(null)

  const [pending, setPending] = useState(null) // { fileName, rows, errors, detectedYear, hasNoteColumn, openingNoteCount }
  const [year, setYear] = useState('')
  const [fallbackType, setFallbackType] = useState('') // '' | 'opening_balance' | 'in' | 'out' — only asked when ambiguous
  const [result, setResult] = useState(null) // { rowCount, newProductCount, errorCount, byType }

  const history = useMemo(
    () => importBatches.filter((b) => b.type === type).sort((a, b) => b.importedAt.localeCompare(a.importedAt)),
    [importBatches, type],
  )

  // Unambiguous only when every row's own หมายเหตุ said ยอดยกมา — anything else (no note
  // column, blank notes, or only some rows tagged) needs the user to say what the rest are.
  const ambiguous = pending ? !pending.hasNoteColumn || pending.openingNoteCount < pending.rows.length : false
  const needsTypeChoice = ambiguous && !fallbackType

  const plan = useMemo(() => {
    if (!pending || !year || needsTypeChoice) return null
    return planStockImport(products, pending.rows, { year: Number(year), fallbackMovementType: fallbackType || 'opening_balance' })
  }, [pending, products, year, fallbackType, needsTypeChoice])

  const alreadyImportedYear = year && history.some((b) => String(b.year) === String(year))

  function reset() {
    setPending(null)
    setYear('')
    setFallbackType('')
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFilePick() {
    fileInputRef.current?.click()
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = parseStockWorkbook(evt.target.result)
        if (parsed.rows.length === 0 && parsed.errors.length === 0) {
          alert('ไม่พบข้อมูลในไฟล์ — ต้องมีหัวคอลัมน์ "รหัส" (หรือ "รหัสสินค้า")')
          return
        }
        setPending({ fileName: file.name, ...parsed })
        setYear(parsed.detectedYear ? String(parsed.detectedYear) : '')
        setFallbackType('')
      } catch {
        alert('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function handleConfirm() {
    if (!plan || !year) return
    if (
      alreadyImportedYear &&
      !confirm(`ปี ${year} เคยนำเข้าไฟล์นี้ไปแล้ว ต้องการนำเข้าซ้ำอีกครั้งหรือไม่? (รายการเดิมจะไม่ถูกลบ จะเพิ่มรายการใหม่เข้าไปอีก)`)
    )
      return
    applyStockImport({
      type,
      year: Number(year),
      fileName: pending.fileName,
      newProducts: plan.newProducts,
      stockRows: plan.stockRows,
    })
    const byType = plan.stockRows.reduce((acc, r) => ({ ...acc, [r.movementType]: (acc[r.movementType] ?? 0) + 1 }), {})
    setResult({ rowCount: plan.stockRows.length, newProductCount: plan.newProducts.length, errorCount: pending.errors.length, byType })
    setPending(null)
  }

  return (
    <Modal open={open} onClose={handleClose} title={TITLE[type]} wide>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      {!pending && !result && (
        <div>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            นำเข้าไฟล์ (Excel/CSV) — ระบบจะอ่านหัวคอลัมน์อัตโนมัติ (รหัส, ชื่อสินค้า, จำนวน, ราคาต่อหน่วย, เป็นเงิน, หมายเหตุ)
            และข้ามแถวสรุปรวมท้ายไฟล์ให้เอง แถวที่หมายเหตุขึ้นต้นด้วย "ยอดยกมา" จะถูกบันทึกเป็นยอดยกมาของปีนั้นโดยอัตโนมัติ
            แยกจากรายการ{type === 'in' ? 'ซื้อ' : 'จ่ายออก'}ปกติ
          </p>
          <button
            onClick={handleFilePick}
            className="import-reactor relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-[var(--border-color-strong)] bg-[var(--bg-surface-soft)] px-4 py-8 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover-strong)]"
          >
            <span className="import-reactor-core" aria-hidden="true" />
            <Upload size={18} className="relative" /> <span className="relative">เลือกไฟล์ .xlsx / .xls / .csv</span>
          </button>

          {history.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                <History size={14} /> ประวัติการนำเข้า
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-color)]">
                {history.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between border-b border-[var(--border-color-soft)] px-3 py-2 text-xs text-[var(--text-secondary)] last:border-b-0"
                  >
                    <span>
                      ปี <span className="font-semibold text-[var(--text-primary)]">{b.year}</span> — {b.fileName}
                    </span>
                    <span className="text-[var(--text-faint)]">
                      {formatNumber(b.rowCount)} รายการ · {new Date(b.importedAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pending && (
        <div>
          <div className="mb-2 text-sm text-[var(--text-secondary)]">
            ไฟล์: <span className="font-semibold text-[var(--text-primary)]">{pending.fileName}</span> — อ่านได้{' '}
            {formatNumber(pending.totalRowsRead)} แถว
          </div>

          {/* Always visible, not just when ambiguous — if this reads "0 จาก N" for a file
              that's actually all ยอดยกมา, that's the moment to notice and pick the dropdown
              option below, instead of only finding out later in Reports. */}
          <div
            className={`mb-4 text-xs ${
              pending.hasNoteColumn && pending.openingNoteCount > 0 ? 'text-[var(--text-faint)]' : 'font-medium text-amber-300'
            }`}
          >
            {pending.hasNoteColumn
              ? `ตรวจพบหมายเหตุ "ยอดยกมา" ใน ${formatNumber(pending.openingNoteCount)} จาก ${formatNumber(pending.rows.length)} แถว`
              : 'ไม่พบคอลัมน์หมายเหตุในไฟล์นี้ — ระบบแยกยอดยกมาจากหมายเหตุไม่ได้ ต้องเลือกประเภทเองด้านล่าง'}
          </div>

          <label className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--text-secondary)]">ปีที่นำเข้า (พ.ศ.)</span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="เช่น 2568"
              className={inputClass('w-32')}
            />
            {alreadyImportedYear && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-300">
                <AlertTriangle size={13} /> ปีนี้เคยนำเข้าไปแล้ว
              </span>
            )}
          </label>

          {ambiguous && (
            <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-sky-200">
                  {pending.openingNoteCount === 0
                    ? 'ไม่พบหมายเหตุ "ยอดยกมา" แถวไหนเลย — ถ้าไฟล์นี้คือยอดยกมาทั้งหมด (แค่ตรวจจับหมายเหตุไม่ได้) ให้เลือก "ยอดยกมา" ด้านล่าง มิฉะนั้นข้อมูลจะถูกนับเป็นรายการซื้อ/ขายจริง'
                    : `พบ "ยอดยกมา" ใน ${formatNumber(pending.openingNoteCount)} แถวเท่านั้น — แถวที่เหลือไม่มีหมายเหตุนี้ คือรายการประเภทใด?`}
                </span>
                <select
                  value={fallbackType}
                  onChange={(e) => setFallbackType(e.target.value)}
                  className={inputClass('w-64')}
                >
                  <option value="">— เลือกประเภท —</option>
                  <option value="opening_balance">ยอดยกมา (Opening Balance)</option>
                  <option value={type}>{ORDINARY_LABEL[type]}</option>
                </select>
              </label>
            </div>
          )}

          {plan && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="จะเพิ่มเป็นสินค้าใหม่" value={plan.newProducts.length} color="text-emerald-300" />
              <Stat label="จะเพิ่มเป็นรายการ Stock" value={plan.stockRows.length} color="text-sky-300" />
              <Stat label="แถวผิดปกติ (ข้าม)" value={pending.errors.length} color="text-red-400" />
            </div>
          )}

          {pending.errors.length > 0 && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              <div className="mb-1 font-semibold">พบแถวข้อมูลผิดปกติ {pending.errors.length} แถว (จะไม่ถูกนำเข้า):</div>
              <div className="max-h-24 overflow-y-auto">
                {pending.errors.map((e, i) => (
                  <div key={i}>
                    แถว {e.excelRow} · <span className="font-mono">{e.code}</span> — {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan && plan.stockRows.length > 0 && (
            <div className="mb-4 max-h-[30vh] overflow-auto rounded-lg border border-[var(--border-color)]">
              <table className="w-full min-w-[640px] text-xs [&_th]:whitespace-nowrap">
                <thead>
                  <tr className="sticky top-0 bg-[var(--bg-card-alt)] text-left text-[var(--text-secondary)]">
                    <th className="px-3 py-2 font-medium">ประเภท</th>
                    <th className="px-3 py-2 font-medium">รหัส</th>
                    <th className="px-3 py-2 font-medium">ชื่อสินค้า</th>
                    <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                    <th className="px-3 py-2 text-right font-medium">ราคาต่อหน่วย</th>
                    <th className="px-3 py-2 text-right font-medium">เป็นเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.stockRows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border-color-soft)] text-[var(--text-primary)]">
                      <td className={`px-3 py-2 font-medium ${r.movementType === 'opening_balance' ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`}>
                        {MOVEMENT_LABEL[r.movementType]}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--text-accent)]">{r.productCode}</td>
                      <td className="max-w-[220px] whitespace-normal break-words px-3 py-2">{r.productName}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(r.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(r.price)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(r.total)}</td>
                    </tr>
                  ))}
                  {plan.stockRows.length > 200 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center text-[var(--text-faint)]">
                        … และอีก {formatNumber(plan.stockRows.length - 200)} รายการ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={reset}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={!year || !plan || plan.stockRows.length === 0}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ยืนยันนำเข้า
            </button>
          </div>
        </div>
      )}

      {result && (
        <div>
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} /> นำเข้าสำเร็จ
          </div>
          <ul className="mb-6 space-y-1 text-sm text-[var(--text-secondary)]">
            <li>เพิ่มรายการ Stock {type === 'in' ? 'In' : 'Out'} สำเร็จ: {formatNumber(result.rowCount)} รายการ</li>
            {Object.entries(result.byType).map(([mt, count]) => (
              <li key={mt} className="pl-4 text-xs text-[var(--text-muted)]">
                — {MOVEMENT_LABEL[mt]}: {formatNumber(count)} รายการ
              </li>
            ))}
            <li>สร้างสินค้าใหม่ใน Product List: {formatNumber(result.newProductCount)} รายการ</li>
            <li>ข้ามแถวผิดปกติ: {formatNumber(result.errorCount)} รายการ</li>
          </ul>
          <div className="flex justify-end gap-3">
            <button
              onClick={reset}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              นำเข้าไฟล์อื่นต่อ
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-soft)] p-3">
      <div className={`text-xs font-medium ${color}`}>{label}</div>
      <div className="text-xl font-bold text-[var(--text-primary)]">{formatNumber(value)}</div>
    </div>
  )
}
