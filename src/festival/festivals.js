// Festival theme registry + date-based auto resolution.
// Dates are Gregorian windows that cover the usual period of each festival; the lunar
// ones (Loy Krathong / Yi Peng) shift a little year to year, so the window is generous.

export const FESTIVALS = {
  none: { id: 'none', label: 'ปกติ (ไม่มีเทศกาล)', emoji: '✨', desc: 'ธีมพื้นฐาน', greeting: 'ยินดีต้อนรับเข้าสู่ระบบ' },
  loykrathong: { id: 'loykrathong', label: 'ลอยกระทง · ยี่เป็ง', emoji: '🪷', desc: 'โคมลอย กระทง พระจันทร์เต็มดวง', greeting: 'สุขสันต์วันลอยกระทง 🪷' },
  halloween: { id: 'halloween', label: 'ฮาโลวีน', emoji: '🎃', desc: 'ค้างคาว ฟักทอง ใยแมงมุม', greeting: 'แฮปปี้ฮาโลวีน 🎃' },
  christmas: { id: 'christmas', label: 'คริสต์มาส', emoji: '🎄', desc: 'หิมะตก ไฟประดับ', greeting: 'สุขสันต์วันคริสต์มาส 🎄' },
  newyear: { id: 'newyear', label: 'เคาต์ดาวน์ปีใหม่', emoji: '🎆', desc: 'พลุไฟ ประกายทอง', greeting: 'สวัสดีปีใหม่ 🎆' },
  chinesenewyear: { id: 'chinesenewyear', label: 'ตรุษจีน', emoji: '🏮', desc: 'โคมแดง ทองอร่าม', greeting: 'สุขสันต์วันตรุษจีน · ซินเจียยู่อี่ ซินนี้ฮวดไช้ 🏮' },
  valentine: { id: 'valentine', label: 'วาเลนไทน์', emoji: '💖', desc: 'หัวใจลอย กลีบกุหลาบ', greeting: 'สุขสันต์วันวาเลนไทน์ 💖' },
  songkran: { id: 'songkran', label: 'สงกรานต์', emoji: '💦', desc: 'สายน้ำ ดอกไม้', greeting: 'สุขสันต์วันสงกรานต์ 💦' },
  mothersday: { id: 'mothersday', label: 'วันแม่แห่งชาติ', emoji: '🌼', desc: 'ดอกมะลิ โทนฟ้าอ่อน', greeting: 'สุขสันต์วันแม่ 🌼 กลับบ้านไปกอดแม่ด้วยนะ' },
  fathersday: { id: 'fathersday', label: 'วันพ่อแห่งชาติ', emoji: '💛', desc: 'ดอกพุทธรักษา โทนเหลือง', greeting: 'สุขสันต์วันพ่อ 💛 รักพ่อให้มาก ๆ นะ' },
  anniversary: { id: 'anniversary', label: 'ครบรอบบริษัท', emoji: '🎉', desc: 'ลูกโป่ง เค้ก ธงทิว', greeting: 'สุขสันต์วันครบรอบ STS · Soil Testing Siam 🎉' },
}

// the order shown in the admin picker (plus 'auto' prepended by the UI)
export const PICKER_IDS = ['none', 'loykrathong', 'halloween', 'christmas', 'newyear', 'chinesenewyear', 'valentine', 'songkran', 'mothersday', 'fathersday', 'anniversary']

// The company's founding date, set by an admin (stored as 'YYYY-MM-DD', or 'MM-DD' when
// the year isn't known). Returns { year|null, month, day } or null when unset / invalid.
export function parseAnniversary(value) {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(String(value ?? '').trim())
  if (!m) return null
  const year = m[1] ? Number(m[1]) : null
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > new Date(2024, month, 0).getDate()) return null
  if (year != null && (year < 1900 || year > 2200)) return null
  return { year, month, day }
}

// the anniversary falls on `date` ± 1 day (so the theme shows the day before, the day, and
// the day after)
function nearAnniversary(anniv, date) {
  if (!anniv) return false
  const y = date.getFullYear()
  const day0 = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return [y - 1, y, y + 1].some((yy) => {
    const d = new Date(yy, anniv.month - 1, anniv.day)
    return Math.abs(Math.round((d - day0) / 86400000)) <= 1
  })
}

// how many years the company turns this year (null when the founding year isn't set)
export function anniversaryYears(anniv, date = new Date()) {
  if (!anniv?.year) return null
  const n = date.getFullYear() - anniv.year
  return n > 0 ? n : null
}

// the greeting shown in the welcome popup (the anniversary one counts the years)
export function festivalGreeting(id, anniv, date = new Date()) {
  if (id === 'anniversary') {
    const n = anniversaryYears(anniv, date)
    return n ? `ครบรอบ ${n} ปี STS · Soil Testing Siam 🎉 ขอบคุณทุกคนที่ร่วมทางกันมา` : FESTIVALS.anniversary.greeting
  }
  return FESTIVALS[id]?.greeting || ''
}

// which festival a given date falls into (the company anniversary wins on its days)
export function festivalForDate(date = new Date(), anniv = null) {
  if (nearAnniversary(anniv, date)) return 'anniversary'
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (m === 8 && d >= 8 && d <= 13) return 'mothersday' // วันแม่ 12 ส.ค.
  if (m === 12 && d >= 1 && d <= 6) return 'fathersday' // วันพ่อ 5 ธ.ค.
  if (m === 10 && d >= 18) return 'halloween'
  if (m === 11 && d >= 8 && d <= 28) return 'loykrathong'
  if (m === 12 && d >= 30) return 'newyear'
  if (m === 1 && d <= 2) return 'newyear'
  if (m === 12 && d >= 15) return 'christmas'
  // ตรุษจีน shifts a lot year to year (late Jan – mid Feb); generous window, admin can override
  if ((m === 1 && d >= 20) || (m === 2 && d <= 10)) return 'chinesenewyear'
  if (m === 2 && d >= 12 && d <= 15) return 'valentine'
  if (m === 4 && d >= 11 && d <= 17) return 'songkran'
  return 'none'
}

// mode is 'auto' | festival id. Returns the festival id to actually show.
export function resolveFestival(mode, date = new Date(), anniv = null) {
  if (!mode || mode === 'auto') return festivalForDate(date, anniv)
  return FESTIVALS[mode] ? mode : 'none'
}
