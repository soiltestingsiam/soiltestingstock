-- 002 — Supabase Auth + admin approval
--
-- Replaces the old browser-only login (users kept in each browser's localStorage, with
-- an "anon full access" policy on every table) with real Supabase Auth:
--   * every sign-up gets a profiles row with status = 'pending'
--   * only users whose profile is 'approved' can read/write products, stock_movements and
--     import_batches — the anon key alone no longer gives access to any data
--   * only approved Admins can see the user list and approve / reject / change roles
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS everywhere).
--
-- Also required (outside SQL): Authentication -> Providers -> Email -> turn OFF
-- "Confirm email". The app signs users in with a made-up address
-- (<username>@sts.local) that can't receive mail.
--
-- ---------------------------------------------------------------------------------
-- Setting up the FIRST admin (nobody can approve anyone until one exists):
--   1. Run this file.
--   2. Open the web app -> สมัครสมาชิก -> sign up with the admin's username/password.
--   3. Back here in SQL Editor, run (replace the username):
--        update public.profiles set role = 'Admin', status = 'approved'
--        where username = 'Jansogood1436';
--   4. Log in on the web app. Every later sign-up shows up under
--      ตั้งค่า -> ผู้ใช้งาน -> รออนุมัติ for that admin to approve.
-- ---------------------------------------------------------------------------------

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null default 'User' check (role in ('Admin', 'User')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz
);

-- usernames are unique regardless of case (login maps them to lowercase emails anyway)
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ---------- auto-create a 'pending' profile on sign-up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1)),
    'User',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- helper checks (security definer: they read profiles bypassing RLS,
-- so policies on profiles itself can call them without recursion) ----------
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved' and role = 'Admin'
  );
$$;

revoke all on function public.is_approved() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- guard rails on profile changes ----------
-- * nobody but an approved Admin may change role/status/username (RLS already limits
--   UPDATE to admins; this is a second lock in case a policy is loosened later)
-- * the system must always keep at least one approved Admin
-- * approved_by / approved_at are stamped automatically
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_admins integer;
  loses_admin boolean;
begin
  -- direct SQL Editor / service role sessions have no auth.uid(): always allowed (that's
  -- how the first admin is created)
  if tg_op = 'DELETE' then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'ไม่มีสิทธิ์ลบผู้ใช้งาน';
    end if;
    loses_admin := old.role = 'Admin' and old.status = 'approved';
  else
    if auth.uid() is not null and not public.is_admin()
       and (new.role is distinct from old.role
            or new.status is distinct from old.status
            or new.username is distinct from old.username) then
      raise exception 'ไม่มีสิทธิ์แก้ไขสิทธิ์หรือสถานะผู้ใช้งาน';
    end if;
    loses_admin := old.role = 'Admin' and old.status = 'approved'
                   and (new.role <> 'Admin' or new.status <> 'approved');
  end if;

  if loses_admin then
    select count(*) into remaining_admins
    from public.profiles
    where role = 'Admin' and status = 'approved' and id <> old.id;
    if remaining_admins = 0 then
      raise exception 'ระบบต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 คน';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update or delete on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- RLS: profiles ----------
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles" on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT policy (rows come only from the sign-up trigger) and no UPDATE policy for
-- ordinary users, so nobody can approve themselves or make themselves Admin.

-- ---------- RLS: data tables — approved users only ----------
drop policy if exists "anon full access" on public.products;
drop policy if exists "approved users full access" on public.products;
create policy "approved users full access" on public.products
  for all to authenticated
  using (public.is_approved())
  with check (public.is_approved());

drop policy if exists "anon full access" on public.stock_movements;
drop policy if exists "approved users full access" on public.stock_movements;
create policy "approved users full access" on public.stock_movements
  for all to authenticated
  using (public.is_approved())
  with check (public.is_approved());

drop policy if exists "anon full access" on public.import_batches;
drop policy if exists "approved users full access" on public.import_batches;
create policy "approved users full access" on public.import_batches
  for all to authenticated
  using (public.is_approved())
  with check (public.is_approved());

-- ---------- Realtime for profiles (admin's "รออนุมัติ" badge updates live) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
