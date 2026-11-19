import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { resolveFestival } from '../festival/festivals'

// Festival theme state.
//  - mode: WHICH festival. Chosen by the admin and stored globally in app_settings
//    (migration 005), so every device sees the same festival, with realtime updates.
//    Default 'auto' resolves from today's date (e.g. ลอยกระทง in November).
//  - enabled: WHETHER this device shows the festival at all. A per-user on/off switch,
//    stored only in this browser, so anyone who finds it busy can turn it off without
//    affecting others.
// When enabled is false the active festival resolves to 'none' (base colors, no
// decorations). A last-known mode is cached in localStorage to avoid a flash on load.

const LS_MODE = 'sts-festival-mode'
const LS_ENABLED = 'sts-festival-enabled'
const SETTING_KEY = 'festival_mode'

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

function applyAttr(mode, enabled) {
  const active = enabled ? resolveFestival(mode) : 'none'
  try {
    document.documentElement.setAttribute('data-festival', active)
  } catch {
    /* no document (tests) */
  }
  return active
}

let channel = null

export const useFestivalStore = create((set, get) => ({
  mode: readLocalMode(), // 'auto' | festival id (global)
  enabled: readEnabled(), // per-device show/hide
  active: applyAttr(readLocalMode(), readEnabled()), // what is actually shown
  loaded: false,

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

  init: async () => {
    get().refresh()
    if (!isSupabaseConfigured) {
      set({ loaded: true })
      return
    }
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
      if (data?.value) get()._reapply(data.value)
    } catch {
      /* table missing / offline → keep local (auto) */
    }
    set({ loaded: true })
    get()._subscribe()
  },

  _subscribe: () => {
    if (channel || !isSupabaseConfigured) return
    channel = supabase
      .channel('sts-app-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${SETTING_KEY}` }, (payload) => {
        const v = payload.new?.value
        if (v) get()._reapply(v)
      })
      .subscribe()
  },

  // admin only: set WHICH festival, for everyone (writes to app_settings)
  setMode: async (mode) => {
    get()._reapply(mode)
    if (!isSupabaseConfigured) return { ok: true }
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: SETTING_KEY, value: mode, updated_at: new Date().toISOString() })
    if (error) return { ok: false, error }
    return { ok: true }
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

export function useActiveFestival() {
  return useFestivalStore((s) => s.active)
}

export default useFestivalStore
