-- 008 — Team pets, profiles, Supply Drops, Kudos and a fair Ranking (อันดับทีม)
--
-- What it adds (all cosmetic / motivational — nothing here touches stock, FIFO or reports):
--   * pet_profiles  : each user's public card — display name, title, frame, personal theme,
--                     "hide me from the ranking", and a snapshot of their pet (species, name,
--                     worn items, level). A user writes ONLY their own row.
--   * pet_activity  : one row per user per day — checked in, Supply Drops claimed, festival
--                     claims. Written ONLY by the functions below (server time + server caps),
--                     so a browser cannot award itself points.
--   * pet_kudos     : "ส่งกำลังใจ" — one per sender → receiver per day.
--   * get_leaderboard(period) : the ranking, computed on the server:
--       งานคลัง      — rows the user really added that still exist (stock in / out typed by
--                      hand, products, import files) from the audit log. Edits never count,
--                      deleted rows never count, at most 15 work units a day (an import
--                      file = 3 units). 2 points per unit.
--       Supply Drop — claims (server cap 6 a day, at least 8 minutes apart). 1 point each.
--       ความต่อเนื่อง — days checked in during the period. 3 points a day.
--       เทศกาล       — Supply Drops claimed on festival days (the festival is worked out
--                      on the server). 2 points each.
--     Hidden: anyone who chose "ซ่อนตัวจากอันดับ", users who are not approved, and the owner
--     account while it is in admin (stealth) mode (004).
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 002_auth_approval.sql, 003_audit_log.sql and 004_owner_stealth.sql
-- (005 is optional: without app_settings the festival bonus follows the calendar).
-- Safe to re-run. The app works without it (ranking shows "ยังไม่ได้ติดตั้ง").

-- ---------- tables ----------
create table if not exists public.pet_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 24),
  title text not null default '' check (char_length(title) <= 32),
  frame text not null default 'none' check (frame ~ '^[a-z0-9_-]{1,24}$'),
  skin text not null default 'geotech_classic' check (skin ~ '^[a-z0-9_-]{1,24}$'),
  hidden boolean not null default false,
  pet jsonb not null default '{}'::jsonb check (jsonb_typeof(pet) = 'object' and pg_column_size(pet) < 4096),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  checked_in boolean not null default false,
  supply_claims integer not null default 0 check (supply_claims between 0 and 6),
  festival_claims integer not null default 0 check (festival_claims between 0 and 6),
  last_claim_at timestamptz,
  primary key (user_id, day)
);
create index if not exists pet_activity_day_idx on public.pet_activity (day);

create table if not exists public.pet_kudos (
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  emoji text not null default '👏' check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day),
  check (from_user <> to_user)
);
create index if not exists pet_kudos_to_idx on public.pet_kudos (to_user, day);

-- ---------- RLS ----------
alter table public.pet_profiles enable row level security;
alter table public.pet_activity enable row level security;
alter table public.pet_kudos enable row level security;

drop policy if exists "own pet profile read" on public.pet_profiles;
create policy "own pet profile read" on public.pet_profiles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own pet profile insert" on public.pet_profiles;
create policy "own pet profile insert" on public.pet_profiles
  for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "own pet profile update" on public.pet_profiles;
create policy "own pet profile update" on public.pet_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_approved());

-- activity + kudos: read your own; every write goes through the functions below
drop policy if exists "own activity read" on public.pet_activity;
create policy "own activity read" on public.pet_activity
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own kudos read" on public.pet_kudos;
create policy "own kudos read" on public.pet_kudos
  for select to authenticated using (to_user = auth.uid() or from_user = auth.uid());

revoke insert, update, delete on public.pet_activity from anon, authenticated;
revoke insert, update, delete on public.pet_kudos from anon, authenticated;
revoke all on public.pet_profiles from anon;
grant select, insert, update on public.pet_profiles to authenticated;
grant select on public.pet_activity, public.pet_kudos to authenticated;

-- keep updated_at honest
create or replace function public.pet_profiles_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists pet_profiles_touch on public.pet_profiles;
create trigger pet_profiles_touch before insert or update on public.pet_profiles
  for each row execute function public.pet_profiles_touch();

-- ---------- helpers ----------
-- "today" for the company (Bangkok), whatever the server's time zone
create or replace function public.sts_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Bangkok')::date
$$;

-- which festival a date falls into — mirrors festivalForDate() in src/festival/festivals.js
create or replace function public.sts_festival_for(p_day date)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  m int := extract(month from p_day);
  d int := extract(day from p_day);
  v_anniv text;
  v_am int;
  v_ad int;
  v_date date;
