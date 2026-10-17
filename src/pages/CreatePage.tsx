import { useState } from 'react'
import Calendar, { type CalendarValue } from '../components/Calendar'
import TimezoneSelect from '../components/TimezoneSelect'
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  type EventDraft,
  FROM_HOURS,
  MAX_TITLE,
  TO_HOURS,
  adjustEndHour,
  defaultTimezone,
  hourLabel,
} from '../lib/dates'

type Step = 'form' | 'edit'

export default function CreatePage() {
  const [step, setStep] = useState<Step>('form')
  const [title, setTitle] = useState('')
  const [calendar, setCalendar] = useState<CalendarValue>({ mode: 'pick', dates: [], anchor: null })
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR)
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR)
  const [timezone, setTimezone] = useState(defaultTimezone)
  const [draft, setDraft] = useState<EventDraft | null>(null)

  const canCreate = title.trim().length > 0 && calendar.dates.length > 0

  function create() {
    if (!canCreate) return
    setDraft({ title: title.trim(), dates: calendar.dates, startHour, endHour, timezone })
    setStep('edit')
  }

  if (step === 'edit' && draft) {
    // Temporary edit step — replaced by the grid editor in specs/02-finalize-event
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Fine-tune your times</h1>
        <dl className="mb-8 space-y-1 text-sm">
          <div><dt className="inline text-muted">Event: </dt><dd className="inline">{draft.title}</dd></div>
          <div><dt className="inline text-muted">Days: </dt><dd className="inline">{draft.dates.join(', ')}</dd></div>
          <div><dt className="inline text-muted">Times: </dt><dd className="inline">{hourLabel(draft.startHour)} – {hourLabel(draft.endHour)}</dd></div>
          <div><dt className="inline text-muted">Time zone: </dt><dd className="inline">{draft.timezone}</dd></div>
        </dl>
        <button
          type="button"
          onClick={() => setStep('form')}
          className="h-11 rounded-lg border border-line px-5 font-medium hover:border-muted"
        >
          Back
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="mb-8 text-2xl font-semibold sm:text-3xl">Plan a meeting</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
        className="divide-y divide-line rounded-xl border border-line"
      >
        <section className="p-4 sm:p-6">
          <label htmlFor="title" className="mb-2 block font-medium">
            Event name
          </label>
          <input
            id="title"
            value={title}
            maxLength={MAX_TITLE}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly team sync"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-line px-3 placeholder:text-muted/60 focus:border-muted focus:outline-none"
          />
        </section>

        <section className="p-4 sm:p-6">
          <Calendar value={calendar} onChange={setCalendar} />
        </section>

        <section className="p-4 sm:p-6">
          <h2 className="mb-3 font-medium">What times?</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="text-sm text-muted">
              From
              <select
                value={startHour}
                onChange={(e) => {
                  const start = Number(e.target.value)
                  setStartHour(start)
                  setEndHour((end) => adjustEndHour(start, end))
                }}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink focus:border-muted focus:outline-none"
              >
                {FROM_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              To
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink focus:border-muted focus:outline-none"
              >
                {TO_HOURS.map((h) => (
                  <option key={h} value={h} disabled={h <= startHour}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label htmlFor="timezone" className="mb-1 block text-sm text-muted">
            Time zone
          </label>
          <TimezoneSelect id="timezone" value={timezone} onChange={setTimezone} />
        </section>

        <section className="p-4 sm:p-6">
          <button
            type="submit"
            disabled={!canCreate}
            className="h-12 w-full rounded-lg bg-ink font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            Create Event
          </button>
        </section>
      </form>
    </main>
  )
}
