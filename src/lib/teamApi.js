import { supabase, isSupabaseConfigured } from './supabaseClient'

// The team side of the pet: profile cards, daily check-in, Supply Drop claims, kudos and
// the ranking — all in migration 008 (supabase/migrations/008_team_pets_ranking.sql).
//
// Defensive by design: if 008 has not been run yet (missing table / function), or the
// network is down, every call resolves to { data: null, error } — it never throws — and
// `teamStatus()` turns 'missing' so the UI can say "ยังไม่ได้ติดตั้ง" and fall back to the
// local copy. Nothing in here touches stock data.

let status = 'unknown' // 'unknown' | 'ready' | 'missing' | 'offline'
const listeners = new Set()
const setStatus = (s) => {
  if (s === status) return
  status = s
  for (const fn of [...listeners]) {
    try {
      fn(s)
    } catch {
      /* ignore */
    }
  }
}
export const teamStatus = () => status
export function onTeamStatus(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// "this feature is not installed in the database" (PostgREST / Postgres codes)
function isMissing(error) {
  if (!error) return false
  const code = String(error.code || '')
  return ['PGRST202', 'PGRST205', '42883', '42P01', '404'].includes(code) || /does not exist|could not find the (function|table)/i.test(String(error.message || ''))
}

async function rpc(name, args) {
  if (!isSupabaseConfigured) {
    setStatus('offline')
    return { data: null, error: { message: 'offline' } }
  }
  if (status === 'missing') return { data: null, error: { message: 'missing' } }
  try {
    const { data, error } = await supabase.rpc(name, args)
    if (error) {
      if (isMissing(error)) setStatus('missing')
      return { data: null, error }
    }
    setStatus('ready')
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e }
  }
}

export const teamCheckin = () => rpc('pet_checkin')
export const teamClaimSupply = () => rpc('claim_supply_drop')
export const teamSendKudos = (to, emoji = '👏') => rpc('send_kudos', { p_to: to, p_emoji: emoji })
export async function teamLeaderboard(period = 'month') {
  const res = await rpc('get_leaderboard', { p_period: period })
  return { ...res, data: Array.isArray(res.data) ? res.data : res.data ? [] : null }
}

// write (insert or update) this user's own public card
export async function teamUpsertProfile(userId, card) {
  if (!isSupabaseConfigured || !userId || status === 'missing') return { error: { message: 'skip' } }
  try {
    const { error } = await supabase.from('pet_profiles').upsert({ user_id: userId, ...card }, { onConflict: 'user_id' })
    if (error && isMissing(error)) setStatus('missing')
    else if (!error) setStatus('ready')
    return { error: error || null }
  } catch (e) {
    return { error: e }
  }
}
