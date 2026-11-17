-- 003 — Audit log (LOG การใช้งาน): who added / edited / deleted what
--
-- Every INSERT / UPDATE / DELETE on products, stock_movements, import_batches and
-- profiles is recorded by a database trigger into public.audit_log, together with the
-- signed-in user who made it. Because it runs inside the database it catches changes
-- from every browser/device and can't be skipped from the app.
--
--   * only approved Admins can read the log (RLS); nobody can edit or delete entries
--     from the app (no INSERT/UPDATE/DELETE policies — only the trigger writes)
--   * UPDATEs that change nothing are not logged
--   * history starts when this file is run (earlier changes were never recorded)
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 002_auth_approval.sql (uses public.profiles and public.is_admin()).
-- Safe to re-run.

-- ---------- table ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,              -- auth.uid() of whoever made the change (null = SQL Editor / system)
  actor_username text,        -- snapshot of their username at that moment
  table_name text not null,   -- products | stock_movements | import_batches | profiles
  category text not null,     -- product | stock_in | stock_out | import | user
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  record_id text,
  record_label text,          -- product code / username / file name, for display
  product_code text,          -- set for products and stock movements (filter by รหัสสินค้า)
  changed_fields text[],      -- UPDATE only: columns whose value changed
  old_data jsonb,             -- row before (UPDATE / DELETE)
  new_data jsonb              -- row after (INSERT / UPDATE)
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index if not exists audit_log_product_code_idx on public.audit_log (product_code);
create index if not exists audit_log_category_idx on public.audit_log (category, created_at desc);

-- ---------- trigger ----------
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
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_new) n
     where n.key not in ('updated_at')
       and n.value is distinct from (v_old -> n.key);
    if v_changed is null then
      return null; -- nothing actually changed (e.g. re-syncing an unchanged product name)
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

  return null; -- AFTER trigger: return value is ignored
end;
$$;

revoke all on function public.audit_row_change() from public;

drop trigger if exists audit_products on public.products;
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_row_change();

drop trigger if exists audit_stock_movements on public.stock_movements;
create trigger audit_stock_movements
  after insert or update or delete on public.stock_movements
  for each row execute function public.audit_row_change();

drop trigger if exists audit_import_batches on public.import_batches;
create trigger audit_import_batches
  after insert or update or delete on public.import_batches
  for each row execute function public.audit_row_change();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();

-- ---------- RLS: approved Admins read; nobody writes from the app ----------
alter table public.audit_log enable row level security;

drop policy if exists "admin read audit log" on public.audit_log;
create policy "admin read audit log" on public.audit_log
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- ---------- Realtime (the log page shows new entries as they happen) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_log'
  ) then
    alter publication supabase_realtime add table public.audit_log;
  end if;
end $$;
