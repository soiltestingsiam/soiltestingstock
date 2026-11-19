import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { resolveFestival } from '../festival/festivals'

// Festival theme state. The admin's choice is stored globally in app_settings
// (migration 005) so every device sees the same festival, with realtime updates.
// Default 'auto' resolves the festival from today's date — so even before any admin
// touches it, everyone automatically gets the in-season theme (e.g. ลอยกระทง in Nov).
// A last-known value is cached in localStorage to avoid a flash before the DB loads.

const LS_KEY = 'sts-festival-mode'
const SETTING_KEY = 'festival_mode'

function readLocalMode() {
  try {
    return localStorage.getItem(LS_KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

function applyAttr(mode) {
  const active = resolveFestival(mode)
  try {
    document.documentElement.setAttribute('data-festival', active)
  } catch {
    /* no document (tests) */
  }
  return active
}

let channel = null

export const useFestivalStore = create((set, get) => ({
  mode: readLocalMode(), // 'auto' | festival id
  active: applyAttr(readLocalMode()), // the festival currently shown
  loaded: false,

  // apply a mode locally (cache + <html> attribute) without writing to the DB
  _applyLocal: (mode) => {
    try {
      localStorage.setItem(LS_KEY, mode)
    } catch {
      /* ignore */
    }
    set({ mode, active: applyAttr(mode) })
  },

  // re-resolve 'auto' against the current date (call e.g. at app start / past midnight)
  refresh: () => set({ active: applyAttr(get().mode) }),

  // read the global setting once, then keep it live
  init: async () => {
    get().refresh()
    if (!isSupabaseConfigured) {
      set({ loaded: true })
      return
    }
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', SETTING_KEY).maybeSingle()
      if (data?.value) get()._applyLocal(data.value)
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
        if (v) get()._applyLocal(v)
      })
      .subscribe()
  },

  // admin only: set the festival for everyone (writes to app_settings)
  setMode: async (mode) => {
    get()._applyLocal(mode)
    if (!isSupabaseConfigured) return { ok: true }
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: SETTING_KEY, value: mode, updated_at: new Date().toISOString() })
    if (error) return { ok: false, error }
    return { ok: true }
  },
}))

export function useActiveFestival() {
  return useFestivalStore((s) => s.active)
}

export default useFestivalStore
