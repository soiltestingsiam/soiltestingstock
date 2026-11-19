-- 005 — app_settings: shared app-wide settings (currently the festival theme)
--
-- A tiny key/value table so the admin's choice of seasonal theme (ธีมเทศกาล) applies to
-- EVERYONE, live. Any approved user can read it; only admins can change it. Realtime is
-- on so a change the admin makes shows on every open device within seconds.
--
-- The app still works without this file: if the table is missing it simply falls back to
-- the per-device "อัตโนมัติ" mode (festival chosen from today's date).
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 002_auth_approval.sql (is_approved / is_admin). Safe to re-run.

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- stamp who changed it
create or replace function public.app_settings_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch
  before insert or update on public.app_settings
  for each row execute function public.app_settings_touch();

alter table public.app_settings enable row level security;

drop policy if exists "approved read settings" on public.app_settings;
create policy "approved read settings" on public.app_settings
  for select to authenticated using (public.is_approved());

drop policy if exists "admin write settings" on public.app_settings;
create policy "admin write settings" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- default: follow the calendar
insert into public.app_settings (key, value) values ('festival_mode', 'auto')
on conflict (key) do nothing;

-- realtime so every device updates when the admin changes it
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
