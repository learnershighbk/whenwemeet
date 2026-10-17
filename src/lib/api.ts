// All Supabase calls live here (CLAUDE.md). Components never call supabase directly.

import type { DateKey, EventDraft } from './dates'
import type { SlotKey, SlotMinutes } from './slots'
import { supabase } from './supabase'

export type Event = {
  id: string
  title: string
  dates: DateKey[]
  startHour: number
  endHour: number
  timezone: string
  slotMinutes: SlotMinutes
  blockedSlots: SlotKey[]
}

/** Saves a finalized event via RPC create_event. Returns the new event id. */
export async function createEvent(
  draft: EventDraft,
  slotMinutes: SlotMinutes,
  blocked: SlotKey[],
): Promise<string> {
  const { data, error } = await supabase.rpc('create_event', {
    p_title: draft.title,
    p_dates: draft.dates,
    p_start_hour: draft.startHour,
    p_end_hour: draft.endHour,
    p_timezone: draft.timezone,
    p_slot_minutes: slotMinutes,
    p_blocked_slots: blocked,
  })
  if (error) throw error
  return data as string
}

/** Loads one event. Resolves to null when the id doesn't exist. Throws on network/server errors. */
export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, dates, start_hour, end_hour, timezone, slot_minutes, blocked_slots')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    title: data.title,
    dates: data.dates,
    startHour: data.start_hour,
    endHour: data.end_hour,
    timezone: data.timezone,
    slotMinutes: data.slot_minutes,
    blockedSlots: data.blocked_slots ?? [],
  }
}

export type JoinErrorCode = 'wrong_password' | 'invalid_name' | 'event_full' | 'event_not_found' | 'unknown'

export class JoinError extends Error {
  constructor(public code: JoinErrorCode) {
    super(code)
  }
}

const JOIN_CODES: JoinErrorCode[] = ['wrong_password', 'invalid_name', 'event_full', 'event_not_found']

/**
 * Signs a participant in via RPC join_event (specs/03-join-event R3–R4).
 * `name` in the result is the stored display name — the spelling used when the name was first registered.
 */
export async function joinEvent(
  eventId: string,
  name: string,
  password: string,
): Promise<{ participantId: string; token: string; name: string }> {
  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: eventId,
    p_name: name,
    p_password: password || null,
  })
  if (error) {
    const code = JOIN_CODES.find((c) => error.message.includes(c)) ?? 'unknown'
    throw new JoinError(code)
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.participant_id || !row?.token) throw new JoinError('unknown')

  const { data: av } = await supabase
    .from('availability')
    .select('name')
    .eq('participant_id', row.participant_id)
    .maybeSingle()
  return { participantId: row.participant_id, token: row.token, name: av?.name ?? name }
}
