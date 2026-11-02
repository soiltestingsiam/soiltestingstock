import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// Login is real Supabase Auth. Users still type a username + password; internally the
// username becomes a made-up email address (Supabase Auth is email-based). Nothing about
// users or passwords is stored in the browser beyond Supabase's own session token.
export const EMAIL_DOMAIN = 'sts.local'
export const usernameToEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/
const NOT_CONFIGURED_MSG = 'ยังไม่ได้ตั้งค่า Supabase — ตรวจสอบไฟล์ .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'

const STATUS_MESSAGES = {
  pending: 'บัญชีของคุณรอการอนุมัติ',
  rejected: 'บัญชีของคุณไม่ได้รับอนุมัติ',
}

function rowToProfile(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
  }
}

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? rowToProfile(data) : null
}

let profilesChannel = null

export const useAuthStore = create((set, get) => ({
  session: null,
  profile: null, // the signed-in user's own profiles row
  initialized: false, // first getSession() + profile load finished
  profiles: [], // every profile (admins only — RLS returns just your own row otherwise)

  // Called once at app start: restores the saved Supabase session (if any) and follows
  // sign-in / sign-out / token refresh from then on.
  init: async () => {
    // the old login kept every account (with plaintext passwords) in localStorage — wipe it
    try {
      localStorage.removeItem('sts-auth-storage')
    } catch {
      // storage unavailable — nothing to clean
    }
    if (!isSupabaseConfigured) {
      set({ initialized: true })
      return
    }
    supabase.auth.onAuthStateChange((event, session) => {
      // Don't await Supabase calls inside this callback (supabase-js can deadlock);
      // defer the profile fetch to the next tick.
      if (!session) {
        get()._clear()
        return
      }
      if (event === 'TOKEN_REFRESHED' && get().session?.user.id === session.user.id) {
        set({ session })
        return
      }
      setTimeout(() => get()._loadSession(session), 0)
    })
    const { data } = await supabase.auth.getSession()
    if (data.session) await get()._loadSession(data.session)
    set({ initialized: true })
  },

  _loadSession: async (session) => {
    try {
      const profile = await fetchProfile(session.user.id)
      // login()/register() may have signed this session out while the profile loaded
      // (pending/rejected account) — don't resurrect it.
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.id !== session.user.id) return
      set({ session, profile })
      get().subscribeProfiles()
      if (profile?.role === 'Admin' && profile.status === 'approved') get().loadProfiles()
    } catch {
      set({ session, profile: null })
    }
  },

  _clear: () => {
    if (profilesChannel) {
      supabase.removeChannel(profilesChannel)
      profilesChannel = null
    }
    set({ session: null, profile: null, profiles: [] })
  },

  login: async (username, password) => {
    if (!isSupabaseConfigured) return { success: false, message: NOT_CONFIGURED_MSG }
    const uname = username.trim()
    if (!uname || !password) return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(uname), password })
    if (error || !data.session) return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }

    let profile = null
    try {
      profile = await fetchProfile(data.session.user.id)
    } catch {
      profile = null
    }
    if (!profile || profile.status !== 'approved') {
      await supabase.auth.signOut()
      get()._clear()
      return { success: false, message: STATUS_MESSAGES[profile?.status] ?? STATUS_MESSAGES.pending }
    }
    set({ session: data.session, profile })
    get().subscribeProfiles()
    if (profile.role === 'Admin') get().loadProfiles()
    return { success: true }
  },

  // Sign-up never logs the user in: the account waits for an admin to approve it.
  register: async (username, password) => {
    if (!isSupabaseConfigured) return { success: false, message: NOT_CONFIGURED_MSG }
    const uname = username.trim()
    if (!uname || !password) return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }
    if (!USERNAME_RE.test(uname)) {
      return {
        success: false,
        message: 'ชื่อผู้ใช้งานต้องยาว 3-32 ตัว ใช้ได้เฉพาะ a-z, A-Z, 0-9, จุด (.), ขีด (-) และขีดล่าง (_)',
      }
    }
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(uname),
      password,
      options: { data: { username: uname } },
    })
    // signUp may sign the new user in straight away (when "Confirm email" is off) —
    // always end the session; a pending account must not get in.
    await supabase.auth.signOut()
    get()._clear()
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already') || msg.includes('registered') || msg.includes('duplicate')) {
        return { success: false, message: 'ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว' }
      }
      if (msg.includes('password')) return { success: false, message: 'รหัสผ่านไม่ผ่านเงื่อนไขของระบบ (อย่างน้อย 6 ตัวอักษร)' }
      return { success: false, message: `สมัครสมาชิกไม่สำเร็จ: ${error.message}` }
    }
    return { success: true }
  },

  logout: async () => {
    get()._clear()
    if (isSupabaseConfigured) await supabase.auth.signOut()
  },

  // ---------- admin: user approval ----------
  loadProfiles: async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (error) return
    const profiles = (data ?? []).map(rowToProfile)
    const own = profiles.find((p) => p.id === get().session?.user.id)
    set(own ? { profiles, profile: own } : { profiles })
  },

  // Realtime on profiles: admins see new sign-ups (the รออนุมัติ badge) without reloading,
  // and anyone whose own account gets rejected/demoted is updated right away.
  subscribeProfiles: () => {
    if (!isSupabaseConfigured || profilesChannel) return
    profilesChannel = supabase
      .channel('sts-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => get()._refreshProfiles())
      .subscribe()
  },

  _refreshProfiles: async () => {
    const userId = get().session?.user.id
    if (!userId) return
    try {
      const profile = await fetchProfile(userId)
      set({ profile })
      if (profile?.role === 'Admin' && profile.status === 'approved') await get().loadProfiles()
      else set({ profiles: [] })
    } catch {
      // keep the last known state
    }
  },

  updateProfile: async (id, updates) => {
    const patch = {}
    if (updates.role !== undefined) patch.role = updates.role
    if (updates.status !== undefined) patch.status = updates.status
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) {
      alert(`บันทึกไม่สำเร็จ: ${error.message}`)
      return false
    }
    await get().loadProfiles()
    return true
  },

  approveUser: (id) => get().updateProfile(id, { status: 'approved' }),
  rejectUser: (id) => get().updateProfile(id, { status: 'rejected' }),
}))

export function useCurrentUser() {
  return useAuthStore((s) => s.profile)
}

export function usePendingCount() {
  return useAuthStore((s) =>
    s.profile?.role === 'Admin' ? s.profiles.filter((p) => p.status === 'pending').length : 0,
  )
}

export default useAuthStore
