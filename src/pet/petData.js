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
  mothersday: { head: 'jasmine', neck: 'maalai' },
  fathersday: { head: 'canna', neck: 'yellow-scarf' },
  anniversary: { head: 'party', neck: 'gold-bowtie' },
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

// The user's personal theme dresses the pet too (on top of the festival outfit):
//   geotech_classic → "วิศวกรฝึกหัดประจำคลัง": a hi-vis field vest, plus the safety
//              helmet whenever the festival doesn't bring its own hat ·
//   japanese → a yukata, plus a tōrō lantern at ลอยกระทง, an uchiwa fan at สงกรานต์,
//              an omamori charm at New Year · cyber → AR visor + neon aura ·
//   minimal → a fine gold chain. Anything the user equips still wins its slot.
const SKIN_OUTFIT = {
  geotech_classic: (f) => ({ body: 'hivis', ...(FESTIVAL_OUTFIT[f]?.head ? {} : { head: 'hardhat' }) }),
  japanese: (f) => ({ body: 'yukata', ...({ loykrathong: { prop: 'toro' }, songkran: { prop: 'uchiwa' }, newyear: { prop: 'omamori' } }[f] || {}) }),
  cyber: () => ({ face: 'ar-visor', aura: 'neon' }),
  minimal: () => ({ neck: 'gold-chain' }),
}

