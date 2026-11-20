import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { isSkin, isCursor, normalizeSkin, DEFAULT_SKIN } from '../theme/skins'
import { useSpectacleStore } from './useSpectacleStore'

// Each user's own look:
//  - theme : 'dark' | 'light'
//  - skin  : personal theme — classic · japanese · cyber · minimal (see theme/skins.js)
//  - cursor: auto · system · paw · sakura · reticle · wand · ring
//  - pureWork ("โหมดทำงานล้วน") lives in useSpectacleStore but follows the account too
// Saved in this browser (instant) and, once signed in, in the account's user_metadata.prefs
// so the same look follows the user to every device (newest copy wins). The global
// festival stays separate (useFestivalStore) — it is re-dressed to suit the skin.

let pushTimer = null

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light'
      skin: DEFAULT_SKIN,
      cursor: 'auto',
      prefsAt: 0, // when the look was last changed (for picking the newest copy)
      setTheme: (theme) => get()._change({ theme }),
      toggleTheme: () => get()._change({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setSkin: (skin) => isSkin(skin) && get()._change({ skin }),
      setCursor: (cursor) => isCursor(cursor) && get()._change({ cursor }),
      // all fun on / off — kept in the spectacle store (applied at once), synced like the look
      setPureWork: (on) => {
        useSpectacleStore.getState().setPureWork(!!on)
        get()._change({})
      },

      _change: (patch) => {
        set({ ...patch, prefsAt: Date.now() })
        get()._push()
      },

      // write to the account (debounced; a user can only ever write their own metadata)
      _push: () => {
        clearTimeout(pushTimer)
        pushTimer = setTimeout(async () => {
          if (!isSupabaseConfigured) return
          try {
            const { data } = await supabase.auth.getSession()
            if (!data?.session) return
            const { theme, skin, cursor, prefsAt } = get()
            const pureWork = !!useSpectacleStore.getState().pureWork
            await supabase.auth.updateUser({ data: { prefs: { theme, skin, cursor, pureWork, at: prefsAt } } })
          } catch {
            /* offline — kept locally, pushed next change */
          }
        }, 1200)
      },

      // after sign-in: use the account's look if it is newer than this browser's
      adoptRemote: (prefs) => {
        if (!prefs || typeof prefs !== 'object') return
        if ((Number(prefs.at) || 0) <= get().prefsAt) return
        set({
          theme: prefs.theme === 'light' ? 'light' : prefs.theme === 'dark' ? 'dark' : get().theme,
          skin: isSkin(normalizeSkin(prefs.skin)) && prefs.skin ? normalizeSkin(prefs.skin) : get().skin,
          cursor: isCursor(prefs.cursor) ? prefs.cursor : get().cursor,
          prefsAt: Number(prefs.at) || 0,
        })
        if (typeof prefs.pureWork === 'boolean') useSpectacleStore.getState().setPureWork(prefs.pureWork)
      },
    }),
    {
      name: 'sts-theme-storage',
      partialize: ({ theme, skin, cursor, prefsAt }) => ({ theme, skin, cursor, prefsAt }),
      merge: (persisted, current) => ({ ...current, ...(persisted || {}), skin: normalizeSkin(persisted?.skin) }),
    },
  ),
)

export default useThemeStore