begin
  begin
    select value into v_anniv from public.app_settings where key = 'company_anniversary';
  exception when undefined_table then v_anniv := null;
  end;
  if v_anniv ~ '^(\d{4}-)?\d{2}-\d{2}$' then
    v_am := split_part(right(v_anniv, 5), '-', 1)::int;
    v_ad := split_part(right(v_anniv, 5), '-', 2)::int;
    begin
      v_date := make_date(extract(year from p_day)::int, v_am, v_ad);
    exception when others then
      v_date := make_date(extract(year from p_day)::int, v_am, 28); -- 29 Feb in a common year
    end;
    if abs(p_day - v_date) <= 1 then return 'anniversary'; end if;
  end if;
  if m = 8 and d between 8 and 13 then return 'mothersday'; end if;
  if m = 12 and d between 1 and 6 then return 'fathersday'; end if;
  if m = 10 and d >= 18 then return 'halloween'; end if;
  if m = 11 and d between 8 and 28 then return 'loykrathong'; end if;
  if (m = 12 and d >= 30) or (m = 1 and d <= 2) then return 'newyear'; end if;
  if m = 12 and d >= 15 then return 'christmas'; end if;
  if (m = 1 and d >= 20) or (m = 2 and d <= 10) then return 'chinesenewyear'; end if;
  if m = 2 and d between 12 and 15 then return 'valentine'; end if;
  if m = 4 and d between 11 and 17 then return 'songkran'; end if;
  return 'none';
end;
$$;

-- the festival in force today: the admin's choice (005), else the calendar
create or replace function public.sts_festival_today()
returns text language plpgsql stable security definer set search_path = public as $$
declare v_mode text;
begin
  begin
    select value into v_mode from public.app_settings where key = 'festival_mode';
  exception when undefined_table then v_mode := null;
  end;
  if v_mode is null or v_mode = '' or v_mode = 'auto' then return public.sts_festival_for(public.sts_today()); end if;
  return v_mode;
end;
$$;