// What the pet wears: the festival outfit, then the theme's outfit, then the user's own
// choices. `chosen` is the 4-slot wardrobe ({ headgear, outfit, prop, aura }; null = auto)
// — a picked item replaces everything auto in its slot — or, from old saves, sprite slots
// ({ head, face, neck, back, aura }) that simply override their own slot.
const WARDROBE_CLEARS = { headgear: ['head', 'face'], outfit: ['body', 'neck', 'back'], prop: ['prop'], aura: ['aura'] }
export function resolveOutfit(festival, chosen = {}, skin = 'geotech_classic') {
  const key = skin === 'classic' ? 'geotech_classic' : skin
  const out = { ...(FESTIVAL_OUTFIT[festival] || {}), ...(SKIN_OUTFIT[key]?.(festival) || {}) }
  for (const [slot, id] of Object.entries(chosen || {})) {
    if (!id) continue
    if (WARDROBE_CLEARS[slot]) {
      // a wardrobe slot (aura is both a wardrobe slot and a sprite slot — same thing)
      const item = WARDROBE_BY_ID[id]
      if (!item) {
        if (slot === 'aura') out.aura = id
        continue
      }
      for (const s of WARDROBE_CLEARS[slot]) delete out[s]
      out[item.sprite] = id
    } else {
      out[slot] = id // legacy sprite slot
    }
  }
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

// The glow under the pet grows with its level: 0 none · 1 Lv.5+ soft ring · 2 Lv.10+
// pulsing ring with sparks · 3 Lv.15+ a halo that orbits.
export const auraTier = (level) => (level >= 15 ? 3 : level >= 10 ? 2 : level >= 5 ? 1 : 0)

// Bigger with every level, capped so it never gets in the way.
export const sizeForLevel = (level) => Math.min(1 + (level - 1) * 0.05, 1.45)

// เติมไฟ: the first visit of each day. A longer streak gives more XP (capped).
export const dailyXp = (streak) => 20 + Math.min(streak, 10) * 3

export const XP = { stockIn: 5, stockOut: 5, product: 3 }

// XP from work (saving receipts / issues / products) is capped per day, so the level
// reflects showing up every day (เติมไฟ) rather than how many rows someone types. The
// daily check-in XP is separate and not capped.
export const WORK_XP_DAILY_CAP = 30

// The pet's own name (chosen by its owner). Shown in the panel, bubbles and screen-reader
// label; React renders it as plain text.
export const NAME_MAX = 16
export function cleanPetName(raw) {
  return Array.from(
    String(raw ?? '')
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, NAME_MAX)
    .join('')
    .trim()
}

// After hours the pet curls up and dozes (it wakes when you click it).
export const SLEEP_FROM_HOUR = 19 // 19:00
export const SLEEP_UNTIL_HOUR = 6 // 06:00
export const isSleepyHour = (d = new Date()) => d.getHours() >= SLEEP_FROM_HOUR || d.getHours() < SLEEP_UNTIL_HOUR

// a — b colour mix (t = 0 → a, t = 1 → b)
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`
}

/* ======================================================================
   Wardrobe — 4 slots, mix & match: Headgear · Outfit · Hand Prop · Aura/Trail
   Each slot is either "auto" (null — dressed by the user's theme + the festival, see
   resolveOutfit) or one item the user picked. An item is unlocked by level, bought with
   fashion coins (🪙 from Supply Drops), earned at a festival (claim a Supply Drop while it
   is on — and it can be worn freely during that festival), earned by a quest, or free.
   ====================================================================== */
export const WARDROBE_SLOTS = {
  headgear: { label: 'หมวก / ศีรษะ', en: 'Headgear', emoji: '⛑️' },
  outfit: { label: 'ชุด', en: 'Outfit', emoji: '🦺' },
  prop: { label: 'ของในมือ', en: 'Hand Prop', emoji: '📋' },
  aura: { label: 'รัศมี', en: 'Aura / Trail', emoji: '✨' },
}
export const WARDROBE_SLOT_IDS = Object.keys(WARDROBE_SLOTS)

// sprite: which PetSprite slot draws it (head · face · neck · back · body · prop · aura)
export const WARDROBE = [
  // headgear
  { id: 'hardhat', slot: 'headgear', sprite: 'head', name: 'หมวกเซฟตี้ STS', emoji: '⛑️', unlock: { free: true } },
  { id: 'bow', slot: 'headgear', sprite: 'head', name: 'โบว์ติดหู', emoji: '🎀', unlock: { level: 3 } },
  { id: 'glasses', slot: 'headgear', sprite: 'face', name: 'แว่นกลม', emoji: '👓', unlock: { level: 4 } },
  { id: 'crown', slot: 'headgear', sprite: 'head', name: 'มงกุฎ', emoji: '👑', unlock: { level: 6 } },
  { id: 'shades', slot: 'headgear', sprite: 'face', name: 'แว่นกันแดด', emoji: '🕶️', unlock: { level: 7 } },
  { id: 'tophat', slot: 'headgear', sprite: 'head', name: 'หมวกทรงสูง', emoji: '🎩', unlock: { level: 8 } },
  { id: 'ar-visor', slot: 'headgear', sprite: 'face', name: 'แว่น AR ไซเบอร์', emoji: '🥽', unlock: { coins: 40 } },
  { id: 'flower-crown', slot: 'headgear', sprite: 'head', name: 'มงกุฎดอกไม้ลอยกระทง', emoji: '🌸', unlock: { festival: 'loykrathong' } },
  { id: 'santa', slot: 'headgear', sprite: 'head', name: 'หมวกซานต้า', emoji: '🎅', unlock: { festival: 'christmas' } },
  { id: 'witch', slot: 'headgear', sprite: 'head', name: 'หมวกแม่มด', emoji: '🧙', unlock: { festival: 'halloween' } },
  { id: 'party', slot: 'headgear', sprite: 'head', name: 'หมวกปาร์ตี้ปีใหม่', emoji: '🥳', unlock: { festival: 'newyear' } },
  { id: 'mandarin', slot: 'headgear', sprite: 'head', name: 'หมวกจีน', emoji: '🧧', unlock: { festival: 'chinesenewyear' } },
  { id: 'flower-ear', slot: 'headgear', sprite: 'head', name: 'ดอกไม้ทัดหู', emoji: '🌺', unlock: { festival: 'songkran' } },
  // outfit
  { id: 'hivis', slot: 'outfit', sprite: 'body', name: 'เสื้อกั๊กวิศวกรภาคสนาม', emoji: '🦺', unlock: { free: true } },
  { id: 'bell', slot: 'outfit', sprite: 'neck', name: 'ปลอกคอกระดิ่ง', emoji: '🔔', unlock: { level: 2 } },
  { id: 'scarf', slot: 'outfit', sprite: 'neck', name: 'ผ้าพันคอไหมพรม', emoji: '🧣', unlock: { level: 5 } },
  { id: 'wings', slot: 'outfit', sprite: 'back', name: 'ปีกนางฟ้า', emoji: '🪽', unlock: { level: 9 } },
  { id: 'diamond', slot: 'outfit', sprite: 'neck', name: 'ปลอกคอเพชร', emoji: '💎', unlock: { level: 12 } },
  { id: 'yukata', slot: 'outfit', sprite: 'body', name: 'ชุดยูกาตะ', emoji: '👘', unlock: { coins: 30 } },
  { id: 'gold-chain', slot: 'outfit', sprite: 'neck', name: 'สร้อยทองเส้นเล็ก', emoji: '📿', unlock: { coins: 25 } },
  { id: 'neon-collar', slot: 'outfit', sprite: 'neck', name: 'ปลอกคอนีออน', emoji: '💠', unlock: { coins: 25 } },
  { id: 'xmas-scarf', slot: 'outfit', sprite: 'neck', name: 'ผ้าพันคอคริสต์มาส', emoji: '🧣', unlock: { festival: 'christmas' } },
  { id: 'garland', slot: 'outfit', sprite: 'neck', name: 'พวงมาลัยสงกรานต์', emoji: '💐', unlock: { festival: 'songkran' } },
  // hand prop
  { id: 'soil-core', slot: 'prop', sprite: 'prop', name: 'แท่งตัวอย่างดิน', emoji: '🧪', unlock: { level: 3 } },
  { id: 'clipboard', slot: 'prop', sprite: 'prop', name: 'คลิปบอร์ดเช็กลิสต์', emoji: '📋', unlock: { quest: 'quest-clear' } },
  { id: 'toro', slot: 'prop', sprite: 'prop', name: 'โคมโทโร (灯籠)', emoji: '🏮', unlock: { festival: 'loykrathong' } },
  { id: 'uchiwa', slot: 'prop', sprite: 'prop', name: 'พัดอุจิวะ', emoji: '🪭', unlock: { festival: 'songkran' } },
  { id: 'omamori', slot: 'prop', sprite: 'prop', name: 'เครื่องรางโอมาโมริ', emoji: '🧧', unlock: { festival: 'newyear' } },
  // aura / trail
  { id: 'strata', slot: 'aura', sprite: 'aura', name: 'วงแหวนชั้นดิน', emoji: '🟤', unlock: { level: 5 } },
  { id: 'goldaura', slot: 'aura', sprite: 'aura', name: 'รัศมีทอง', emoji: '✨', unlock: { level: 10 } },
  { id: 'neon', slot: 'aura', sprite: 'aura', name: 'วงแหวนนีออน', emoji: '🌀', unlock: { coins: 40 } },
  { id: 'rainbow', slot: 'aura', sprite: 'aura', name: 'รัศมีรุ้ง', emoji: '🌈', unlock: { level: 15 } },
]
export const WARDROBE_BY_ID = Object.fromEntries(WARDROBE.map((w) => [w.id, w]))

// Supply Drop rewards (the server caps claims at 6 a day, 8+ minutes apart — see 008)
export const SUPPLY_XP = 3
export const SUPPLY_COINS = 5
export const SUPPLY_DAILY_CAP = 6
export const SUPPLY_EVERY_MIN = 10 // minutes of REAL active time per drop
export const SUPPLY_AFK_SEC = 60 // no mouse / keyboard for this long → the clock stops

// can this pet wear the item right now?  { ok, reason }
export function wardrobeStatus(item, { level = 1, owned = [], festival = 'none' } = {}) {
  if (!item) return { ok: false, reason: '' }
  const u = item.unlock || {}
  if (u.free || owned.includes(item.id)) return { ok: true, reason: '' }
  if (u.level) return level >= u.level ? { ok: true, reason: '' } : { ok: false, reason: `Lv.${u.level}` }
  if (u.festival) return festival === u.festival ? { ok: true, reason: 'ใส่ได้ช่วงเทศกาล' } : { ok: false, reason: 'เทศกาล' }
  if (u.coins) return { ok: false, reason: `${u.coins} 🪙`, cost: u.coins }
  if (u.quest) return { ok: false, reason: 'ภารกิจ' }
  return { ok: false, reason: '' }
}
export function wardrobeHint(item) {
  const u = item?.unlock || {}
  if (u.free) return 'ฟรี'
  if (u.level) return `ปลดล็อกที่ Lv.${u.level}`
  if (u.coins) return `แลกด้วย ${u.coins} เหรียญแฟชั่น 🪙`
  if (u.festival) return 'ได้จากเทศกาล — รับ Supply Drop ช่วงเทศกาลเพื่อเก็บไว้ถาวร'
  if (u.quest) return 'ได้จากภารกิจด่วน — เคลียร์สต็อกใกล้หมดให้ครบ'
  return ''
}

// old saves kept sprite slots in `equipped` ({ head, face, neck, back, aura }) — map them
export function wardrobeFromLegacy(equipped = {}) {
  const e = equipped || {}
  return {
    headgear: e.head || e.face || null,
    outfit: e.neck || e.back || null,
    prop: null,
    aura: e.aura || null,
  }
}

// ---- profile card (ranking): titles + frames ----
export const TITLES = [
  { id: 'trainee', label: 'วิศวกรฝึกหัดประจำคลัง', unlock: { level: 1 } },
  { id: 'field', label: 'ผู้ช่วยวิศวกรภาคสนาม', unlock: { level: 3 } },
  { id: 'driller', label: 'นักเจาะสำรวจดิน', unlock: { level: 5 } },
  { id: 'lab', label: 'ผู้เชี่ยวชาญห้องแล็บ', unlock: { level: 8 } },
  { id: 'keeper', label: 'หัวหน้าคลังอุปกรณ์', unlock: { level: 10 } },
  { id: 'legend', label: 'ตำนานแห่งชั้นดิน', unlock: { level: 15 } },
  { id: 'streak', label: 'ไฟไม่มีมอด 🔥', unlock: { streak: 7 } },
  { id: 'explorer', label: 'นักสำรวจสายลับ 🎮', unlock: { trick: 'konami' } },
]
export const FRAMES = [
  { id: 'none', label: 'ไม่มีกรอบ', unlock: { level: 1 } },
  { id: 'strata', label: 'ชั้นดิน', unlock: { level: 3 } },
  { id: 'sakura', label: 'ซากุระ', unlock: { level: 6 } },
  { id: 'neon', label: 'นีออน', unlock: { level: 9 } },
  { id: 'gold', label: 'ทองคำ', unlock: { level: 12 } },
]
export function profileUnlocked(entry, { level = 1, streak = 0, unlocked = [] } = {}) {
  const u = entry?.unlock || {}
  if (u.level) return level >= u.level
  if (u.streak) return streak >= u.streak
  if (u.trick) return unlocked.includes(u.trick)
  return true
}
export const DISPLAY_NAME_MAX = 24
