import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { thaiCompare } from '../utils/format'
import { ceToISO, isoToCE, todayDDMMYYYY } from '../utils/date'
import { useAuthStore } from './useAuthStore'

function currentUsername() {
  try {
    return useAuthStore.getState().profile?.username ?? null
  } catch {
    return null
  }
}

// ---------- row <-> app-shape mappers ----------
function rowToProduct(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    unitPrice: Number(row.unit_price),
    openingQty: Number(row.opening_qty),
  }
}

function rowToMovement(row) {
  const base = {
    id: row.id,
    date: isoToCE(row.movement_date) ?? todayDDMMYYYY(),
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    qty: Number(row.qty),
    price: Number(row.unit_price),
    total: Number(row.total),
    note: row.note ?? '',
    movementType: row.is_opening_balance ? 'opening_balance' : row.direction,
    year: row.reference_year ?? undefined,
    source: row.source,
    importBatchId: row.import_batch_id,
  }
  return row.direction === 'in'
    ? { ...base, supplier: row.supplier ?? '', po: row.po ?? '', soLot: row.so_lot ?? '', customer: row.customer ?? '' }
    : { ...base, customer: row.customer ?? '', invoice: row.invoice ?? '', so: row.so ?? '' }
}

function rowToBatch(row) {
  return {
    id: row.id,
    type: row.direction,
    year: row.year,
    fileName: row.file_name,
    rowCount: row.row_count,
    newProductCount: row.new_product_count,
    importedAt: row.imported_at,
  }
}

// entry: a Stock In/Out form payload or a planStockImport stockRow (same shape either way)
function movementToRow(direction, entry) {
  return {
    product_id: entry.productId || null,
    product_code: entry.productCode,
    product_name: entry.productName,
    direction,
    is_opening_balance: entry.movementType === 'opening_balance',
    qty: entry.qty,
    unit_price: entry.price,
    total: entry.total,
    movement_date: ceToISO(entry.date) ?? ceToISO(todayDDMMYYYY()),
    reference_year: entry.year ?? null,
    source: entry.source ?? 'manual',
    import_batch_id: entry.importBatchId ?? null,
    supplier: entry.supplier || null,
    po: entry.po || null,
    so_lot: entry.soLot || null,
    customer: entry.customer || null,
    invoice: entry.invoice || null,
    so: entry.so || null,
    note: entry.note || null,
    created_by: currentUsername(),
  }
}

function sortProducts(products) {
  return [...products].sort((a, b) => thaiCompare(a.code, b.code))
}

// bumped by reset(): an init() still in flight from a previous session drops its result
let loadGeneration = 0

const NOT_CONFIGURED_MSG = 'ยังไม่ได้ตั้งค่า Supabase — ตรวจสอบไฟล์ .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'

