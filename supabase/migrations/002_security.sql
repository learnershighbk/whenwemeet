-- WhenWeMeet 002 — reads behind RPCs, private realtime channel, server-side slot validation
-- (code review F4 #1, #3, #9). Run once in Supabase SQL Editor after 001_init.sql.
--
-- Before: anyone with the public anon key could list every event and every participant.
-- After:  nothing is readable without knowing the event id; realtime goes over a private
--         broadcast topic `event:<id>` instead of postgres_changes.

-- ─── 1. Remove direct table reads ────────────────────────

drop policy if exists "events are readable" on public.events;
drop policy if exists "availability is readable" on public.availability;
alter publication supabase_realtime drop table public.availability;

-- ─── 2. Read RPCs (id = the secret) ──────────────────────

create or replace function public.get_event(p_id text)
returns table (
  id text, title text, dates date[], start_hour int, end_hour int,
  timezone text, slot_minutes int, blocked_slots text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.title, e.dates, e.start_hour, e.end_hour, e.timezone, e.slot_minutes, e.blocked_slots
  from events e where e.id = p_id
$$;

create or replace function public.list_availability(p_event_id text)
returns table (participant_id uuid, name text, slots text[])
language sql
stable
security definer
set search_path = public
as $$
  select a.participant_id, a.name, a.slots from availability a where a.event_id = p_event_id
$$;

grant execute on function public.get_event(text) to anon, authenticated;
grant execute on function public.list_availability(text) to anon, authenticated;

-- ─── 3. Slot key validation ──────────────────────────────
-- Keeps only keys shaped YYYY-MM-DDTHH:mm that fall on the event's dates, inside its
-- hours, aligned to its slot size. Compares dates as text so a malformed date never
-- raises a cast error. Returns sorted, de-duplicated keys.

create or replace function public.valid_slot_keys(e public.events, p_keys text[])
returns text[]
language sql
stable
set search_path = public
as $$
  with k as (
    select distinct key
    from unnest(coalesce(p_keys, '{}')) key
    where key ~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$'
  ),
  parsed as (
    select key,
           split_part(key, 'T', 1) as d,
           split_part(split_part(key, 'T', 2), ':', 1)::int * 60
             + split_part(split_part(key, 'T', 2), ':', 2)::int as minute
    from k
  )
  select coalesce(array_agg(key order by key), '{}')
  from parsed
  where d in (select to_char(x, 'YYYY-MM-DD') from unnest(e.dates) x)
    and minute >= e.start_hour * 60
    and minute <= e.end_hour * 60 - e.slot_minutes
    and minute % e.slot_minutes = 0
$$;

-- ─── 4. save_availability: validate keys, drop blocked ───

create or replace function public.save_availability(
  p_participant_id uuid,
  p_token          text,
  p_slots          text[]
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event events%rowtype;
  v_slots text[];
begin
  select e.* into v_event
  from participants pt join events e on e.id = pt.event_id
  where pt.id = p_participant_id and pt.token = p_token;

  if not found then
    raise exception 'not_allowed';
  end if;

  if cardinality(p_slots) > 2976 then
    raise exception 'too_many_slots';
  end if;

  select coalesce(array_agg(k order by k), '{}') into v_slots
  from unnest(valid_slot_keys(v_event, p_slots)) k
  where not (k = any (v_event.blocked_slots));

  update availability
  set slots = v_slots, updated_at = now()
  where participant_id = p_participant_id;
end;
$$;

-- ─── 5. create_event: no past dates, blocked keys must be on the grid ───

create or replace function public.create_event(
  p_title         text,
  p_dates         date[],
  p_start_hour    int,
  p_end_hour      int,
  p_timezone      text,
  p_slot_minutes  int,
  p_blocked_slots text[]
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_id  text;
  bytes   bytea;
  i       int;
  v_dates date[];
  shape   events%rowtype;
begin
  select array_agg(distinct d order by d) into v_dates from unnest(p_dates) d;

  -- one day of slack so a client just behind UTC midnight is not rejected
  if exists (select 1 from unnest(v_dates) d where d < current_date - 1) then
    raise exception 'past_date';
  end if;

  if cardinality(coalesce(p_blocked_slots, '{}')) > 2976 then
    raise exception 'too_many_slots';
  end if;

  shape.dates        := v_dates;
  shape.start_hour   := p_start_hour;
  shape.end_hour     := p_end_hour;
  shape.slot_minutes := p_slot_minutes;

  loop
    bytes  := gen_random_bytes(10);
    new_id := '';
    for i in 0..9 loop
      new_id := new_id || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from events where id = new_id);
  end loop;

  insert into events (id, title, dates, start_hour, end_hour, timezone, slot_minutes, blocked_slots)
  values (new_id, trim(p_title), v_dates, p_start_hour, p_end_hour, p_timezone, p_slot_minutes,
          valid_slot_keys(shape, p_blocked_slots));

  return new_id;
end;
$$;

-- ─── 6. join_event: also return the stored display name ───
-- (availability is no longer readable, so the client can't look it up itself)

drop function if exists public.join_event(text, text, text);

create function public.join_event(
  p_event_id text,
  p_name     text,
  p_password text default null
) returns table (participant_id uuid, token text, display_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name     text := trim(p_name);
  v_key      text := lower(trim(p_name));
  v_password text := nullif(p_password, '');
  p          participants%rowtype;
begin
  if v_name is null or char_length(v_name) not between 1 and 30 then
    raise exception 'invalid_name';
  end if;

  if not exists (select 1 from events e where e.id = p_event_id) then
    raise exception 'event_not_found';
  end if;

  select * into p from participants pt where pt.event_id = p_event_id and pt.name_key = v_key;

  if found then
    if p.password_hash is not null
       and (v_password is null or crypt(v_password, p.password_hash) <> p.password_hash) then
      raise exception 'wrong_password';
    end if;
    return query select p.id, p.token, a.name from availability a where a.participant_id = p.id;
    return;
  end if;

  if (select count(*) from participants pt where pt.event_id = p_event_id) >= 100 then
    raise exception 'event_full';
  end if;

  insert into participants (event_id, name_key, password_hash, token)
  values (
    p_event_id,
    v_key,
    case when v_password is null then null else crypt(v_password, gen_salt('bf')) end,
    encode(gen_random_bytes(24), 'hex')
  )
  returning * into p;

  insert into availability (participant_id, event_id, name)
  values (p.id, p_event_id, v_name);

  return query select p.id, p.token, v_name;
end;
$$;

grant execute on function public.join_event(text, text, text) to anon, authenticated;

-- ─── 7. Realtime: private broadcast topic per event ──────
-- A trigger broadcasts each availability change to `event:<id>`. Only clients that know
-- the id can subscribe (private channel + RLS on realtime.messages).

create or replace function public.availability_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'event:' || coalesce(new.event_id, old.event_id),
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end;
$$;

drop trigger if exists availability_broadcast on public.availability;
create trigger availability_broadcast
after insert or update or delete on public.availability
for each row execute function public.availability_broadcast();

drop policy if exists "event topics are readable" on realtime.messages;
create policy "event topics are readable" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() like 'event:%');
