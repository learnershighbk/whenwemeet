import { useState } from 'react'
import {
  MAX_DAYS,
  type DateKey,
  monthWeeks,
  parseKey,
  rangeClick,
  todayKey,
  toggleDate,
} from '../lib/dates'

export type CalendarValue = {
  mode: 'pick' | 'range'
  dates: DateKey[]
  /** Range mode: start date picked, waiting for the end date */
  anchor: DateKey | null
}

type Props = {
  value: CalendarValue
  onChange: (value: CalendarValue) => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Calendar({ value, onChange }: Props) {
  const today = todayKey()
  const start = parseKey(value.dates[0] ?? today)
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [limitHit, setLimitHit] = useState(false)

  const now = parseKey(today)
  const atFirstMonth = view.year === now.getFullYear() && view.month === now.getMonth()
  const monthTitle = new Date(view.year, view.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function moveMonth(delta: number) {
    const d = new Date(view.year, view.month + delta)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  function pick(key: DateKey) {
    const result =
      value.mode === 'pick'
        ? { ...toggleDate(value.dates, key), anchor: null }
        : rangeClick({ dates: value.dates, anchor: value.anchor }, key)
    setLimitHit(result.error === 'limit')
    if (result.error) return
    onChange({ mode: value.mode, dates: result.dates, anchor: result.anchor })
  }

  function setMode(range: boolean) {
    setLimitHit(false)
    onChange({ mode: range ? 'range' : 'pick', dates: [], anchor: null })
  }

  const count = value.dates.length

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Which days?</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <span>Date range</span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={value.mode === 'range'}
            onChange={(e) => setMode(e.target.checked)}
          />
          <span className="relative h-5 w-9 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          disabled={atFirstMonth}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <span className="font-medium">{monthTitle}</span>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-line-soft"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {monthWeeks(view.year, view.month).flat().map((key, i) => {
          if (!key) return <div key={`pad-${i}`} />
          const past = key < today
          const selected = value.dates.includes(key)
          const isAnchor = value.anchor === key
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => pick(key)}
              aria-pressed={selected}
              aria-label={parseKey(key).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              className={[
                'mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-colors',
                past && 'cursor-not-allowed text-faint/60',
                !past && !selected && 'hover:bg-line-soft',
                selected && 'bg-brand font-medium text-white',
                isAnchor && 'ring-2 ring-brand ring-offset-2',
                key === today && !selected && 'font-semibold underline underline-offset-4',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {Number(key.slice(8))}
            </button>
          )
        })}
      </div>

      <div className="mt-3 min-h-5 text-sm" aria-live="polite">
        {limitHit ? (
          <span className="text-ink">You can pick up to {MAX_DAYS} days.</span>
        ) : count > 0 ? (
          <span className="text-muted">
            {count} {count === 1 ? 'day' : 'days'} selected
            {value.mode === 'range' && value.anchor && ' · Now pick the last day.'}
          </span>
        ) : null}
      </div>
    </div>
  )
}
