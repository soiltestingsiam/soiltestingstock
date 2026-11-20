import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import {
  levelInfo,
  dailyXp,
  pickCoat,
  cleanPetName,
  WORK_XP_DAILY_CAP,
  WARDROBE,
  WARDROBE_BY_ID,
  WARDROBE_SLOTS,
  SUPPLY_XP,
  SUPPLY_COINS,
  SUPPLY_DAILY_CAP,
  DISPLAY_NAME_MAX,
  TITLES,
  FRAMES,
  wardrobeFromLegacy,
  wardrobeStatus,
} from '../pet/petData'
import { emitFx } from '../lib/fxBus'
import { teamCheckin, teamUpsertProfile } from '../lib/teamApi'
import { useThemeStore } from './useThemeStore'
import { isPureWork } from './useSpectacleStore'

// Each user's own pet: its name, species, XP (→ level → size + unlocked accessories), the
// daily "เติมไฟ" streak, XP earned from work today (capped), what they have equipped, and
// whether they want it shown.
//
// Saved per user, two ways:
//  - this browser:  localStorage `sts-pet:<username>` (instant, works offline)
//  - their account: Supabase Auth user_metadata.pet (follows them to every device —
//    no table / migration needed; a user can only ever write their own metadata)
// On sign-in the newer copy wins. It is cosmetic only — nothing in the stock system
// reads it.

const DEFAULT_PROFILE = { displayName: '', title: 'trainee', frame: 'none', hidden: false }
const DEFAULT_PET = {
  name: '',
  species: 'cat',
  xp: 0,
  streak: 0,
  lastDay: null,
  workDay: null,
  workXp: 0,
  equipped: {}, // old sprite-slot outfit (kept for old saves; see wardrobe)
  wardrobe: null, // { headgear, outfit, prop, aura } — null slot = dressed by theme + festival
  coins: 0, // 🪙 fashion coins (Supply Drops)
  owned: [], // wardrobe items bought / earned
  profile: DEFAULT_PROFILE, // the card teammates see in the ranking
  supplyDay: null, // local copy of today's Supply Drop count (the server has the real one)
  supplyCount: 0,
  hidden: false,
  unlocked: [],
  updatedAt: 0,
}

// a loaded copy (any age) → the current shape
function normalize(raw) {
  const pet = { ...DEFAULT_PET, ...(raw || {}) }
  if (!pet.wardrobe || typeof pet.wardrobe !== 'object') pet.wardrobe = wardrobeFromLegacy(pet.equipped)
  for (const k of Object.keys(WARDROBE_SLOTS)) if (pet.wardrobe[k] !== null && !WARDROBE_BY_ID[pet.wardrobe[k]] && k !== 'aura') pet.wardrobe[k] = null
  pet.coins = Math.max(0, Math.floor(Number(pet.coins) || 0))
  pet.owned = Array.isArray(pet.owned) ? pet.owned.filter((id) => WARDROBE_BY_ID[id]) : []
  pet.profile = { ...DEFAULT_PROFILE, ...(pet.profile && typeof pet.profile === 'object' ? pet.profile : {}) }
  return pet
}
const clean = (raw, max) =>
  Array.from(
    String(raw ?? '')
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, max)
    .join('')
    .trim()

// what the pet says after each kind of save (picked at random, so it doesn't repeat itself)
const SAVE_LINES = {
  รับสินค้า: ['รับของเข้าคลังแล้ว 📦', 'ของมาส่งแล้ว เย้! 📦', 'สต็อกเพิ่มแล้ว ✨', 'นับเข้าคลังเรียบร้อย 📦'],
  จ่ายสินค้า: ['เบิกออกเรียบร้อย ตรวจเช็กแล้ว 🔍', 'ส่งของออกไปแล้ว 🚚', 'หักยอดให้แล้ว 🔍', 'จ่ายออกครบถ้วน ✅'],
  เพิ่มสินค้า: ['สินค้าใหม่มาแล้ว 🆕', 'ลงทะเบียนสินค้าแล้ว 📝'],
}
const pickLine = (label) => {
  const list = SAVE_LINES[label]
  return list ? list[Math.floor(Math.random() * list.length)] : label ? `${label}แล้ว ✓` : 'บันทึกแล้ว ✓'
}

