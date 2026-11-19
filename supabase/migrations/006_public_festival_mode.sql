-- 006 — let the login page show the admin's festival theme
--
-- app_settings (005) is readable only by signed-in, approved users, so the login page
-- (nobody signed in yet) could only show each device's last-cached theme. This exposes
-- just the festival choice — a public, non-sensitive value — through one read-only
-- function. Nothing else in app_settings becomes visible, and nothing becomes writable.
--
-- Optional: without it the app still works (devices sync as soon as someone signs in).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 005_app_settings.sql. Safe to re-run.

create or replace function public.get_festival_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_settings where key = 'festival_mode'
$$;

revoke all on function public.get_festival_mode() from public;
grant execute on function public.get_festival_mode() to anon, authenticated;