export const useStore = create((set, get) => ({
  products: [],
  stockIns: [],
  stockOuts: [],
  importBatches: [],
  loading: true,
  error: null,
  _subscribed: false,
  _channel: null,

  // Loads everything from Supabase once the user is signed in AND approved (RLS returns
  // nothing before that), then keeps a realtime subscription open so a change made on
  // another device/tab shows up here too. Called from App.jsx; reset() on sign-out.
  init: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false, error: NOT_CONFIGURED_MSG })
      return
    }
    const gen = loadGeneration
    try {
      const [{ data: products, error: e1 }, { data: movements, error: e2 }, { data: batches, error: e3 }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('stock_movements').select('*'),
        supabase.from('import_batches').select('*'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (gen !== loadGeneration) return
      set({
        products: sortProducts((products ?? []).map(rowToProduct)),
        stockIns: (movements ?? []).filter((r) => r.direction === 'in').map(rowToMovement),
        stockOuts: (movements ?? []).filter((r) => r.direction === 'out').map(rowToMovement),
        importBatches: (batches ?? []).map(rowToBatch),
        loading: false,
        error: null,
      })
      get().subscribeRealtime()
    } catch (err) {
      if (gen !== loadGeneration) return
      set({ loading: false, error: err.message })
    }
  },

  // Drops the loaded data and the realtime channel (sign-out / account no longer approved),
  // so the next init() starts clean for whoever signs in next.
  reset: () => {
    loadGeneration += 1
    const channel = get()._channel
    if (channel && isSupabaseConfigured) supabase.removeChannel(channel)
    set({ products: [], stockIns: [], stockOuts: [], importBatches: [], loading: true, error: null, _subscribed: false, _channel: null })
  },

  subscribeRealtime: () => {
    if (!isSupabaseConfigured || get()._subscribed) return
    const channel = supabase
      .channel('sts-stock-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => get().refetchProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => get().refetchMovements())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_batches' }, () => get().refetchBatches())
      .subscribe()
    set({ _subscribed: true, _channel: channel })
  },

  refetchProducts: async () => {
    const { data, error } = await supabase.from('products').select('*')
    if (error) return
    set({ products: sortProducts((data ?? []).map(rowToProduct)) })
  },
  refetchMovements: async () => {
    const { data, error } = await supabase.from('stock_movements').select('*')
    if (error) return
    set({
      stockIns: (data ?? []).filter((r) => r.direction === 'in').map(rowToMovement),
      stockOuts: (data ?? []).filter((r) => r.direction === 'out').map(rowToMovement),
    })
  },
  refetchBatches: async () => {
    const { data, error } = await supabase.from('import_batches').select('*')
    if (error) return
    set({ importBatches: (data ?? []).map(rowToBatch) })
  },

  // Wipes products and every Stock In / Stock Out row (login accounts are untouched).
  clearAllData: async () => {
    const ALL = '00000000-0000-0000-0000-000000000000'
    await supabase.from('stock_movements').delete().neq('id', ALL)
    await supabase.from('import_batches').delete().neq('id', ALL)
    await supabase.from('products').delete().neq('id', ALL)
    await Promise.all([get().refetchProducts(), get().refetchMovements(), get().refetchBatches()])
  },

  // ---------- Products ----------
  // รหัสสินค้า is UNIQUE at the database level (see supabase/schema.sql) — the root fix
  // for duplicate product codes. Every product also has a permanent id; Stock In/Out
  // rows link to that id, so renaming or reusing a code never confuses which product a
  // historical movement belongs to.
  addProduct: async (product) => {
    const { error } = await supabase.from('products').insert({
      code: product.code,
      name: product.name,
      unit: product.unit,
      unit_price: product.unitPrice,
      opening_qty: product.openingQty,
    })
    if (error) {
      alert(error.code === '23505' ? 'รหัสสินค้านี้มีอยู่แล้ว' : `เพิ่มสินค้าไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchProducts()
  },

  updateProduct: async (id, updates) => {
    const patch = { updated_at: new Date().toISOString() }
    if (updates.code !== undefined) patch.code = updates.code
    if (updates.name !== undefined) patch.name = updates.name
    if (updates.unit !== undefined) patch.unit = updates.unit
    if (updates.unitPrice !== undefined) patch.unit_price = updates.unitPrice
    if (updates.openingQty !== undefined) patch.opening_qty = updates.openingQty

    const { error } = await supabase.from('products').update(patch).eq('id', id)
    if (error) {
      alert(error.code === '23505' ? 'รหัสสินค้านี้มีอยู่แล้ว' : `บันทึกไม่สำเร็จ: ${error.message}`)
      return
    }
    if (updates.name !== undefined || updates.code !== undefined) {
      const sync = {}
      if (updates.name !== undefined) sync.product_name = updates.name
      if (updates.code !== undefined) sync.product_code = updates.code
      await supabase.from('stock_movements').update(sync).eq('product_id', id)
    }
    await Promise.all([get().refetchProducts(), get().refetchMovements()])
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      alert(`ลบไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchProducts()
  },

  // Folds every record in `mergeIds` into `keepId`: their Stock In/Out history is
  // repointed to the kept product, then the duplicate product records are removed.
  mergeProducts: async (keepId, mergeIds) => {
    const keep = get().products.find((p) => p.id === keepId)
    if (!keep) return
    const { error: moveErr } = await supabase
      .from('stock_movements')
      .update({ product_id: keepId, product_code: keep.code, product_name: keep.name })
      .in('product_id', mergeIds)
    if (moveErr) {
      alert(`รวมรายการไม่สำเร็จ: ${moveErr.message}`)
      return
    }
    const { error: delErr } = await supabase.from('products').delete().in('id', mergeIds)
    if (delErr) {
      alert(`ลบสินค้าซ้ำไม่สำเร็จ: ${delErr.message}`)
      return
    }
    await Promise.all([get().refetchProducts(), get().refetchMovements()])
  },

  // Applies a plan from planProductImport: adds new codes, overwrites changed ones with
  // the file's data, optionally removes codes missing from the file, and keeps the
  // product name copied onto existing Stock In / Stock Out rows in sync.
  applyProductImport: async (plan) => {
    const byCode = new Map(get().products.map((p) => [p.code, p]))

    if (plan.updated.length) {
      const rows = plan.updated.map((u) => {
        const merged = { ...u.before, ...u.updates }
        return {
          id: byCode.get(u.code)?.id,
          code: u.code,
          name: merged.name,
          unit: merged.unit,
          unit_price: merged.unitPrice,
          opening_qty: merged.openingQty,
        }
      })
      const { error } = await supabase.from('products').upsert(rows)
      if (error) {
        alert(`อัปเดตสินค้าไม่สำเร็จ: ${error.message}`)
        return
      }
      for (const u of plan.updated) {
        if (u.updates.name === undefined) continue
        const id = byCode.get(u.code)?.id
        if (id) await supabase.from('stock_movements').update({ product_name: u.updates.name }).eq('product_id', id)
      }
    }

    if (plan.added.length) {
      const { error } = await supabase.from('products').insert(
        plan.added.map((p) => ({ code: p.code, name: p.name, unit: p.unit || 'EA', unit_price: p.unitPrice || 0, opening_qty: p.openingQty || 0 })),
      )
      if (error) {
        alert(`เพิ่มสินค้าใหม่ไม่สำเร็จ: ${error.message}`)
        return
      }
    }

    if (plan.removed.length) {
      const ids = plan.removed.map((p) => byCode.get(p.code)?.id).filter(Boolean)
      if (ids.length) await supabase.from('products').delete().in('id', ids)
    }

    await Promise.all([get().refetchProducts(), get().refetchMovements()])
  },

  getProduct: (id) => get().products.find((p) => p.id === id),

  // ---------- Stock In ----------
  addStockIn: async (entry) => {
    const { error } = await supabase.from('stock_movements').insert(movementToRow('in', entry))
    if (error) {
      alert(`บันทึกรับสินค้าไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  updateStockIn: async (id, updates) => {
    const { error } = await supabase.from('stock_movements').update(movementToRow('in', updates)).eq('id', id)
    if (error) {
      alert(`บันทึกการแก้ไขไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  deleteStockIn: async (id) => {
    const { error } = await supabase.from('stock_movements').delete().eq('id', id)
    if (error) {
      alert(`ลบไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  // ---------- Stock Out ----------
  addStockOut: async (entry) => {
    const { error } = await supabase.from('stock_movements').insert(movementToRow('out', entry))
    if (error) {
      alert(`บันทึกสินค้าออกไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  updateStockOut: async (id, updates) => {
    const { error } = await supabase.from('stock_movements').update(movementToRow('out', updates)).eq('id', id)
    if (error) {
      alert(`บันทึกการแก้ไขไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  deleteStockOut: async (id) => {
    const { error } = await supabase.from('stock_movements').delete().eq('id', id)
    if (error) {
      alert(`ลบไม่สำเร็จ: ${error.message}`)
      return
    }
    await get().refetchMovements()
  },

  // ---------- Stock import (ยอดยกมา / ซื้อ / ออก, by year) ----------
  // Products in `newProducts` (already carrying a client-generated uuid, see
  // planStockImport) are created if their code doesn't already exist; existing products
  // are never modified. `stockRows` are always appended as new Stock In/Out rows —
  // importing a year never overwrites or removes anything from a previously-imported year.
  applyStockImport: async ({ type, year, fileName, newProducts, stockRows }) => {
    const existingCodes = new Set(get().products.map((p) => p.code))
    const toInsert = newProducts.filter((p) => !existingCodes.has(p.code))
    if (toInsert.length) {
      const { error } = await supabase.from('products').insert(
        toInsert.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, unit_price: p.unitPrice, opening_qty: p.openingQty })),
      )
      if (error) {
        alert(`สร้างสินค้าใหม่ไม่สำเร็จ: ${error.message}`)
        return
      }
    }

    const { data: batch, error: batchErr } = await supabase
      .from('import_batches')
      .insert({ direction: type, year, file_name: fileName, row_count: stockRows.length, new_product_count: toInsert.length })
      .select()
      .single()
    if (batchErr) {
      alert(`บันทึกประวัติการนำเข้าไม่สำเร็จ: ${batchErr.message}`)
      return
    }

    const rows = stockRows.map((r) => ({ ...movementToRow(type, r), import_batch_id: batch.id, source: 'import' }))
    const { error: rowsErr } = await supabase.from('stock_movements').insert(rows)
    if (rowsErr) {
      alert(`นำเข้ารายการไม่สำเร็จ: ${rowsErr.message}`)
      return
    }

    await Promise.all([get().refetchProducts(), get().refetchMovements(), get().refetchBatches()])
  },

  hasImportedYear: (type, year) => get().importBatches.some((b) => b.type === type && b.year === year),
}))

export default useStore
