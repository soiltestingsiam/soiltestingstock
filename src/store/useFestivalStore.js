import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { resolveFestival, parseAnniversary } from '../festival/festivals'
import { useSpectacleStore, isPureWork } from './useSpectacleStore'

// Festival theme state.
//  - mode: WHICH festival. Chosen by the admin and stored globally in app_settings
//    (migration 005), so every device sees the same festival, with realtime updates.
//    Default 'auto' resolves from today's date (e.g. ลอยกระทง in November).
//  - enabled: WHETHER this device shows the festival at all. A per-user on/off switch,
//    stored only in this browser, so anyone who finds it busy can turn it off without
//    affecting others.
// When enabled is false the active festival resolves to 'none' (base colors, no
// decorations). The last-known mode is cached in localStorage to avoid a flash on load.
//
// Keeping every device in step with the admin's choice:
//  - the value is read at start-up, AGAIN right after sign-in (a signed-out read is not
//    allowed by the database unless migration 006 is installed) and whenever the tab
//    comes back into view;
//  - realtime pushes changes to open devices; the channel is re-joined after sign-in so it
//    runs with the user's token;
//  - a read that started before a newer local/realtime change is ignored (`seq`), so a
//    slow start-up read can never undo a choice made a moment later.
//
// The company's founding date (for the "ครบรอบบริษัท" theme in auto mode) is a second key in
// the same table, set by an admin; cached on the device so the login page knows it too.

const LS_MODE = 'sts-festival-mode'
const LS_ENABLED = 'sts-festival-enabled'
const SETTING_KEY = 'festival_mode'
const ANNIV_KEY = 'company_anniversary'
const LS_ANNIV = 'sts-company-anniversary'

function readLocalAnniv() {
  try {
    return localStorage.getItem(LS_ANNIV) || ''
  } catch {
    return ''
  }
}

function readLocalMode() {
  try {
    return localStorage.getItem(LS_MODE) || 'auto'
  } catch {
    return 'auto'
  }
}

function readEnabled() {
  try {
    return localStorage.getItem(LS_ENABLED) !== 'off'
  } catch {
    return true
  }
}

// "โหมดทำงานล้วน" (pure work) hides the festival on this device just like the switch below
function applyAttr(mode, enabled, anniv = readLocalAnniv()) {
  const active = enabled && !isPureWork() ? resolveFestival(mode, new Date(), parseAnniversary(anniv)) : 'none'
  try {
    document.documentElement.setAttribute('data-festival', active)
  } catch {
    /* no document (tests) */
  }
  return active
}

// The admin's current choice from the database (null when it can't be read).
// Prefers get_festival_mode() (migration 006 — readable signed-out too, so the login page
// matches), then falls back to the table (signed-in, approved users).
async function fetchMode() {
  try {
    const { data, error } = await supabase.rpc('get_festival_mode')
    if (!error && typeof data === 'string' && data) return data
  } catch {
    /* function not installed — fall back */
  }
  try {
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
    if (!error && data?.value) return data.value
  } catch {
    /* offline / table missing */
  }
  return null
}

// the founding date ('' when unset, null when it can't be read)
async function fetchAnniversary() {
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value').eq('key', ANNIV_KEY).maybeSingle()
    if (error) return null
    return data?.key === ANNIV_KEY && parseAnniversary(data.value) ? data.value : ''
  } catch {
    return null
  }
}

// Postgres / PostgREST "the table isn't there" (migration 005 not installed)
const isMissingTable = (e) => ['42P01', 'PGRST205', 'PGRST204'].includes(e?.code) || /does not exist|schema cache/i.test(e?.message || '')

let channel = null
let seq = 0 // bumped on every newer change; an older in-flight read is then ignored

