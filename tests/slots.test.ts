import { describe, expect, it } from 'vitest'
import {
  allSlotKeys,
  buildSlots,
  dateHeader,
  parseSlotKey,
  rowLabel,
  slotKey,
  slotRangeLabel,
} from '../src/lib/slots'

const dates = ['2026-10-20', '2026-10-21', '2026-10-22']

describe('buildSlots', () => {
  it('AC1: 10 AM–4 PM gives 12 rows at 30 min, 24 rows at 15 min', () => {
    const rows30 = buildSlots({ dates, startHour: 10, endHour: 16, slotMinutes: 30 })
    expect(rows30).toHaveLength(12)
    expect(rows30[0].slots.map((s) => s.key)).toEqual([
      '2026-10-20T10:00', '2026-10-21T10:00', '2026-10-22T10:00',
    ])
    expect(rows30.at(-1)!.slots[0].key).toBe('2026-10-20T15:30')
    expect(buildSlots({ dates, startHour: 10, endHour: 16, slotMinutes: 15 })).toHaveLength(24)
  })
  it('AC1: ending at midnight, last slot is 11:30 PM / 11:45 PM', () => {
    expect(buildSlots({ dates, startHour: 22, endHour: 24, slotMinutes: 30 }).at(-1)!.minute).toBe(23 * 60 + 30)
    expect(buildSlots({ dates, startHour: 22, endHour: 24, slotMinutes: 15 }).at(-1)!.minute).toBe(23 * 60 + 45)
  })
  it('lists every key', () => {
    const rows = buildSlots({ dates, startHour: 9, endHour: 10, slotMinutes: 30 })
    expect(allSlotKeys(rows)).toHaveLength(6)
  })
})

describe('keys', () => {
  it('round-trips', () => {
    expect(slotKey('2026-10-20', 14 * 60 + 15)).toBe('2026-10-20T14:15')
    expect(parseSlotKey('2026-10-20T14:15')).toEqual({ date: '2026-10-20', minute: 855 })
  })
})

describe('labels', () => {
  it('labels rows on the hour only', () => {
    expect(rowLabel(0)).toBe('12 AM')
    expect(rowLabel(10 * 60)).toBe('10 AM')
    expect(rowLabel(12 * 60)).toBe('12 PM')
    expect(rowLabel(10 * 60 + 30)).toBe('')
  })
  it('formats date headers', () => {
    expect(dateHeader('2026-10-20')).toEqual({ weekday: 'Tue', day: 'Oct 20' })
  })
  it('formats slot ranges', () => {
    expect(slotRangeLabel('2026-10-20T14:00', 30)).toBe('Tue, Oct 20 · 2:00–2:30 PM')
    expect(slotRangeLabel('2026-10-20T11:30', 30)).toBe('Tue, Oct 20 · 11:30 AM–12:00 PM')
    expect(slotRangeLabel('2026-10-20T23:45', 15)).toBe('Tue, Oct 20 · 11:45 PM–12:00 AM')
  })
})
