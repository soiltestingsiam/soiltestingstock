// Pet data + pure helpers (no React): coats per species with gacha rarity, festival
// outfits, level-unlocked accessories, the level curve and the daily-streak XP.
// Each user's coat is "rolled" deterministically from their username, so it is random
// across users but always the same for the same user (on every device).

export const SPECIES = {
  cat: { label: 'แมว', emoji: '🐱' },
  dog: { label: 'หมา', emoji: '🐶' },
}

export const RARITY = {
  common: { label: 'ธรรมดา', color: '#94a3b8' },
  rare: { label: 'หายาก', color: '#38bdf8' },
  epic: { label: 'หายากมาก', color: '#c084fc' },
  legend: { label: 'ตำนาน', color: '#fbbf24' },
  mythic: { label: 'พิเศษเฉพาะหน้าล็อกอิน', color: '#f472b6' },
}

// The login page's own cat — an exclusive coat that is NOT in the gacha pool, so nobody
// can ever roll it. Always the same, whoever is typing.
export const LOGIN_CAT = {
  id: 'sts-jewel',
  name: 'มณีสยาม',
  rarity: 'mythic',
  base: '#fdfbff',
  shade: '#d4cdf0',
  belly: '#ffffff',
  pattern: 'jewel',
  pc: '#f2b93b',
  eye: '#3b78f0',
  irisRing: '#f6c453',
}

// base / shade / belly(muzzle, chest) / pattern + pattern colours / iris colour(s)
export const CAT_COATS = [
  { id: 'orange-tabby', name: 'ส้มลายสลิด', rarity: 'common', w: 16, base: '#f5a54a', shade: '#de8630', belly: '#fff4e4', pattern: 'tabby', pc: '#cf6f1c', eye: '#86c64a' },
  { id: 'gray-tabby', name: 'เทาลายสลิด', rarity: 'common', w: 14, base: '#a7adb8', shade: '#8a919d', belly: '#f3f4f7', pattern: 'tabby', pc: '#6d7480', eye: '#e8c443' },
  { id: 'black', name: 'ดำขลับ', rarity: 'common', w: 12, base: '#33333f', shade: '#24242e', belly: '#444452', pattern: 'none', eye: '#f2c94c' },
  { id: 'white', name: 'ขาวปุยนุ่น', rarity: 'common', w: 12, base: '#fdfaf5', shade: '#e6dfd4', belly: '#ffffff', pattern: 'none', eye: '#5fb6ea' },
  { id: 'cream', name: 'ครีมนม', rarity: 'common', w: 10, base: '#f7dcab', shade: '#e6c287', belly: '#fff8ea', pattern: 'tabby-soft', pc: '#deb06a', eye: '#d0913a' },
  { id: 'calico', name: 'สามสี', rarity: 'rare', w: 9, base: '#fdf9f2', shade: '#e8dfd2', belly: '#ffffff', pattern: 'calico', pc: '#f19a3c', pc2: '#34343f', eye: '#86c64a' },
  { id: 'tuxedo', name: 'ทักซิโด้', rarity: 'rare', w: 8, base: '#33333f', shade: '#24242e', belly: '#ffffff', pattern: 'tuxedo', eye: '#86c64a' },
  { id: 'siamese', name: 'วิเชียรมาศ', rarity: 'rare', w: 8, base: '#f4e7d1', shade: '#e0ccad', belly: '#fbf3e6', pattern: 'points', pc: '#5c4435', eye: '#4fa8e3' },
  { id: 'korat', name: 'สีสวาด (โคราช)', rarity: 'epic', w: 5, base: '#8f9bad', shade: '#74819a', belly: '#a9b4c4', pattern: 'silver', eye: '#8fd34d' },
  { id: 'khaomanee', name: 'ขาวมณี ตาสองสี', rarity: 'legend', w: 3, base: '#ffffff', shade: '#e9e4dc', belly: '#ffffff', pattern: 'none', eye: '#4fa8e3', eye2: '#ebb73a' },
]

export const DOG_COATS = [
  { id: 'golden', name: 'โกลเด้น', rarity: 'common', w: 16, base: '#ebb566', shade: '#d39a48', belly: '#fcebcc', pattern: 'none', ear: 'floppy', earC: '#d6994a', eye: '#5a3a22' },
  { id: 'shiba', name: 'ชิบะส้ม', rarity: 'common', w: 14, base: '#e29446', shade: '#c97a2f', belly: '#fff4e2', pattern: 'shiba', ear: 'pointy', eye: '#3a2618' },
  { id: 'white', name: 'ขาวปุย', rarity: 'common', w: 12, base: '#fdfaf6', shade: '#e6dfd5', belly: '#ffffff', pattern: 'none', ear: 'floppy', earC: '#efe7dc', eye: '#3a2618' },
  { id: 'black-tan', name: 'ดำแทน', rarity: 'common', w: 12, base: '#302b2b', shade: '#211d1d', belly: '#cf9150', pattern: 'tan', ear: 'floppy', earC: '#262121', eye: '#6b4426' },
  { id: 'choco', name: 'ช็อกโกแลต', rarity: 'common', w: 10, base: '#7d4b2f', shade: '#653b23', belly: '#a9724c', pattern: 'none', ear: 'floppy', earC: '#5e3720', eye: '#e3a34a' },
  { id: 'beagle', name: 'บีเกิ้ล', rarity: 'rare', w: 9, base: '#fdf8ef', shade: '#e8dfd1', belly: '#ffffff', pattern: 'beagle', pc: '#c9823d', pc2: '#3b2d25', ear: 'floppy', earC: '#b8732f', eye: '#4a2e1c' },
  { id: 'dalmatian', name: 'ดัลเมเชียน', rarity: 'rare', w: 8, base: '#ffffff', shade: '#e9e5df', belly: '#ffffff', pattern: 'spots', pc: '#2b2b2b', ear: 'floppy', earC: '#2b2b2b', eye: '#4a2e1c' },
  { id: 'husky', name: 'ฮัสกี้', rarity: 'rare', w: 8, base: '#717c8b', shade: '#5b6574', belly: '#ffffff', pattern: 'husky', ear: 'pointy', eye: '#6ec6f2' },
  { id: 'ridgeback', name: 'หลังอานไทย', rarity: 'epic', w: 5, base: '#7f8a9b', shade: '#687388', belly: '#97a2b2', pattern: 'ridge', pc: '#5d687a', ear: 'pointy', eye: '#d9a54a' },
  { id: 'bangkaew', name: 'บางแก้ว', rarity: 'legend', w: 3, base: '#ffffff', shade: '#ebe6df', belly: '#ffffff', pattern: 'bangkaew', pc: '#3a3330', ear: 'pointy', eye: '#5a3a22' },
]