export const useFestivalStore = create((set, get) => ({
  mode: readLocalMode(), // 'auto' | festival id (global)
  enabled: readEnabled(), // per-device show/hide
  active: applyAttr(readLocalMode(), readEnabled()), // what is actually shown
  loaded: false,
  welcomeNonce: 0, // bumped on each fresh login → the welcome popup reads it
  anniversary: readLocalAnniv(), // 'YYYY-MM-DD' | 'MM-DD' | ''

  // Fired right after a successful login so the welcome popup shows the active festival.
  announce: () => set((s) => ({ welcomeNonce: s.welcomeNonce + 1 })),

  // apply the current mode + enabled to the <html> attribute and cache the mode
  _reapply: (mode = get().mode) => {
    try {
      localStorage.setItem(LS_MODE, mode)
    } catch {
      /* ignore */
    }
    set({ mode, active: applyAttr(mode, get().enabled) })
  },

  refresh: () => set({ active: applyAttr(get().mode, get().enabled) }),

  _setAnniv: (value) => {
    const v = parseAnniversary(value) ? value : ''
    try {
      if (v) localStorage.setItem(LS_ANNIV, v)
      else localStorage.removeItem(LS_ANNIV)
    } catch {
      /* ignore */
    }
    set({ anniversary: v, active: applyAttr(get().mode, get().enabled, v) })
  },

  // pull the admin's current choice (and the founding date) from the database
  sync: async () => {
    if (!isSupabaseConfigured) return
    const started = seq
    const [v, anniv] = await Promise.all([fetchMode(), fetchAnniversary()])
    if (anniv != null && anniv !== get().anniversary) get()._setAnniv(anniv)
    if (v && started === seq && v !== get().mode) get()._reapply(v)
  },

  init: async () => {
    get().refresh()
    if (!isSupabaseConfigured) {
      set({ loaded: true })
      return
    }
    await get().sync()
    set({ loaded: true })
    get()._subscribe()
  },

  // called when a user signs in: read the real value and re-join realtime with their token
  onSignedIn: () => {
    if (!isSupabaseConfigured) return
    get().sync()
    get()._subscribe()
  },

  _subscribe: () => {
    if (!isSupabaseConfigured) return
    if (channel) {
      try {
        supabase.removeChannel(channel)
      } catch {
        /* ignore */
      }
      channel = null
    }
    channel = supabase
      .channel('sts-app-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `key=in.(${SETTING_KEY},${ANNIV_KEY})` }, (payload) => {
        const key = payload.new?.key
        const v = payload.new?.value
        if (key === ANNIV_KEY) {
          get()._setAnniv(v || '')
        } else if (v) {
          seq += 1
          get()._reapply(v)
        }
      })
      .subscribe()
  },

  // admin only: set WHICH festival, for everyone (writes to app_settings).
  // Returns { ok } or { ok:false, error, localOnly } so the picker can say what happened.
  setMode: async (mode) => {
    seq += 1
    const prev = get().mode
    get()._reapply(mode)
    if (!isSupabaseConfigured) return { ok: true }
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: SETTING_KEY, value: mode, updated_at: new Date().toISOString() })
    if (!error) return { ok: true }
    if (isMissingTable(error)) {
      // 005 not installed: keep it on this device only and say so
      return { ok: false, error, localOnly: true }
    }
    // not saved (e.g. no permission): show what the database really has
    seq += 1
    const real = await fetchMode()
    get()._reapply(real || prev)
    return { ok: false, error }
  },

  // admin only: the company's founding date ('YYYY-MM-DD' / 'MM-DD', '' to clear).
  // Returns { ok } or { ok:false, error, localOnly } like setMode.
  setAnniversary: async (value) => {
    const v = parseAnniversary(value) ? value : ''
    const prev = get().anniversary
    get()._setAnniv(v)
    if (!isSupabaseConfigured) return { ok: true }
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: ANNIV_KEY, value: v || null, updated_at: new Date().toISOString() })
    if (!error) return { ok: true }
    if (isMissingTable(error)) return { ok: false, error, localOnly: true }
    const real = await fetchAnniversary()
    get()._setAnniv(real ?? prev)
    return { ok: false, error }
  },

  // any user: show / hide the festival on THIS device only
  setEnabled: (on) => {
    try {
      localStorage.setItem(LS_ENABLED, on ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    set({ enabled: on, active: applyAttr(get().mode, on) })
  },
}))

// pure work switched on / off → festival hidden / shown again at once
useSpectacleStore.subscribe((s, prev) => {
  if (!!s.pureWork !== !!prev.pureWork) useFestivalStore.getState().refresh()
})

export function useActiveFestival() {
  return useFestivalStore((s) => s.active)
}

export default useFestivalStore
