import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Product photos (migration 009): checked, shrunk and compressed IN THE BROWSER before they
// are uploaded, so Storage stays small and the Stock / Reports pages load fast.
//   compressProductImage(file)  → { blob, type, width, height, size }   (throws ImageError)
//   uploadProductImage(file, productIdOrCode) → { image_url, image_path } | { error }
//   deleteProductImage(image_path) → never throws
// Every message is plain Thai, ready to show the user. Nothing here touches stock data.

export const IMAGE_BUCKET = 'product-images'
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024 // the original photo
export const MAX_SIDE = 800 // px, longest side after resizing
export const QUALITY = 0.8

export class ImageError extends Error {}

function loadImage(file) {
  // createImageBitmap honours the photo's EXIF rotation; <img> is the fallback
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadWithImg(file))
  }
  return loadWithImg(file)
}
function loadWithImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageError('เปิดไฟล์รูปนี้ไม่ได้ — ไฟล์อาจเสียหาย ลองเลือกรูปอื่น'))
    }
    img.src = url
  })
}
const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))

// check → resize (longest side ≤ 800 px) → WebP (JPEG if the browser can't make WebP)
export async function compressProductImage(file) {
  if (!file) throw new ImageError('ไม่พบไฟล์รูป')
  if (!ACCEPTED_TYPES.includes(file.type)) throw new ImageError('รองรับเฉพาะรูป JPG, PNG หรือ WEBP เท่านั้น')
  if (file.size > MAX_SOURCE_BYTES) throw new ImageError('ไฟล์รูปใหญ่เกิน 10 MB — ลองถ่ายใหม่หรือเลือกรูปที่เล็กลง')
  const src = await loadImage(file)
  const w0 = src.width || src.naturalWidth
  const h0 = src.height || src.naturalHeight
  if (!w0 || !h0) throw new ImageError('อ่านขนาดรูปไม่ได้ ลองเลือกรูปอื่น')
  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0))
  const width = Math.max(1, Math.round(w0 * scale))
  const height = Math.max(1, Math.round(h0 * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, width, height)
  let blob = await toBlob(canvas, 'image/webp', QUALITY)
  if (!blob || blob.type !== 'image/webp') {
    // JPEG has no transparency: put the photo on white first
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    blob = await toBlob(canvas, 'image/jpeg', QUALITY)
  }
  if (typeof src.close === 'function') src.close()
  if (!blob) throw new ImageError('ย่อรูปไม่สำเร็จ ลองเลือกรูปอื่น')
  return { blob, type: blob.type, width, height, size: blob.size, compressed: true }
}

// Storage error → a sentence the user can act on
export function storageErrorMessage(error) {
  const msg = String(error?.message || error || '')
  const code = String(error?.statusCode || error?.status || '')
  if (/bucket not found/i.test(msg) || code === '404')
    return 'ยังไม่ได้สร้างที่เก็บรูป “product-images” ใน Supabase — ผู้ดูแลต้องรันไฟล์ supabase/migrations/009_product_images.sql ก่อน'
  if (/row-level security|unauthorized|not allowed|permission/i.test(msg) || code === '403' || code === '401')
    return 'บัญชีนี้ยังไม่มีสิทธิ์อัปโหลดรูป (ต้องเป็นผู้ใช้ที่อนุมัติแล้ว และผู้ดูแลต้องรันไฟล์ 009)'
  if (/payload too large|exceeded the maximum|too large/i.test(msg) || code === '413') return 'ไฟล์รูปใหญ่เกินที่ที่เก็บรูปรับได้ (2 MB)'
  if (/mime|invalid.*type/i.test(msg)) return 'ที่เก็บรูปไม่รับไฟล์ชนิดนี้ — ใช้ JPG, PNG หรือ WEBP'
  if (/failed to fetch|network/i.test(msg)) return 'อัปโหลดไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'
  return `อัปโหลดรูปไม่สำเร็จ: ${msg || 'ไม่ทราบสาเหตุ'}`
}

const safeSegment = (v) =>
  String(v ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60) || 'product'

// upload one photo (a File is compressed first; an already-compressed result is used as is)
export async function uploadProductImage(file, productIdOrCode) {
  if (!isSupabaseConfigured) return { error: 'ยังไม่ได้เชื่อมต่อฐานข้อมูล จึงอัปโหลดรูปไม่ได้' }
  let blob = file?.blob || file
  try {
    if (!file?.compressed) blob = (await compressProductImage(file)).blob
  } catch (e) {
    return { error: e instanceof ImageError ? e.message : 'ย่อรูปไม่สำเร็จ ลองเลือกรูปอื่น' }
  }
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
  const path = `products/${safeSegment(productIdOrCode)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  try {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
    if (error) return { error: storageErrorMessage(error) }
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) return { error: 'อัปโหลดแล้วแต่สร้างลิงก์รูปไม่ได้' }
    return { image_url: data.publicUrl, image_path: path }
  } catch (e) {
    return { error: storageErrorMessage(e) }
  }
}

// remove an old photo — best effort, never in the way of the real work
export async function deleteProductImage(image_path) {
  if (!image_path || !isSupabaseConfigured) return false
  try {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([image_path])
    return !error
  } catch {
    return false
  }
}
