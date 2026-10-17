import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import Calendar, { type CalendarValue } from '../components/Calendar'
import ConfirmDialog from '../components/ConfirmDialog'
import Grid from '../components/Grid'
import PageHeader, { PageBody } from '../components/PageHeader'
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
  summarizeDates,
  timezoneLabel,
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

  const summary = (
    <aside className="card lg:sticky lg:top-6">
      <div className="card-head">
        <h2 className="font-semibold">Event summary</h2>
      </div>
      <dl className="divide-y divide-line-soft text-sm">
        <SummaryRow label="Event" value={title.trim() || '—'} />
        <SummaryRow
          label="Days"
          value={
            calendar.dates.length
              ? `${calendar.dates.length} ${calendar.dates.length === 1 ? 'day' : 'days'} · ${summarizeDates(calendar.dates)}`
              : '—'
          }
        />
        <SummaryRow label="Hours" value={`${hourLabel(startHour)} – ${hourLabel(endHour)}`} />
        <SummaryRow label="Time zone" value={timezoneLabel(timezone)} />
      </dl>
      <div className="px-4 py-4 sm:px-6">
        <button type="submit" form="create-form" disabled={!canCreate} className="btn-primary h-12 w-full">
          Create Event
        </button>
        {!canCreate && (
          <p className="mt-2 text-xs text-faint">Add an event name and pick at least one day.</p>
        )}
      </div>
    </aside>
  )

  return (
    <>
      <PageHeader
        width="lg"
        title="Plan a meeting"
        meta="Pick the days and hours to ask about, then share one link."
      />
      <PageBody width="lg">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            id="create-form"
            onSubmit={(e) => {
              e.preventDefault()
              create()
            }}
            className="card divide-y divide-line-soft"
          >
            <section className="p-4 sm:p-6">
              <p className="eyebrow mb-3">Event</p>
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
              <p className="eyebrow mb-3">Dates</p>
              <Calendar value={calendar} onChange={setCalendar} />
            </section>

            <section className="p-4 sm:p-6">
              <p className="eyebrow mb-3">Times</p>
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

            {/* Mobile: the submit lives here; desktop: in the summary panel */}
            <section className="p-4 sm:p-6 lg:hidden">
              <button type="submit" disabled={!canCreate} className="btn-primary h-12 w-full">
                Create Event
              </button>
            </section>
          </form>

          <div className="hidden lg:block">{summary}</div>
        </div>
      </PageBody>
    </>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-6">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
    <>
      <PageHeader
        width="lg"
        title="Fine-tune your times"
        meta={
          <>
            {draft.title} · {summarizeDates(draft.dates)} · {hourLabel(draft.startHour)} – {hourLabel(draft.endHour)} ·{' '}
            {timezoneLabel(draft.timezone)}
          </>
        }
      />
      <PageBody width="lg">

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Slot size</span>
        <div className="inline-flex rounded-md border border-line bg-card p-0.5" role="group" aria-label="Slot size">
          {([30, 15] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={slotMinutes === m}
              onClick={() => chooseMinutes(m)}
              className={`h-9 rounded px-3 text-sm font-medium ${slotMinutes === m ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
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
      </PageBody>
    </>
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
    <>
      <PageHeader width="md" title="Your event is ready!" meta="Send this link to your participants." />
      <PageBody width="md">
      <div className="card p-6 sm:p-8">
      <p className="eyebrow mb-2">Share link</p>
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
      </PageBody>
    </>
  )
}
