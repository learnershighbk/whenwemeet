// All Supabase calls live here (CLAUDE.md). Components never call supabase directly.

import type { EventDraft } from './dates'
import type { SlotKey, SlotMinutes } from './slots'
import { supabase } from './supabase'

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
