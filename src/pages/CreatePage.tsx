import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import Calendar, { type CalendarValue } from '../components/Calendar'
import ConfirmDialog from '../components/ConfirmDialog'
import Grid from '../components/Grid'
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
import { createEvent } from '../lib/api'
import { type SlotKey, type SlotMinutes, allSlotKeys, buildSlots } from '../lib/slots'

type Step = 'form' | 'edit' | 'share'

export default function CreatePage() {
  const [step, setStep] = useState<Step>('form')
  const [title, setTitle] = useState('')
  const [calendar, setCalendar] = useState<CalendarValue>({ mode: 'pick', dates: [], anchor: null })
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR)
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR)
  const [timezone, setTimezone] = useState(defaultTimezone)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  const canCreate = title.trim().length > 0 && calendar.dates.length > 0

  function create() {
    if (!canCreate) return
    setDraft({ title: title.trim(), dates: calendar.dates, startHour, endHour, timezone })
    setStep('edit')
  }

  if (step === 'edit' && draft) {
    return (
      <EditStep
        draft={draft}
        onBack={() => setStep('form')}
        onCreated={(id) => {
          setEventId(id)
          setStep('share')
        }}
      />
    )
  }

  if (step === 'share' && eventId) return <ShareStep id={eventId} />

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Plan a meeting</h1>
      <p className="mb-8 text-muted">Pick the days and hours to ask about, then share one link.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
        className="card divide-y divide-line-soft"
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
            className="field h-11 w-full"
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
                className="field mt-1 h-11 w-full"
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
                className="field mt-1 h-11 w-full"
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
            className="btn-primary h-12 w-full"
          >
            Create Event
          </button>
        </section>
      </form>
    </main>
  )
}

// ─── Edit step (specs/02-finalize-event R2–R6) ───────────

function EditStep({ draft, onBack, onCreated }: {
  draft: EventDraft
  onBack: () => void
  onCreated: (id: string) => void
}) {
  const [slotMinutes, setSlotMinutes] = useState<SlotMinutes>(30)
  const [blocked, setBlocked] = useState<Set<SlotKey>>(new Set())
  const [pendingMinutes, setPendingMinutes] = useState<SlotMinutes | null>(null)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const rows = useMemo(() => buildSlots({ ...draft, slotMinutes }), [draft, slotMinutes])
  const allBlocked = blocked.size >= allSlotKeys(rows).length

  function chooseMinutes(m: SlotMinutes) {
    if (m === slotMinutes) return
    if (blocked.size > 0) setPendingMinutes(m)
    else setSlotMinutes(m)
  }

  async function finalize() {
    setSaving(true)
    setError('')
    try {
      const id = await createEvent(draft, slotMinutes, [...blocked].sort())
      onCreated(id)
    } catch {
      setSaving(false)
      setConfirmFinalize(false)
      setError("Couldn't create the event. Please try again.")
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight sm:text-3xl">Fine-tune your times</h1>
      <p className="mb-6 text-sm text-muted">
        {draft.title} · Times in {draft.timezone}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Slot size</span>
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5" role="group" aria-label="Slot size">
          {([30, 15] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={slotMinutes === m}
              onClick={() => chooseMinutes(m)}
              className={`h-9 rounded-md px-3 text-sm font-medium ${slotMinutes === m ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">Tap or drag to block times you don't need.</p>

      <div className="card p-3 sm:p-4">
        <Grid
          dates={draft.dates}
          rows={rows}
          slotMinutes={slotMinutes}
          mode="block"
          blocked={blocked}
          onBlockedChange={setBlocked}
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary h-12 px-5"
        >
          Back
        </button>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            disabled={allBlocked}
            onClick={() => setConfirmFinalize(true)}
            className="btn-primary h-12 px-6"
          >
            Finalize Event
          </button>
        </div>
      </div>
      <div className="mt-2 min-h-5 text-sm sm:text-right" aria-live="polite">
        {allBlocked ? (
          <span className="text-muted">Leave at least one open time slot.</span>
        ) : error ? (
          <span>{error}</span>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingMinutes !== null}
        message="Changing the slot size will clear blocked times."
        confirmLabel="Change"
        onCancel={() => setPendingMinutes(null)}
        onConfirm={() => {
          setBlocked(new Set())
          setSlotMinutes(pendingMinutes!)
          setPendingMinutes(null)
        }}
      />
      <ConfirmDialog
        open={confirmFinalize}
        message="Once finalized, the event can't be changed."
        confirmLabel="Finalize"
        busy={saving}
        busyLabel="Creating…"
        onCancel={() => setConfirmFinalize(false)}
        onConfirm={finalize}
      />
    </main>
  )
}

// ─── Share step (specs/02-finalize-event R7) ─────────────

function ShareStep({ id }: { id: string }) {
  const url = `${window.location.origin}/e/${id}`
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setManual(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      inputRef.current?.select()
      setManual(true)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <div className="card p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your event is ready!</h1>
      <p className="mb-6 text-muted">Send this link to your participants.</p>
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        aria-label="Event link"
        className="field mb-4 h-12 w-full font-mono text-sm"
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={copy}
          className="btn-primary h-12 flex-1 px-5"
        >
          {copied ? 'Link copied!' : 'Copy link'}
        </button>
        <Link
          to={`/e/${id}`}
          className="btn-secondary flex h-12 flex-1 items-center justify-center px-5"
        >
          Open event page
        </Link>
      </div>
      <p className="mt-3 min-h-5 text-sm text-muted" aria-live="polite">
        {manual && 'Press Ctrl+C to copy.'}
      </p>
      </div>
    </main>
  )
}