// secret tricks the user can unlock by playing with the pet
export const TRICKS = {
  spin: { emoji: '🌀', name: 'หมุนติ้ว', how: 'กดที่น้องรัว ๆ 5 ครั้ง' },
  gold: { emoji: '👑', name: 'ร่างทองคำ', how: 'กดที่น้องรัว ๆ 9 ครั้ง' },
  dance: { emoji: '💃', name: 'เต้นฉลองคอมโบ', how: 'ทำรายการต่อเนื่องให้ได้คอมโบ ×5' },
  flip: { emoji: '🤸', name: 'ตีลังกา', how: 'ดับเบิลคลิกที่น้อง' },
  konami: { emoji: '🎮', name: 'สูตรลับนักสำรวจ', how: 'กด ↑ ↑ ↓ ↓ ← → ← → B A' },
}

const localKey = (name) => `sts-pet:${name}`

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}

// What the login page can show for a typed username on this device (species + items).
export function readLocalPet(username) {
  const name = (username || '').trim().toLowerCase()
  if (!name) return null
  try {
    return JSON.parse(localStorage.getItem(localKey(name)) || 'null')
  } catch {
    return null
  }
}

let syncTimer = null

export const usePetStore = create((set, get) => ({
  owner: null, // lower-cased username (also the coat seed)
  userId: null,
  ready: false,
  pet: DEFAULT_PET,
  events: [], // short-lived bubbles above the pet: { id, type, text }

  init: (user, username) => {
    if (!user || !username) return
    if (get().ready && get().userId === user.id) return
    const owner = username.trim().toLowerCase()
    const local = readLocalPet(owner)
    const remote = user.user_metadata?.pet || null
    const best = [local, remote].filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
    set({ owner, userId: user.id, ready: true, pet: normalize(best), events: [] })
    get()._saveLocal()
    get().checkIn()
    get()._teamCheckin()
    get()._pushTeam()
  },

  // server side of เติมไฟ (008): once a day per device; also learns today's Supply Drops
  _teamCheckin: async () => {
    const { owner } = get()
    if (!owner) return
    const key = `sts-team-checkin:${owner}`
    try {
      if (localStorage.getItem(key) === dayKey()) return
    } catch {
      /* ignore */
    }
    const { data } = await teamCheckin()
    if (!data || !data.ok) return
    try {
      localStorage.setItem(key, dayKey())
    } catch {
      /* ignore */
    }
    const claims = Number(data.today_claims) || 0
    const { pet } = get()
    get().syncSupplyCount(Math.max(claims, pet.supplyDay === dayKey() ? pet.supplyCount || 0 : 0))
  },

  // the public card teammates see (008). Skipped in pure work mode; silent on any error.
  _pushTeam: () => {
    const { ready, userId, pet } = get()
    if (!ready || !userId || isPureWork()) return
    const lv = levelInfo(pet.xp).level
    teamUpsertProfile(userId, {
      display_name: clean(pet.profile.displayName, DISPLAY_NAME_MAX),
      title: (TITLES.find((t) => t.id === pet.profile.title) || TITLES[0]).label,
      frame: FRAMES.some((f) => f.id === pet.profile.frame) ? pet.profile.frame : 'none',
      skin: useThemeStore.getState().skin || 'geotech_classic',
      hidden: !!pet.profile.hidden,
      pet: { species: pet.species, name: pet.name || '', wardrobe: pet.wardrobe, level: lv, streak: pet.streak || 0, coat: get().owner },
    })
  },

  reset: () => {
    get().flush()
    set({ owner: null, userId: null, ready: false, pet: DEFAULT_PET, events: [] })
  },

  _saveLocal: () => {
    const { owner, pet } = get()
    if (!owner) return
    try {
      localStorage.setItem(localKey(owner), JSON.stringify(pet))
    } catch {
      /* storage full / blocked */
    }
  },

  _pushRemote: async () => {
    syncTimer = null
    if (!isSupabaseConfigured || !get().ready) return
    try {
      await supabase.auth.updateUser({ data: { pet: get().pet } })
    } catch {
      /* offline — the local copy is kept and pushed next time */
    }
    get()._pushTeam()
  },

  // write to the account soon (debounced), or right away for important changes
  _sync: (now = false) => {
    clearTimeout(syncTimer)
    if (now) get()._pushRemote()
    else syncTimer = setTimeout(() => get()._pushRemote(), 45000)
  },

  flush: () => {
    if (syncTimer) {
      clearTimeout(syncTimer)
      get()._pushRemote()
    }
  },

  _emit: (type, text, ms) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({ events: [...s.events.slice(-3), { id, type, text }] }))
    setTimeout(() => set((s) => ({ events: s.events.filter((e) => e.id !== id) })), ms || (type === 'levelup' ? 4200 : 3000))
  },

  // what to call the pet: the name its owner gave it, else its coat name
  displayName: () => {
    const { pet, owner } = get()
    return pet.name || pickCoat(pet.species, owner).name
  },

  // XP from work still available today
  workXpLeft: () => {
    const { pet } = get()
    const used = pet.workDay === dayKey() ? pet.workXp || 0 : 0
    return Math.max(0, WORK_XP_DAILY_CAP - used)
  },

  _update: (patch, { syncNow = false } = {}) => {
    const before = levelInfo(get().pet.xp).level
    const pet = { ...get().pet, ...patch, updatedAt: Date.now() }
    set({ pet })
    get()._saveLocal()
    const after = levelInfo(pet.xp).level
    if (after > before) {
      get()._emit('levelup', `เลเวลอัป! Lv.${after} 🎉`)
      emitFx('levelup', { level: after })
      get()._sync(true)
    } else {
      get()._sync(syncNow)
    }
  },

  // เติมไฟ — first visit of the day keeps (or starts) the streak and gives XP
  checkIn: () => {
    if (!get().ready) return
    const { pet } = get()
    const today = dayKey()
    if (pet.lastDay === today) return
    const streak = pet.lastDay === yesterdayKey() ? (pet.streak || 0) + 1 : 1
    const gain = dailyXp(streak)
    get()._emit('checkin', `🔥 ${get().displayName()} ได้เติมไฟแล้ว · สตรีค ${streak} วัน · +${gain} XP`, 4200)
    get()._update({ xp: (pet.xp || 0) + gain, streak, lastDay: today }, { syncNow: true })
  },

  // a save in the app (รับ / จ่าย / เพิ่มสินค้า): the pet always cheers; XP only up to the
  // daily work cap
  gainXp: (amount, label) => {
    if (!get().ready || !amount) return
    const gain = Math.min(amount, get().workXpLeft())
    const what = pickLine(label)
    if (gain <= 0) {
      get()._emit('cheer', `${what} เก่งมาก! (XP จากงานวันนี้ครบ ${WORK_XP_DAILY_CAP} แล้ว)`)
      return
    }
    const { pet } = get()
    const today = dayKey()
    const used = pet.workDay === today ? pet.workXp || 0 : 0
    get()._emit('xp', `${what} +${gain} XP`)
    get()._update({ xp: (pet.xp || 0) + gain, workDay: today, workXp: used + gain })
  },

  // a gentle heads-up about low stock, at most once a day per user on this device.
  // Stock below zero is said first (it usually means a receipt was not keyed in yet).
  warnLowStock: (count, negative = 0) => {
    const { ready, owner } = get()
    if (!ready || !owner || !count) return
    const key = `sts-pet-lowstock:${owner}`
    try {
      if (localStorage.getItem(key) === dayKey()) return
      localStorage.setItem(key, dayKey())
    } catch {
      /* storage blocked — still fine to say it once this session */
    }
    const text =
      negative > 0
        ? `🚨 ภารกิจด่วน! สต็อกติดลบ ${negative} รายการ${count > negative ? ` · ใกล้หมดอีก ${count - negative}` : ''} — กดที่${get().displayName()}เพื่อดู`
        : `👀 มีสินค้าใกล้หมด ${count} รายการ — กดที่${get().displayName()}เพื่อดู`
    get()._emit('warn', text, 6500)
    emitFx('low-stock', { count, negative })
  },

  // a secret trick: says "ปลดล็อก…" the first time, just does it after that
  unlock: (id) => {
    if (!get().ready || !TRICKS[id]) return false
    const had = (get().pet.unlocked || []).includes(id)
    const t = TRICKS[id]
    get()._emit('trick', had ? `${t.emoji} ${t.name}!` : `🎉 ปลดล็อกท่าลับ: ${t.name} ${t.emoji}`, 3600)
    if (!had) get()._update({ unlocked: [...(get().pet.unlocked || []), id] }, { syncNow: true })
    return !had
  },

  setName: (raw) => get()._update({ name: cleanPetName(raw) }, { syncNow: true }),

  setSpecies: (species) => get()._update({ species }, { syncNow: true }),
  equip: (slot, id) => get()._update({ equipped: { ...get().pet.equipped, [slot]: id || null } }, { syncNow: true }),
  setHidden: (hidden) => get()._update({ hidden }, { syncNow: true }),

  // ---- wardrobe (4 slots) ----
  // put an item on (or null = back to auto: theme + festival)
  wear: (slot, id, festival = 'none') => {
    if (!WARDROBE_SLOTS[slot]) return false
    const { pet } = get()
    if (id) {
      const item = WARDROBE_BY_ID[id]
      if (!item || item.slot !== slot) return false
      if (!wardrobeStatus(item, { level: levelInfo(pet.xp).level, owned: pet.owned, festival }).ok) return false
    }
    get()._update({ wardrobe: { ...pet.wardrobe, [slot]: id || null } }, { syncNow: true })
    return true
  },
  // spend fashion coins on an item
  buy: (id) => {
    const item = WARDROBE_BY_ID[id]
    const { pet } = get()
    const cost = item?.unlock?.coins
    if (!cost || pet.owned.includes(id) || pet.coins < cost) return false
    get()._update({ coins: pet.coins - cost, owned: [...pet.owned, id] }, { syncNow: true })
    get()._emit('trick', `ได้ ${item.emoji} ${item.name} แล้ว! (−${cost} 🪙)`, 3200)
    return true
  },
  // earned items (festival / quest); says so the first time
  grant: (ids, why = '') => {
    const { pet } = get()
    const fresh = [].concat(ids).filter((id) => WARDROBE_BY_ID[id] && !pet.owned.includes(id))
    if (!fresh.length) return []
    get()._update({ owned: [...pet.owned, ...fresh] }, { syncNow: true })
    const names = fresh.map((id) => `${WARDROBE_BY_ID[id].emoji} ${WARDROBE_BY_ID[id].name}`).join(' · ')
    get()._emit('trick', `🎁 ได้ไอเท็มใหม่${why ? ` (${why})` : ''}: ${names}`, 4200)
    return fresh
  },

  // ---- Supply Drop reward (after the server said yes — or locally when 008 isn't
  // installed, with the same daily cap on this device) ----
  // the server says how many were claimed today (another device, or the cap)
  syncSupplyCount: (n) => {
    if (!get().ready) return
    set((st) => ({ pet: { ...st.pet, supplyDay: dayKey(), supplyCount: Math.max(0, Math.min(SUPPLY_DAILY_CAP, Number(n) || 0)) } }))
    get()._saveLocal()
  },
  canClaimLocal: () => {
    const { pet } = get()
    return (pet.supplyDay === dayKey() ? pet.supplyCount || 0 : 0) < SUPPLY_DAILY_CAP
  },
  rewardSupply: ({ festival = null, todayClaims = null } = {}) => {
    if (!get().ready) return false
    const { pet } = get()
    const today = dayKey()
    const count = todayClaims != null ? Number(todayClaims) || 0 : (pet.supplyDay === today ? pet.supplyCount || 0 : 0) + 1
    get()._emit('xp', `📦 Supply Drop! +${SUPPLY_XP} XP · +${SUPPLY_COINS} 🪙 (วันนี้ ${Math.min(count, SUPPLY_DAILY_CAP)}/${SUPPLY_DAILY_CAP})`, 3400)
    get()._update({ xp: (pet.xp || 0) + SUPPLY_XP, coins: (pet.coins || 0) + SUPPLY_COINS, supplyDay: today, supplyCount: Math.min(count, SUPPLY_DAILY_CAP) })
    if (festival && festival !== 'none') {
      const items = WARDROBE.filter((w) => w.unlock?.festival === festival).map((w) => w.id)
      if (items.length) get().grant(items, 'Supply Drop เทศกาล')
    }
    return true
  },

  // ---- profile card ----
  setProfile: (patch) => {
    const next = { ...get().pet.profile, ...patch }
    next.displayName = clean(next.displayName, DISPLAY_NAME_MAX)
    get()._update({ profile: next }, { syncNow: true })
  },
}))

export default usePetStore
