import { formatMoney, formatNumber } from './format'

// Display helpers for public.audit_log rows (see supabase/migrations/003_audit_log.sql).

export const CATEGORY_LABELS = {
  product: 'สินค้า (PRODUCT LIST)',
  stock_in: 'รับเข้า',
  stock_out: 'จ่ายออก',
  import: 'นำเข้าไฟล์',
  user: 'บัญชีผู้ใช้',
}

export const ACTION_LABELS = { INSERT: 'เพิ่ม', UPDATE: 'แก้ไข', DELETE: 'ลบ' }

const FIELD_LABELS = {
  code: 'รหัสสินค้า',
  name: 'ชื่อสินค้า',
  unit: 'หน่วย',
  unit_price: 'ราคา/หน่วย',
  opening_qty: 'จำนวน (PRODUCT LIST)',
  image_url: 'รูปภาพสินค้า',
  product_code: 'รหัสสินค้า',
  product_name: 'ชื่อสินค้า',
  direction: 'ประเภท',
  is_opening_balance: 'ยอดยกมา',
  qty: 'จำนวน',
  total: 'ราคารวม',
  movement_date: 'วันที่',
  reference_year: 'ปีอ้างอิง',
  source: 'ที่มา',
  supplier: 'ผู้ผลิต / ผู้ขาย',
  po: 'PO',
  so_lot: 'SO / LOT',
  customer: 'ลูกค้า / หน่วยงาน',
  invoice: 'INVOICE',
  so: 'SO',
  note: 'หมายเหตุ',
  created_by: 'ผู้บันทึก',
  username: 'ชื่อผู้ใช้งาน',
  role: 'สิทธิ์',
  status: 'สถานะ',
  year: 'ปี',
  file_name: 'ไฟล์',
  row_count: 'จำนวนแถว',
  new_product_count: 'สินค้าใหม่',
}

// technical columns never shown in the detail view
const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'product_id', 'import_batch_id', 'approved_by', 'approved_at', 'imported_at', 'image_path'])

const STATUS_LABELS = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' }

function isoDateToThai(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : String(v)
}

export function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '-'
  switch (field) {
    case 'unit_price':
    case 'total':
      return formatMoney(value)
    case 'qty':
    case 'opening_qty':
    case 'row_count':
    case 'new_product_count':
      return formatNumber(value, Number.isInteger(Number(value)) ? 0 : 2)
    case 'movement_date':
      return isoDateToThai(value)
    case 'is_opening_balance':
      return value ? 'ใช่' : 'ไม่ใช่'
    case 'direction':
      return value === 'out' ? 'จ่ายออก' : 'รับเข้า'
    case 'source':
      return value === 'import' ? 'นำเข้าจากไฟล์' : 'บันทึกเอง'
    case 'status':
      return STATUS_LABELS[value] ?? value
    case 'image_url':
      return 'มีรูป' // the long storage link isn't useful to read here
    case 'year':
    case 'reference_year':
      return String(value)
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

export function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field
}

// Who made the change. Sign-ups are written by Supabase Auth itself (no signed-in user).
export function actorLabel(entry) {
  if (entry.actor_username) return entry.actor_username
  if (entry.table_name === 'profiles' && entry.action === 'INSERT') return `${entry.record_label ?? '-'} (สมัครสมาชิก)`
  return 'ระบบ / SQL Editor'
}

function movementLine(d) {
  if (!d) return ''
  const parts = [
    `${d.is_opening_balance ? 'ยอดยกมา' : d.direction === 'out' ? 'จ่ายออก' : 'รับเข้า'} ${formatFieldValue('qty', d.qty)} @ ${formatMoney(d.unit_price)} = ${formatMoney(d.total)}`,
    `วันที่ ${isoDateToThai(d.movement_date)}`,
  ]
  const doc = d.direction === 'out' ? d.invoice || d.so : d.po
  if (doc) parts.push(doc)
  const party = d.direction === 'out' ? d.customer : d.supplier
  if (party) parts.push(party)
  if (d.source === 'import') parts.push('(นำเข้าจากไฟล์)')
  return parts.join(' · ')
}

// Visible changed fields of an UPDATE, as [{ field, label, before, after }].
export function changedFieldRows(entry) {
  return (entry.changed_fields ?? [])
    .filter((f) => !HIDDEN_FIELDS.has(f))
    .map((f) => ({
      field: f,
      label: fieldLabel(f),
      before: formatFieldValue(f, entry.old_data?.[f]),
      after: formatFieldValue(f, entry.new_data?.[f]),
    }))
}

// All visible fields for the expanded detail view: [{ field, label, before, after, changed }].
export function detailRows(entry) {
  const keys = Object.keys(entry.new_data ?? entry.old_data ?? {}).filter((k) => !HIDDEN_FIELDS.has(k))
  const changed = new Set(entry.changed_fields ?? [])
  return keys.map((k) => ({
    field: k,
    label: fieldLabel(k),
    before: entry.old_data ? formatFieldValue(k, entry.old_data[k]) : null,
    after: entry.new_data ? formatFieldValue(k, entry.new_data[k]) : null,
    changed: changed.has(k),
  }))
}

// One-line Thai description of what happened.
export function describeEntry(entry) {
  const d = entry.new_data ?? entry.old_data ?? {}
  if (entry.action === 'UPDATE') {
    if (entry.table_name === 'profiles') {
      const parts = []
      if (entry.changed_fields?.includes('status')) parts.push(`สถานะ: ${formatFieldValue('status', entry.old_data?.status)} → ${formatFieldValue('status', entry.new_data?.status)}`)
      if (entry.changed_fields?.includes('role')) parts.push(`สิทธิ์: ${entry.old_data?.role} → ${entry.new_data?.role}`)
      if (parts.length) return parts.join(' · ')
    }
    const rows = changedFieldRows(entry)
    const prefix = entry.table_name === 'stock_movements' ? `${isoDateToThai(d.movement_date)} · ` : ''
    return prefix + (rows.length ? rows.map((r) => `${r.label}: ${r.before} → ${r.after}`).join(' · ') : 'แก้ไขข้อมูลระบบ')
  }
  switch (entry.table_name) {
    case 'stock_movements':
      return movementLine(d)
    case 'products':
      return [d.name, d.unit && `หน่วย ${d.unit}`, `ราคา/หน่วย ${formatMoney(d.unit_price)}`].filter(Boolean).join(' · ')
    case 'import_batches':
      return [
        `ไฟล์ ${d.file_name ?? '-'}`,
        `${d.direction === 'out' ? 'จ่ายออก' : 'รับเข้า'} ปี ${d.year ?? '-'}`,
        `${formatNumber(d.row_count)} แถว`,
        d.new_product_count ? `สินค้าใหม่ ${formatNumber(d.new_product_count)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'profiles':
      return entry.action === 'INSERT' ? 'สมัครสมาชิก (รออนุมัติ)' : `ลบบัญชี ${d.username ?? ''}`
    default:
      return ''
  }
}
