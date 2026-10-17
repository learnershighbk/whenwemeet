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

// ─── Availability (specs/04-availability R3, R8) ─────────

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
  const { data, error } = await supabase
    .from('availability')
    .select('participant_id, name, slots')
    .eq('event_id', eventId)
  if (error) throw error
  return (data as AvailabilityRow[]).map(toResponse)
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

/**
 * Realtime changes to the event's availability rows. Returns an unsubscribe function.
 * supabase-js reconnects on its own; onStatus reports each transition so the caller can reload on SUBSCRIBED.
 */
export function subscribeAvailability(
  eventId: string,
  onChange: (change: AvailabilityChange) => void,
  onStatus: (status: ChannelStatus) => void,
): () => void {
  const channel = supabase
    .channel(`event:${eventId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'availability', filter: `event_id=eq.${eventId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          // `old` carries only the primary key unless REPLICA IDENTITY FULL is set
          const id = (payload.old as Partial<AvailabilityRow>).participant_id
          if (id) onChange({ type: 'delete', participantId: id })
          return
        }
        onChange({ type: 'upsert', response: toResponse(payload.new as AvailabilityRow) })
      },
    )
    .subscribe((status) => onStatus(status as ChannelStatus))
  return () => {
    supabase.removeChannel(channel)
  }
}
