import { describe, expect, it } from 'vitest'
import {
  FROM_HOURS,
  MAX_DAYS,
  TO_HOURS,
  adjustEndHour,
  expandRange,
  groupTimezones,
  hourLabel,
  monthWeeks,
  rangeClick,
  timezoneLabel,
  toggleDate,
} from '../src/lib/dates'

describe('expandRange', () => {
  it('fills dates in order, across months', () => {
    expect(expandRange('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
    ])
  })
  it('swaps when end is before start', () => {
    expect(expandRange('2026-10-24', '2026-10-20')).toHaveLength(5)
  })
})

describe('toggleDate (pick dates)', () => {
  it('adds and removes, keeping order', () => {
    let r = toggleDate([], '2026-10-22')
    r = toggleDate(r.dates, '2026-10-20')
    expect(r.dates).toEqual(['2026-10-20', '2026-10-22'])
    expect(toggleDate(r.dates, '2026-10-20').dates).toEqual(['2026-10-22'])
  })
  it('AC6: refuses the 32nd date', () => {
    const full = expandRange('2026-11-01', '2026-12-01') // 31 days
    expect(full).toHaveLength(MAX_DAYS)
    const r = toggleDate(full, '2026-12-15')
    expect(r.error).toBe('limit')
    expect(r.dates).toHaveLength(MAX_DAYS)
  })
})

describe('rangeClick (date range)', () => {
  it('AC3: 10/24 then 10/20 selects 10/20–10/24', () => {
    let s = rangeClick({ dates: [], anchor: null }, '2026-10-24')
    expect(s).toEqual({ dates: ['2026-10-24'], anchor: '2026-10-24' })
    s = rangeClick(s, '2026-10-20')
    expect(s.dates).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'])
    expect(s.anchor).toBeNull()
  })
  it('a click after a finished range starts a new one', () => {
    const s = rangeClick({ dates: ['2026-10-20', '2026-10-21'], anchor: null }, '2026-11-05')
    expect(s).toEqual({ dates: ['2026-11-05'], anchor: '2026-11-05' })
  })
  it('AC6: refuses a range longer than 31 days', () => {
    const start = { dates: ['2026-11-01'], anchor: '2026-11-01' }
    expect(rangeClick(start, '2026-12-01').dates).toHaveLength(31)
    const tooLong = rangeClick(start, '2026-12-02')
    expect(tooLong.error).toBe('limit')
    expect(tooLong.dates).toEqual(['2026-11-01'])
    expect(tooLong.anchor).toBe('2026-11-01')
  })
})

describe('hours', () => {
  it('labels 12-hour times, 24 as midnight', () => {
    expect(hourLabel(0)).toBe('12:00 AM')
    expect(hourLabel(10)).toBe('10:00 AM')
    expect(hourLabel(12)).toBe('12:00 PM')
    expect(hourLabel(16)).toBe('4:00 PM')
    expect(hourLabel(24)).toBe('12:00 AM')
  })
  it('AC7: From/To lists and auto-adjusted end', () => {
    expect(FROM_HOURS[0]).toBe(0)
    expect(FROM_HOURS.at(-1)).toBe(23)
    expect(hourLabel(TO_HOURS.at(-1)!)).toBe('12:00 AM')
    expect(adjustEndHour(16, 16)).toBe(17)
    expect(adjustEndHour(17, 16)).toBe(18)
    expect(adjustEndHour(10, 16)).toBe(16)
    expect(adjustEndHour(23, 16)).toBe(24)
  })
})

describe('monthWeeks', () => {
  it('pads October 2026 (starts Thursday) to full weeks', () => {
    const weeks = monthWeeks(2026, 9)
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null])
    expect(weeks[0][4]).toBe('2026-10-01')
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
    weeks.forEach((w) => expect(w).toHaveLength(7))
  })
})

describe('time zones', () => {
  const january = new Date('2026-01-15T12:00:00Z')
  it('formats labels', () => {
    expect(timezoneLabel('Asia/Seoul', january)).toBe('Asia / Seoul (GMT+9)')
    expect(timezoneLabel('America/New_York', january)).toBe('America / New York (GMT-5)')
    expect(timezoneLabel('Asia/Kolkata', january)).toBe('Asia / Kolkata (GMT+5:30)')
  })
  it('AC8: search "york" finds New York, grouped by continent', () => {
    const groups = groupTimezones(['Asia/Seoul', 'America/New_York', 'Europe/London', 'UTC'], 'york', january)
    expect(groups).toEqual([
      { group: 'America', zones: [{ id: 'America/New_York', label: 'America / New York (GMT-5)' }] },
    ])
  })
  it('groups alphabetically; zones without a continent go to Other', () => {
    const groups = groupTimezones(['UTC', 'Europe/London', 'Asia/Seoul'], '', january)
    expect(groups.map((g) => g.group)).toEqual(['Asia', 'Europe', 'Other'])
  })
})
