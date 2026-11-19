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
}

// the order shown in the admin picker (plus 'auto' prepended by the UI)
export const PICKER_IDS = ['none', 'loykrathong', 'halloween', 'christmas', 'newyear', 'chinesenewyear', 'valentine', 'songkran']

// which festival a given date falls into
export function festivalForDate(date = new Date()) {
  const m = date.getMonth() + 1
  const d = date.getDate()
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
export function resolveFestival(mode, date = new Date()) {
  if (!mode || mode === 'auto') return festivalForDate(date)
  return FESTIVALS[mode] ? mode : 'none'
}
