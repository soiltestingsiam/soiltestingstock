-- 007 — ปิดปี / ล้างข้อมูลปีเก่า (Settings → ข้อมูลรายปี)
--
-- Lets an admin remove old years while every balance stays the same: in ONE transaction
--   1) the stock each item still holds at the end of the chosen year is written as ยอดยกมา
--      on 1 January of the next year (one row per FIFO cost layer, worked out by the app
--      and passed in as p_carry), under a new import-history entry, then
--   2) every movement dated on or before that year-end is deleted, and
--   3) import-history entries left with no rows are removed.
-- If anything fails nothing changes, so stock can never end up counted twice or lost.
-- Deleted rows are still copied into the audit log by the existing trigger (003).
--
-- Optional: only needed for "ปิดปีและล้างข้อมูลปีเก่า". Run once in the Supabase dashboard:
-- SQL Editor -> New query -> paste -> Run. Requires 002_auth_approval.sql (is_admin).
-- Safe to re-run.

create or replace function public.close_years(p_through date, p_carry jsonb, p_label text)
returns json
language plpgsql
security invoker            -- runs with the caller's own rights (row-level security applies)
set search_path = public
as $$
declare
  v_batch uuid;
  v_inserted integer := 0;
  v_deleted integer := 0;
  v_next_be integer;
begin
  if not public.is_admin() then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น' using errcode = '42501';
  end if;
  if p_through is null or p_through >= date_trunc('year', current_date)::date then
    raise exception 'ปิดได้เฉพาะปีที่ผ่านมาแล้ว' using errcode = '22023';
  end if;
  if p_carry is null or jsonb_typeof(p_carry) <> 'array' then
    raise exception 'p_carry ต้องเป็น JSON array' using errcode = '22023';
  end if;

  v_next_be := extract(year from p_through)::integer + 1 + 543;

  if jsonb_array_length(p_carry) > 0 then
    insert into public.import_batches (direction, year, file_name, row_count, new_product_count)
    values ('in', v_next_be, coalesce(nullif(p_label, ''), 'ยกยอดอัตโนมัติ'), jsonb_array_length(p_carry), 0)
    returning id into v_batch;

    insert into public.stock_movements
      (product_id, product_code, product_name, direction, is_opening_balance, qty, unit_price, total,
       movement_date, reference_year, source, import_batch_id, note, created_at)
    select nullif(r ->> 'product_id', '')::uuid,
           r ->> 'product_code',
           r ->> 'product_name',
           'in',
           true,
           (r ->> 'qty')::numeric,
           coalesce((r ->> 'unit_price')::numeric, 0),
           coalesce((r ->> 'total')::numeric, 0),
           p_through + 1,
           v_next_be,
           'import',
           v_batch,
           r ->> 'note',
           now() + (o * interval '1 microsecond')   -- keeps the FIFO layers in their order
      from jsonb_array_elements(p_carry) with ordinality as t(r, o);
    get diagnostics v_inserted = row_count;
  end if;

  delete from public.stock_movements where movement_date <= p_through;
  get diagnostics v_deleted = row_count;

  delete from public.import_batches b
   where (v_batch is null or b.id <> v_batch)
     and not exists (select 1 from public.stock_movements m where m.import_batch_id = b.id);

  return json_build_object('inserted', v_inserted, 'deleted', v_deleted);
end;
$$;

revoke all on function public.close_years(date, jsonb, text) from public;
grant execute on function public.close_years(date, jsonb, text) to authenticated;
