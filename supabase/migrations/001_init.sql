-- WhenWeMeet initial schema (docs/architecture.md §4–5)
-- Run once in Supabase: SQL Editor > paste > Run

create extension if not exists pgcrypto with schema extensions;

-- ─── Tables ───────────────────────────────────────────────

create table public.events (
  id            text primary key,
  title         text not null check (char_length(title) between 1 and 100),
  dates         date[] not null check (cardinality(dates) between 1 and 31),
  start_hour    int  not null check (start_hour between 0 and 23),
  end_hour      int  not null check (end_hour between 1 and 24),
  timezone      text not null,
  slot_minutes  int  not null check (slot_minutes in (15, 30)),
  blocked_slots text[] not null default '{}',
  created_at    timestamptz not null default now(),
  check (end_hour > start_hour)
);

-- Private: never read directly by the client
create table public.participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null references public.events on delete cascade,
  name_key      text not null,
  password_hash text,
  token         text not null,
  created_at    timestamptz not null default now(),
  unique (event_id, name_key)
);

-- Public: heatmap source and realtime target
create table public.availability (
  participant_id uuid primary key references public.participants on delete cascade,
  event_id       text not null references public.events on delete cascade,
  name           text not null,
  slots          text[] not null default '{}',
  updated_at     timestamptz not null default now()
);

create index availability_event_id_idx on public.availability (event_id);

-- ─── Row Level Security ───────────────────────────────────
-- Reads: events + availability only. All writes go through the RPCs below.

alter table public.events       enable row level security;
alter table public.participants enable row level security;
alter table public.availability enable row level security;

create policy "events are readable" on public.events
  for select to anon, authenticated using (true);

create policy "availability is readable" on public.availability
  for select to anon, authenticated using (true);

-- ─── RPC: create_event ────────────────────────────────────

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
  new_id text;
  bytes  bytea;
  i      int;
begin
  loop
    bytes  := gen_random_bytes(10);
    new_id := '';
    for i in 0..9 loop
      new_id := new_id || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from events where id = new_id);
  end loop;

  insert into events (id, title, dates, start_hour, end_hour, timezone, slot_minutes, blocked_slots)
  values (
    new_id,
    trim(p_title),
    (select array_agg(distinct d order by d) from unnest(p_dates) d),
    p_start_hour,
    p_end_hour,
    p_timezone,
    p_slot_minutes,
    coalesce(p_blocked_slots, '{}')
  );

  return new_id;
end;
$$;

-- ─── RPC: join_event ──────────────────────────────────────
-- New name → create participant. Existing name without password → same person.
-- Existing name with password → password must match, else 'wrong_password'.

create or replace function public.join_event(
  p_event_id text,
  p_name     text,
  p_password text default null
) returns table (participant_id uuid, token text)
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
    return query select p.id, p.token;
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

  return query select p.id, p.token;
end;
$$;

-- ─── RPC: save_availability ───────────────────────────────
-- Requires the token from join_event. Blocked slots are dropped.

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

  update availability
  set slots = coalesce(
        (select array_agg(distinct s order by s)
         from unnest(p_slots) s
         where not (s = any (v_event.blocked_slots))),
        '{}'),
      updated_at = now()
  where participant_id = p_participant_id;
end;
$$;

grant execute on function public.create_event(text, date[], int, int, text, int, text[]) to anon, authenticated;
grant execute on function public.join_event(text, text, text) to anon, authenticated;
grant execute on function public.save_availability(uuid, text, text[]) to anon, authenticated;

-- ─── Realtime ─────────────────────────────────────────────

alter publication supabase_realtime add table public.availability;
