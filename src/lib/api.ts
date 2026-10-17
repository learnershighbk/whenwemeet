// All Supabase calls live here (CLAUDE.md). Components never call supabase directly.

import type { DateKey, EventDraft } from './dates'
import type { Response, SlotKey, SlotMinutes } from './slots'
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

/** Loads one event via RPC get_event. Resolves to null when the id doesn't exist. Throws on network/server errors. */
export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase.rpc('get_event', { p_id: id })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as EventRow | undefined
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    dates: row.dates,
    startHour: row.start_hour,
    endHour: row.end_hour,
    timezone: row.timezone,
    slotMinutes: row.slot_minutes,
    blockedSlots: row.blocked_slots ?? [],
  }
}

type EventRow = {
  id: string
  title: string
  dates: DateKey[]
  start_hour: number
  end_hour: number
  timezone: string
  slot_minutes: SlotMinutes
  blocked_slots: SlotKey[] | null
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
  return { participantId: row.participant_id, token: row.token, name: row.display_name ?? name }
}

export type SaveErrorCode = 'not_allowed' | 'unknown'

export class SaveError extends Error {
  constructor(public code: SaveErrorCode) {
    super(code)
  }
}

type AvailabilityRow = { participant_id: string; name: string; slots: SlotKey[] | null }

const toResponse = (row: AvailabilityRow): Response => ({
  participantId: row.participant_id,
  name: row.name,
  slots: row.slots ?? [],
})

/** Every response for the event — one row per participant, including those with no slots yet. */
export async function listAvailability(eventId: string): Promise<Response[]> {
  const { data, error } = await supabase.rpc('list_availability', { p_event_id: eventId })
  if (error) throw error
  return ((data ?? []) as AvailabilityRow[]).map(toResponse)
}

/** Saves the participant's slots via RPC save_availability. Throws SaveError('not_allowed') on a bad token. */
export async function saveAvailability(participantId: string, token: string, slots: SlotKey[]): Promise<void> {
  const { error } = await supabase.rpc('save_availability', {
    p_participant_id: participantId,
    p_token: token,
    p_slots: slots,
  })
  if (error) throw new SaveError(error.message.includes('not_allowed') ? 'not_allowed' : 'unknown')
}

export type AvailabilityChange =
  | { type: 'upsert'; response: Response }
  | { type: 'delete'; participantId: string }

export type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

type BroadcastPayload = {
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  record: AvailabilityRow | null
  old_record: AvailabilityRow | null
}

/**
 * Realtime changes to the event's availability rows, over the private broadcast topic `event:<id>`
 * (fed by the availability_broadcast trigger in 002_security.sql). Returns an unsubscribe function.
 * supabase-js reconnects on its own; onStatus reports each transition so the caller can reload on SUBSCRIBED.
 */
export function subscribeAvailability(
  eventId: string,
  onChange: (change: AvailabilityChange) => void,
  onStatus: (status: ChannelStatus) => void,
): () => void {
  const channel = supabase
    .channel(`event:${eventId}`, { config: { private: true } })
    .on('broadcast', { event: '*' }, ({ payload }) => {
      const p = payload as BroadcastPayload
      if (p.operation === 'DELETE') {
        if (p.old_record?.participant_id) onChange({ type: 'delete', participantId: p.old_record.participant_id })
        return
      }
      if (p.record) onChange({ type: 'upsert', response: toResponse(p.record) })
    })
    .subscribe((status) => onStatus(status as ChannelStatus))
  return () => {
    supabase.removeChannel(channel)
  }
}
