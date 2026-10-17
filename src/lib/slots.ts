// Grid slot helpers (docs/architecture.md §3). Pure functions only.
// All times are wall-clock times in the event's time zone — no conversion.

import { type DateKey, parseKey } from './dates'

export type SlotMinutes = 15 | 30

/** 'YYYY-MM-DDTHH:mm' — the slot's start time */
export type SlotKey = string

export type Slot = { key: SlotKey; date: DateKey; minute: number }

/** One row per time, one cell per date */
export type SlotRow = { minute: number; slots: Slot[] }

type GridShape = { dates: DateKey[]; startHour: number; endHour: number; slotMinutes: SlotMinutes }

const pad = (n: number) => String(n).padStart(2, '0')

/** minute = minutes since 00:00 */
export function slotKey(date: DateKey, minute: number): SlotKey {
  return `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`
}

export function parseSlotKey(key: SlotKey): { date: DateKey; minute: number } {
  const [date, time] = key.split('T')
  const [h, m] = time.split(':').map(Number)
  return { date, minute: h * 60 + m }
}

export function buildSlots({ dates, startHour, endHour, slotMinutes }: GridShape): SlotRow[] {
  const rows: SlotRow[] = []
  for (let minute = startHour * 60; minute < endHour * 60; minute += slotMinutes) {
    rows.push({ minute, slots: dates.map((date) => ({ key: slotKey(date, minute), date, minute })) })
  }
  return rows
}

export function allSlotKeys(rows: SlotRow[]): SlotKey[] {
  return rows.flatMap((r) => r.slots.map((s) => s.key))
}

/** Row label: '10 AM', '12 PM' on the hour; '' otherwise */
export function rowLabel(minute: number): string {
  if (minute % 60 !== 0) return ''
  const h = (minute / 60) % 24
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
}

/** Column header: { weekday: 'Mon', day: 'Oct 20' } */
export function dateHeader(date: DateKey): { weekday: string; day: string } {
  const d = parseKey(date)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

function clock(minute: number): { text: string; period: 'AM' | 'PM' } {
  const h = Math.floor(minute / 60) % 24
  return { text: `${h % 12 === 0 ? 12 : h % 12}:${pad(minute % 60)}`, period: h < 12 ? 'AM' : 'PM' }
}

/** 'Mon, Oct 20 · 2:00–2:30 PM' / 'Mon, Oct 20 · 11:30 AM–12:00 PM' */
export function slotRangeLabel(key: SlotKey, slotMinutes: SlotMinutes): string {
  const { date, minute } = parseSlotKey(key)
  const { weekday, day } = dateHeader(date)
  const start = clock(minute)
  const end = clock(minute + slotMinutes)
  const range =
    start.period === end.period
      ? `${start.text}–${end.text} ${end.period}`
      : `${start.text} ${start.period}–${end.text} ${end.period}`
  return `${weekday}, ${day} · ${range}`
}

// ─── Aggregation (specs/04-availability R1) ─────────────

export type Response = { participantId: string; name: string; slots: SlotKey[] }

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' })

/** Per-slot available names, sorted. Blocked slots are left out of the Map entirely. */
export function countBySlot(responses: Response[], blocked: Set<SlotKey>): Map<SlotKey, string[]> {
  const map = new Map<SlotKey, string[]>()
  for (const r of responses) {
    for (const key of r.slots) {
      if (blocked.has(key)) continue
      const names = map.get(key)
      if (names) names.push(r.name)
      else map.set(key, [r.name])
    }
  }
  for (const names of map.values()) names.sort(byName)
  return map
}

/**
 * Slot with the most available people among non-blocked slots.
 * Ties → chronologically earliest (earliest date, then earliest time; slot keys sort that way).
 * null when every slot has 0.
 */
export function bestSlot(
  rows: SlotRow[],
  responses: Response[],
  blocked: Set<SlotKey>,
): { key: SlotKey; available: string[]; unavailable: string[] } | null {
  const counts = countBySlot(responses, blocked)
  let best: { key: SlotKey; available: string[] } | null = null
  for (const row of rows) {
    for (const slot of row.slots) {
      if (blocked.has(slot.key)) continue
      const available = counts.get(slot.key) ?? []
      if (available.length === 0) continue
      const better =
        !best ||
        available.length > best.available.length ||
        (available.length === best.available.length && slot.key < best.key)
      if (better) best = { key: slot.key, available }
    }
  }
  if (!best) return null
  const availableSet = new Set(best.available)
  const unavailable = responses
    .map((r) => r.name)
    .filter((n) => !availableSet.has(n))
    .sort(byName)
  return { ...best, unavailable }
}

/** 0 when nobody is available (or nobody has joined); otherwise 1–5 by ratio count/total in 20% steps */
export function heatLevel(count: number, total: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0 || total <= 0) return 0
  const r = count / total
  if (r <= 0.2) return 1
  if (r <= 0.4) return 2
  if (r <= 0.6) return 3
  if (r <= 0.8) return 4
  return 5
}
