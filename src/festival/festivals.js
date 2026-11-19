// Festival theme registry + date-based auto resolution.
// Dates are Gregorian windows that cover the usual period of each festival; the lunar
// ones (Loy Krathong / Yi Peng) shift a little year to year, so the window is generous.

export const FESTIVALS = {
  none: { id: 'none', label: 'ปกติ (ไม่มีเทศกาล)', emoji: '✨', desc: 'ธีมพื้นฐาน' },
  loykrathong: { id: 'loykrathong', label: 'ลอยกระทง · ยี่เป็ง', emoji: '🪷', desc: 'โคมลอย กระทง พระจันทร์เต็มดวง' },
  halloween: { id: 'halloween', label: 'ฮาโลวีน', emoji: '🎃', desc: 'ค้างคาว ฟักทอง ใยแมงมุม' },
  christmas: { id: 'christmas', label: 'คริสต์มาส', emoji: '🎄', desc: 'หิมะตก ไฟประดับ' },
  newyear: { id: 'newyear', label: 'เคาต์ดาวน์ปีใหม่', emoji: '🎆', desc: 'พลุไฟ ประกายทอง' },
  songkran: { id: 'songkran', label: 'สงกรานต์', emoji: '💦', desc: 'สายน้ำ ดอกไม้' },
}

// the order shown in the admin picker (plus 'auto' prepended by the UI)
export const PICKER_IDS = ['none', 'loykrathong', 'halloween', 'christmas', 'newyear', 'songkran']

// which festival a given date falls into
export function festivalForDate(date = new Date()) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (m === 10 && d >= 18) return 'halloween'
  if (m === 11 && d >= 8 && d <= 28) return 'loykrathong'
  if (m === 12 && d >= 30) return 'newyear'
  if (m === 1 && d <= 2) return 'newyear'
  if (m === 12 && d >= 15) return 'christmas'
  if (m === 4 && d >= 11 && d <= 17) return 'songkran'
  return 'none'
}

// mode is 'auto' | festival id. Returns the festival id to actually show.
export function resolveFestival(mode, date = new Date()) {
  if (!mode || mode === 'auto') return festivalForDate(date)
  return FESTIVALS[mode] ? mode : 'none'
}