// FNV-1a — stable 32-bit hash of a string
export function hashString(s) {
  let h = 2166136261
  for (const ch of s) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// The "gacha roll": a weighted pick seeded by the username.
export function pickCoat(species, seed) {
  const list = species === 'dog' ? DOG_COATS : CAT_COATS
  const key = (seed || '').trim().toLowerCase()
  if (!key) return list[0]
  const total = list.reduce((s, c) => s + c.w, 0)
  let r = hashString(`${species}:${key}`) % total
  for (const c of list) {
    if (r < c.w) return c
    r -= c.w
  }
  return list[0]
}

// Outfit worn automatically for the active festival (by slot). Anything the user
// equips in a slot replaces the festival piece for that slot.
export const FESTIVAL_OUTFIT = {
  none: {},
  christmas: { head: 'santa', neck: 'xmas-scarf' },
  valentine: { head: 'heart-band', neck: 'pink-bowtie' },
  chinesenewyear: { head: 'mandarin', neck: 'lucky-knot' },
  songkran: { head: 'flower-ear', neck: 'garland' },
  halloween: { head: 'witch', neck: 'pumpkin' },
  loykrathong: { head: 'flower-crown', neck: 'gold-necklace' },
  newyear: { head: 'party', neck: 'gold-bowtie' },
}

export const SLOTS = { head: 'หัว', face: 'ใบหน้า', neck: 'คอ', back: 'หลัง', aura: 'รัศมี' }

// Unlocked by level — the "dress up your pet" rewards.
export const ACCESSORIES = [
  { id: 'bell', name: 'ปลอกคอกระดิ่ง', emoji: '🔔', slot: 'neck', level: 2 },
  { id: 'bow', name: 'โบว์ติดหู', emoji: '🎀', slot: 'head', level: 3 },
  { id: 'glasses', name: 'แว่นกลม', emoji: '👓', slot: 'face', level: 4 },
  { id: 'scarf', name: 'ผ้าพันคอไหมพรม', emoji: '🧣', slot: 'neck', level: 5 },
  { id: 'crown', name: 'มงกุฎ', emoji: '👑', slot: 'head', level: 6 },
  { id: 'shades', name: 'แว่นกันแดด', emoji: '🕶️', slot: 'face', level: 7 },
  { id: 'tophat', name: 'หมวกทรงสูง', emoji: '🎩', slot: 'head', level: 8 },
  { id: 'wings', name: 'ปีกนางฟ้า', emoji: '🪽', slot: 'back', level: 9 },
  { id: 'goldaura', name: 'รัศมีทอง', emoji: '✨', slot: 'aura', level: 10 },
  { id: 'diamond', name: 'ปลอกคอเพชร', emoji: '💎', slot: 'neck', level: 12 },
  { id: 'rainbow', name: 'รัศมีรุ้ง', emoji: '🌈', slot: 'aura', level: 15 },
]

export function resolveOutfit(festival, equipped = {}) {
  const out = { ...(FESTIVAL_OUTFIT[festival] || {}) }
  for (const [slot, id] of Object.entries(equipped || {})) if (id) out[slot] = id
  return out
}

// Level curve: each level needs a little more XP than the last.
export function levelInfo(xp = 0) {
  let level = 1
  let floor = 0
  let need = 40
  while (xp >= floor + need) {
    floor += need
    level += 1
    need = 40 + (level - 1) * 25
  }
  return { level, floor, next: floor + need, into: xp - floor, need, pct: Math.max(0, Math.min(1, (xp - floor) / need)) }
}

// Bigger with every level, capped so it never gets in the way.
export const sizeForLevel = (level) => Math.min(1 + (level - 1) * 0.05, 1.45)

// เติมไฟ: the first visit of each day. A longer streak gives more XP (capped).
export const dailyXp = (streak) => 20 + Math.min(streak, 10) * 3

export const XP = { stockIn: 5, stockOut: 5, product: 3 }

// a — b colour mix (t = 0 → a, t = 1 → b)
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`
}
