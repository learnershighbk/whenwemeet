// Date/time helpers for event input (specs/01-create-event). Pure functions only.

export const MAX_DAYS = 31
export const MAX_TITLE = 100

/** Output of the Create Event form, handed to the edit step */
export type EventDraft = {
  title: string // trimmed
  dates: DateKey[] // sorted
  startHour: number // 0–23
  endHour: number // 1–24
  timezone: string // IANA
}

/** 'YYYY-MM-DD' in local time */
export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now = new Date()): DateKey {
  return toKey(now)
}

/** All dates from a to b inclusive, in order. Swaps if b is before a. */
export function expandRange(a: DateKey, b: DateKey): DateKey[] {
  const [start, end] = a <= b ? [a, b] : [b, a]
  const out: DateKey[] = []
  const cur = parseKey(start)
  while (toKey(cur) <= end) {
    out.push(toKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export type SelectResult = { dates: DateKey[]; error?: 'limit' }

/** Pick-dates mode: toggle one date on or off. */
export function toggleDate(dates: DateKey[], key: DateKey): SelectResult {
  if (dates.includes(key)) return { dates: dates.filter((d) => d !== key) }
  if (dates.length >= MAX_DAYS) return { dates, error: 'limit' }
  return { dates: [...dates, key].sort() }
}

/** anchor !== null means the start date is picked and we are waiting for the end date. */
export type RangeState = { dates: DateKey[]; anchor: DateKey | null }

/** Date-range mode: first click sets the start, second click fills the range. */
export function rangeClick(state: RangeState, key: DateKey): RangeState & { error?: 'limit' } {
  if (state.anchor === null) return { dates: [key], anchor: key }
  const dates = expandRange(state.anchor, key)
  if (dates.length > MAX_DAYS) return { ...state, error: 'limit' }
  return { dates, anchor: null }
}

/** Weeks of a month for a Sunday-first calendar. null = padding cell. */
export function monthWeeks(year: number, month: number): (DateKey | null)[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (DateKey | null)[] = Array(first.getDay()).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  const weeks: (DateKey | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// ─── Hours ──────────────────────────────────────────────

export const FROM_HOURS = Array.from({ length: 24 }, (_, i) => i) // 0–23
export const TO_HOURS = Array.from({ length: 24 }, (_, i) => i + 1) // 1–24
export const DEFAULT_START_HOUR = 10
export const DEFAULT_END_HOUR = 16

/** 0 → '12:00 AM', 13 → '1:00 PM', 24 → '12:00 AM' (midnight) */
export function hourLabel(hour: number): string {
  const h = hour % 24
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`
}

/** Keeps end after start: if not, end becomes start + 1. */
export function adjustEndHour(start: number, end: number): number {
  return end > start ? end : start + 1
}

// ─── Time zones ─────────────────────────────────────────

export function listTimezones(): string[] {
  const zones = Intl.supportedValuesOf('timeZone')
  return zones.includes('UTC') ? zones : [...zones, 'UTC']
}

export function defaultTimezone(zones = listTimezones()): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return zones.includes(tz) ? tz : 'UTC'
}

/** 'GMT+9', 'GMT-4', 'GMT+5:30', or 'GMT' — offset on the given day */
export function gmtOffset(tz: string, at = new Date()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? 'GMT'
}

/** 'America/New_York' → 'America / New York (GMT-4)' */
export function timezoneLabel(tz: string, at = new Date()): string {
  return `${tz.split('/').join(' / ').replace(/_/g, ' ')} (${gmtOffset(tz, at)})`
}

export type TimezoneGroup = { group: string; zones: { id: string; label: string }[] }

/** Groups by continent (text before the first '/'), sorted. Zones without one go to 'Other'. */
export function buildTimezoneGroups(zones: string[], at = new Date()): TimezoneGroup[] {
  const groups = new Map<string, TimezoneGroup['zones']>()
  for (const id of zones) {
    const group = id.includes('/') ? id.split('/')[0] : 'Other'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push({ id, label: timezoneLabel(id, at) })
  }
  return [...groups.keys()].sort().map((group) => ({ group, zones: groups.get(group)! }))
}

/** Keeps zones whose label or id contains the query (case-insensitive). Drops empty groups. */
export function filterTimezoneGroups(groups: TimezoneGroup[], query: string): TimezoneGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((g) => ({
      ...g,
      zones: g.zones.filter((z) => z.label.toLowerCase().includes(q) || z.id.toLowerCase().includes(q)),
    }))
    .filter((g) => g.zones.length > 0)
}

export function groupTimezones(zones: string[], query = '', at = new Date()): TimezoneGroup[] {
  return filterTimezoneGroups(buildTimezoneGroups(zones, at), query)
}

// ─── Event header ───────────────────────────────────────

/** 'Oct 20 – Oct 24' (consecutive) · 'Tue, Oct 20' (one day) · '5 days' (gaps) */
export function summarizeDates(dates: DateKey[]): string {
  if (dates.length === 0) return ''
  const sorted = [...dates].sort()
  const fmt = (key: DateKey, opts: Intl.DateTimeFormatOptions) =>
    parseKey(key).toLocaleDateString('en-US', opts)
  if (sorted.length === 1) return fmt(sorted[0], { weekday: 'short', month: 'short', day: 'numeric' })
  const consecutive = expandRange(sorted[0], sorted[sorted.length - 1]).length === sorted.length
  if (consecutive) {
    return `${fmt(sorted[0], { month: 'short', day: 'numeric' })} – ${fmt(sorted[sorted.length - 1], { month: 'short', day: 'numeric' })}`
  }
  return `${sorted.length} days`
}
