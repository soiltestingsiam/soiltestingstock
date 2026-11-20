// Personal themes ("skins") × the global festival × the cursor — the one place that says
// how they combine. Pure data + tiny helpers, no React.
//
//  - A user's SKIN is their own (classic · japanese · cyber · minimal), per account.
//  - The FESTIVAL is the same for everyone (set by an admin, useFestivalStore).
//  - The festival's scenes, props and effects are re-dressed to suit the user's skin, e.g.
//    ลอยกระทง + japanese = 灯籠流し Tōrō nagashi. Any pair without its own design falls
//    back safely: the classic festival scene with the skin's light "dressing" on top.

export const SKINS = {
  geotech_classic: {
    id: 'geotech_classic',
    label: 'Geotech Classic',
    th: 'วิศวกรซอยเทสติ้งมาตรฐาน',
    desc: 'Field & Lab — อบอุ่น สุขุม ชั้นดินและพิกัดสำรวจ',
    swatch: ['#0b0f19', '#3b82f6', '#d4af37'],
    cursor: 'wand',
    trail: 'sparkle',
    click: 'sparks',
  },
  japanese: {
    id: 'japanese',
    label: 'Kyoto Zen',
    th: 'ญี่ปุ่นเซน & มัตสึริ',
    desc: 'กระดาษวาชิ ไม้สน แดงชาดโทริอิ ซากุระ',
    swatch: ['#f3ece0', '#c8102e', '#2f2a24'],
    cursor: 'sakura',
    trail: 'petal',
    click: 'petals',
  },
  cyber: {
    id: 'cyber',
    label: 'Neo-Tokyo',
    th: 'ไซเบอร์พังก์นีออน',
    desc: 'กระจกฝ้า ขอบนีออนไซแอน/ม่วง กริดแห่งอนาคต',
    swatch: ['#05060f', '#22d3ee', '#d946ef'],
    cursor: 'reticle',
    trail: 'laser',
    click: 'neon',
  },
  minimal: {
    id: 'minimal',
    label: 'Obsidian & Gold',
    th: 'มินิมอลหรูหรา',
    desc: 'เรียบหรู พรีเมียม แสงเงาละมุน',
    swatch: ['#0a0a0b', '#d4af37', '#f5f5f4'],
    cursor: 'ring',
    trail: 'dust',
    click: 'dust',
  },
}
export const SKIN_IDS = Object.keys(SKINS)
export const DEFAULT_SKIN = 'geotech_classic'
export const isSkin = (s) => !!SKINS[s]
// 'classic' was the name during development; anything unknown → the default
export const normalizeSkin = (s) => (s === 'classic' ? DEFAULT_SKIN : isSkin(s) ? s : DEFAULT_SKIN)

// ---- cursors ----
export const CURSORS = {
  auto: { id: 'auto', label: 'อัตโนมัติ', desc: 'ตามธีม & เทศกาล' },
  system: { id: 'system', label: 'เมาส์มาตรฐานระบบ', desc: 'System Default' },
  paw: { id: 'paw', label: 'อุ้งเท้าสัตว์เลี้ยง', desc: 'Pet Paw', trail: 'paw' },
  sakura: { id: 'sakura', label: 'พู่กันซากุระ', desc: 'Sakura Brush', trail: 'petal' },
  reticle: { id: 'reticle', label: 'เป้าเล็งวิศวกร/ไซเบอร์', desc: 'Survey / Cyber Reticle', trail: 'laser' },
  wand: { id: 'wand', label: 'ไม้กายสิทธิ์ประกายดาว', desc: 'Sparkle Wand', trail: 'sparkle' },
  ring: { id: 'ring', label: 'วงแหวนมินิมอล', desc: 'Luxury Ring', trail: 'dust' },
}
export const CURSOR_IDS = Object.keys(CURSORS)
export const isCursor = (c) => !!CURSORS[c]

// in "auto" a festival brings its own trail (candle sparks for ลอยกระทง, snow at Christmas…)
const FESTIVAL_TRAIL = {
  loykrathong: 'candle',
  halloween: 'spooky',
  christmas: 'snow',
  newyear: 'firework',
  chinesenewyear: 'gold',
  valentine: 'heart',
  songkran: 'droplet',
  mothersday: 'jasmine',
  fathersday: 'gold',
  anniversary: 'confetti',
}

// what the pointer looks like and leaves behind: { shape, trail } (shape null = system)
export function resolveCursor(choice, skin, festival) {
  const s = SKINS[normalizeSkin(skin)]
  if (choice === 'system') return { shape: null, trail: null }
  if (!isCursor(choice) || choice === 'auto') {
    const trail = festival && festival !== 'none' ? FESTIVAL_TRAIL[festival] || s.trail : s.trail
    return { shape: s.cursor, trail }
  }
  return { shape: choice, trail: CURSORS[choice].trail }
}

// what a click on the page sets free, by (skin, festival)
const FESTIVAL_CLICK = {
  loykrathong: { geotech_classic: 'lantern', japanese: 'toro', cyber: 'holo', minimal: 'goldlantern' },
  songkran: { geotech_classic: 'splash', japanese: 'splash', cyber: 'neon', minimal: 'splash' },
  christmas: { geotech_classic: 'snow', japanese: 'snow', cyber: 'neon', minimal: 'snow' },
  newyear: { geotech_classic: 'firework', japanese: 'firework', cyber: 'neon', minimal: 'dust' },
  valentine: { geotech_classic: 'hearts', japanese: 'petals', cyber: 'hearts', minimal: 'hearts' },
  halloween: { geotech_classic: 'spooky', japanese: 'spooky', cyber: 'neon', minimal: 'dust' },
  chinesenewyear: { geotech_classic: 'confetti', japanese: 'confetti', cyber: 'neon', minimal: 'dust' },
  anniversary: { geotech_classic: 'confetti', japanese: 'confetti', cyber: 'neon', minimal: 'dust' },
  mothersday: { geotech_classic: 'jasmine', japanese: 'jasmine', cyber: 'neon', minimal: 'jasmine' },
  fathersday: { geotech_classic: 'gold', japanese: 'gold', cyber: 'neon', minimal: 'dust' },
}
export function clickEffect(skin, festival) {
  const s = SKINS[normalizeSkin(skin)]
  return FESTIVAL_CLICK[festival]?.[s.id] || s.click
}

// ---- the festival, re-imagined per skin (names shown in the welcome card) ----
export const FESTIVAL_VARIANTS = {
  loykrathong: {
    japanese: { title: 'ลอยกระทง · 灯籠流し Tōrō nagashi', desc: 'ลอยโคมประทีปไม้ไปตามสายน้ำ ใต้สะพานแดงและเสาโทริอิ' },
    cyber: { title: 'ลอยกระทง · Holo-Lantern Festival', desc: 'โคมโฮโลแกรมลอยบนสายน้ำดิจิทัล แสงนีออนสะท้อนน้ำ' },
    minimal: { title: 'ลอยกระทง · Golden Lanterns', desc: 'โคมประทีปแสงทองอุ่น ลอยอย่างสงบและหรูหรา' },
  },
  songkran: {
    japanese: { title: 'สงกรานต์ · 夏祭り Natsu Matsuri', desc: 'กระดิ่งลมฟูริน กลีบดอกไม้ และสายน้ำฤดูร้อน' },
  },
  newyear: {
    japanese: { title: 'ปีใหม่ · お正月 Oshōgatsu', desc: 'ซุ้มไผ่คาโดมัตสึ และเสียงระฆังข้ามปี' },
  },
}
export const festivalVariant = (festival, skin) => FESTIVAL_VARIANTS[festival]?.[skin] || null
