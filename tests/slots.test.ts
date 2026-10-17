import { describe, expect, it } from 'vitest'
import {
  allSlotKeys,
  bestSlot,
  buildSlots,
  countBySlot,
  heatLevel,
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

// ─── Spec 04 aggregation ─────────────────────────────────

const rows3 = buildSlots({ dates, startHour: 10, endHour: 11, slotMinutes: 30 }) // 2 rows × 3 dates
const R = (participantId: string, name: string, slots: string[]) => ({ participantId, name, slots })

describe('countBySlot', () => {
  it('AC2: names per slot sorted case-insensitively, blocked slots omitted', () => {
    const responses = [
      R('1', 'bob', ['2026-10-20T10:00', '2026-10-21T10:00']),
      R('2', 'Alice', ['2026-10-20T10:00']),
      R('3', 'Chris', ['2026-10-21T10:00']),
    ]
    const counts = countBySlot(responses, new Set(['2026-10-21T10:00']))
    expect(counts.get('2026-10-20T10:00')).toEqual(['Alice', 'bob'])
    expect(counts.has('2026-10-21T10:00')).toBe(false)
    expect(counts.get('2026-10-22T10:00')).toBeUndefined()
  })
})

describe('bestSlot', () => {
  it('AC1: picks the most available slot; zero-slot people are unavailable', () => {
    const responses = [
      R('1', 'Alice', ['2026-10-20T10:00', '2026-10-21T10:30']),
      R('2', 'Ben', ['2026-10-21T10:30']),
      R('3', 'Chris', []),
    ]
    expect(bestSlot(rows3, responses, new Set())).toEqual({
      key: '2026-10-21T10:30',
      available: ['Alice', 'Ben'],
      unavailable: ['Chris'],
    })
  })
  it('AC1: ties go to the earliest date, then the earliest time', () => {
    const responses = [R('1', 'Alice', ['2026-10-22T10:00', '2026-10-20T10:30', '2026-10-20T10:00'])]
    expect(bestSlot(rows3, responses, new Set())?.key).toBe('2026-10-20T10:00')
    const laterOnly = [R('1', 'Alice', ['2026-10-21T10:00', '2026-10-20T10:30'])]
    expect(bestSlot(rows3, laterOnly, new Set())?.key).toBe('2026-10-20T10:30')
  })
  it('AC1: blocked slots are skipped even when they have the most people', () => {
    const responses = [
      R('1', 'Alice', ['2026-10-20T10:00', '2026-10-21T10:00']),
      R('2', 'Ben', ['2026-10-20T10:00']),
    ]
    const best = bestSlot(rows3, responses, new Set(['2026-10-20T10:00']))
    expect(best?.key).toBe('2026-10-21T10:00')
    expect(best?.unavailable).toEqual(['Ben'])
  })
  it('AC1: null when nobody picked anything', () => {
    expect(bestSlot(rows3, [], new Set())).toBeNull()
    expect(bestSlot(rows3, [R('1', 'Alice', [])], new Set())).toBeNull()
    expect(bestSlot(rows3, [R('1', 'Alice', ['2026-10-20T10:00'])], new Set(['2026-10-20T10:00']))).toBeNull()
  })
})

describe('heatLevel', () => {
  it('maps ratio to 0–5 with inclusive upper bounds', () => {
    expect(heatLevel(0, 7)).toBe(0)
    expect(heatLevel(3, 0)).toBe(0)
    expect(heatLevel(1, 5)).toBe(1) // 0.2
    expect(heatLevel(2, 5)).toBe(2) // 0.4
    expect(heatLevel(3, 5)).toBe(3) // 0.6
    expect(heatLevel(4, 5)).toBe(4) // 0.8
    expect(heatLevel(5, 5)).toBe(5)
    expect(heatLevel(1, 7)).toBe(1)
    expect(heatLevel(6, 7)).toBe(5)
    expect(heatLevel(1, 1)).toBe(5)
  })
})