-- consecutive checked-in days ending today (or yesterday, if today not yet)
create or replace function public.pet_streak(p_user uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_day date := public.sts_today();
  v_n int := 0;
begin
  if not exists (select 1 from public.pet_activity where user_id = p_user and day = v_day and checked_in) then
    v_day := v_day - 1;
  end if;
  while exists (select 1 from public.pet_activity where user_id = p_user and day = v_day and checked_in) loop
    v_n := v_n + 1;
    v_day := v_day - 1;
    exit when v_n >= 3650;
  end loop;
  return v_n;
end;
$$;

-- ---------- daily check-in (เติมไฟ) ----------
create or replace function public.pet_checkin()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.sts_today();
  v_claims int;
begin
  if v_uid is null or not public.is_approved() then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  insert into public.pet_activity (user_id, day, checked_in) values (v_uid, v_today, true)
  on conflict (user_id, day) do update set checked_in = true;
  select supply_claims into v_claims from public.pet_activity where user_id = v_uid and day = v_today;
  return json_build_object(
    'ok', true,
    'streak', public.pet_streak(v_uid),
    'days', (select count(*) from public.pet_activity where user_id = v_uid and checked_in),
    'today_claims', coalesce(v_claims, 0),
    'cap', 6,
    'festival', public.sts_festival_today()
  );
end;
$$;

-- ---------- Supply Drop (จิ้มรับ EXP ตามเวลาทำงานจริง) ----------
-- Server rules: at most 6 a day, at least 8 minutes apart (server clock). The browser only
-- decides WHEN to show a drop (after real active time); it cannot claim more than this.
create or replace function public.claim_supply_drop()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.sts_today();
  v_row public.pet_activity%rowtype;
  v_fest text := public.sts_festival_today();
  v_is_fest boolean;
begin
  if v_uid is null or not public.is_approved() then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  v_is_fest := v_fest is not null and v_fest not in ('none', 'off', '');
  insert into public.pet_activity (user_id, day) values (v_uid, v_today) on conflict (user_id, day) do nothing;
  select * into v_row from public.pet_activity where user_id = v_uid and day = v_today for update;
  if v_row.supply_claims >= 6 then
    return json_build_object('ok', false, 'reason', 'cap', 'today_claims', v_row.supply_claims, 'cap', 6);
  end if;
  if v_row.last_claim_at is not null and v_row.last_claim_at > now() - interval '8 minutes' then
    return json_build_object('ok', false, 'reason', 'too_soon', 'today_claims', v_row.supply_claims, 'cap', 6,
      'wait_s', ceil(extract(epoch from (v_row.last_claim_at + interval '8 minutes' - now())))::int);
  end if;
  update public.pet_activity
     set supply_claims = supply_claims + 1,
         festival_claims = festival_claims + case when v_is_fest then 1 else 0 end,
         last_claim_at = now()
   where user_id = v_uid and day = v_today
   returning * into v_row;
  return json_build_object('ok', true, 'today_claims', v_row.supply_claims, 'cap', 6,
    'festival', case when v_is_fest then v_fest else null end);
end;
$$;

-- ---------- Kudos (ส่งกำลังใจ) ----------
create or replace function public.send_kudos(p_to uuid, p_emoji text default '👏')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.sts_today();
  v_count int;
begin
  if v_uid is null or not public.is_approved() then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  if p_to is null or p_to = v_uid then
    return json_build_object('ok', false, 'reason', 'self');
  end if;
  if not exists (
    select 1 from public.pet_profiles pp join public.profiles p on p.id = pp.user_id
     where pp.user_id = p_to and not pp.hidden and p.status = 'approved'
       and not (coalesce(p.is_owner, false) and coalesce(p.stealth, false))
  ) then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;
  insert into public.pet_kudos (from_user, to_user, day, emoji)
  values (v_uid, p_to, v_today, coalesce(nullif(left(p_emoji, 8), ''), '👏'))
  on conflict (from_user, to_user, day) do nothing;
  get diagnostics v_count = row_count;
  return json_build_object('ok', true, 'already', v_count = 0,
    'total', (select count(*) from public.pet_kudos where to_user = p_to));
end;
$$;

-- ---------- the ranking ----------
-- p_period: 'week' (last 7 days) | 'month' (this calendar month) | 'all'
create or replace function public.get_leaderboard(p_period text default 'month')
returns table (
  user_id uuid,
  username text,
  display_name text,
  title text,
  frame text,
  skin text,
  pet jsonb,
  work_units integer,
  work_pts integer,
  supply_pts integer,
  streak_pts integer,
  festival_pts integer,
  total integer,
  streak integer,
  kudos integer,
  kudos_today boolean,
  is_me boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_today date := public.sts_today();
  v_from date;
begin
  if v_uid is null or not public.is_approved() then
    return;
  end if;
  v_from := case p_period
    when 'week' then v_today - 6
    when 'all' then date '1900-01-01'
    else date_trunc('month', v_today)::date
  end;

  return query
  with members as (
    select pp.user_id, p.username, pp.display_name, pp.title, pp.frame, pp.skin, pp.pet
      from public.pet_profiles pp
      join public.profiles p on p.id = pp.user_id
     where p.status = 'approved'
       and not pp.hidden
       and not (coalesce(p.is_owner, false) and coalesce(p.stealth, false))
  ),
  -- rows each member really added that still exist (no edits, no deleted rows)
  work_rows as (
    select a.actor_id as uid,
           (a.created_at at time zone 'Asia/Bangkok')::date as day,
           case when a.table_name = 'import_batches' then 3 else 1 end as units
      from public.audit_log a
     where a.action = 'INSERT'
       and a.actor_id in (select m.user_id from members m)
       and (a.created_at at time zone 'Asia/Bangkok')::date between v_from and v_today
       and (
         (a.table_name = 'stock_movements'
            and coalesce(a.new_data ->> 'source', 'manual') = 'manual'
            and coalesce((a.new_data ->> 'is_opening_balance')::boolean, false) = false
            and exists (select 1 from public.stock_movements sm where sm.id::text = a.record_id))
         or (a.table_name = 'products'
            and exists (select 1 from public.products pr where pr.id::text = a.record_id))
         or (a.table_name = 'import_batches'
            and exists (select 1 from public.import_batches ib where ib.id::text = a.record_id))
       )
  ),
  work as (
    select w.uid, sum(least(w.day_units, 15))::int as units
      from (select uid, day, sum(units) as day_units from work_rows group by uid, day) w
     group by w.uid
  ),
  act as (
    select pa.user_id as uid,
           sum(pa.supply_claims)::int as claims,
           sum(pa.festival_claims)::int as fclaims,
           count(*) filter (where pa.checked_in)::int as days
      from public.pet_activity pa
     where pa.day between v_from and v_today
     group by pa.user_id
  ),
  kd as (
    select k.to_user as uid,
           count(*) filter (where k.day between v_from and v_today)::int as n,
           bool_or(k.from_user = v_uid and k.day = v_today) as mine_today
      from public.pet_kudos k
     group by k.to_user
  )
  select m.user_id, m.username, m.display_name, m.title, m.frame, m.skin, m.pet,
         coalesce(w.units, 0),
         coalesce(w.units, 0) * 2,
         coalesce(a.claims, 0),
         coalesce(a.days, 0) * 3,
         coalesce(a.fclaims, 0) * 2,
         coalesce(w.units, 0) * 2 + coalesce(a.claims, 0) + coalesce(a.days, 0) * 3 + coalesce(a.fclaims, 0) * 2,
         public.pet_streak(m.user_id),
         coalesce(kd.n, 0),
         coalesce(kd.mine_today, false),
         m.user_id = v_uid
    from members m
    left join work w on w.uid = m.user_id
    left join act a on a.uid = m.user_id
    left join kd on kd.uid = m.user_id
   order by 13 desc, 2 asc;
end;
$$;

revoke all on function public.pet_checkin() from public;
revoke all on function public.claim_supply_drop() from public;
revoke all on function public.send_kudos(uuid, text) from public;
revoke all on function public.get_leaderboard(text) from public;
revoke all on function public.pet_streak(uuid) from public;
revoke all on function public.sts_festival_for(date) from public;
revoke all on function public.sts_festival_today() from public;
grant execute on function public.pet_checkin() to authenticated;
grant execute on function public.claim_supply_drop() to authenticated;
grant execute on function public.send_kudos(uuid, text) to authenticated;
grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.sts_today() to authenticated;
