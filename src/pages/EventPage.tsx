import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import BestTime from '../components/BestTime'
import Grid from '../components/Grid'
import HeatLegend from '../components/HeatLegend'
import PageHeader, { PageBody } from '../components/PageHeader'
import SignInForm from '../components/SignInForm'
import SlotDetail from '../components/SlotDetail'
import { useEventRealtime } from '../hooks/useEventRealtime'
import { type Event, SaveError, getEvent, joinEvent, saveAvailability } from '../lib/api'
import { hourLabel, summarizeDates, timezoneLabel } from '../lib/dates'
import { type Session, clearSession, loadSession, saveSession } from '../lib/session'
import { type SlotKey, bestSlot, buildSlots, countBySlot, slotRangeLabel } from '../lib/slots'

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ready'; event: Event }

export default function EventPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const event = await getEvent(id)
      setState(event ? { status: 'ready', event } : { status: 'missing' })
    } catch {
      setState({ status: 'error' })
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (state.status === 'loading') return <Centered>Loading…</Centered>
  if (state.status === 'missing') {
    return (
      <Centered>
        <p className="mb-4">This event doesn't exist. Check the link and try again.</p>
        <Link to="/" className="btn-link">
          Plan a new meeting
        </Link>
      </Centered>
    )
  }
  if (state.status === 'error') {
    return (
      <Centered>
        <p className="mb-4">Couldn't load the event.</p>
        <button type="button" onClick={load} className="btn-secondary h-11 px-5">
          Try again
        </button>
      </Centered>
    )
  }
  return <EventBody event={state.event} />
}

// ─── Event body: sign-in, my grid, group heatmap, best time, realtime ───

function EventBody({ event }: { event: Event }) {
  const [session, setSession] = useState<Session | null>(() => loadSession(event.id))
  const [signInNote, setSignInNote] = useState('')
  const { responses, status } = useEventRealtime(event.id)

  const rows = useMemo(() => buildSlots(event), [event])
  const blocked = useMemo(() => new Set<SlotKey>(event.blockedSlots), [event])
  const counts = useMemo(() => countBySlot(responses, blocked), [responses, blocked])
  const best = useMemo(() => bestSlot(rows, responses, blocked), [rows, responses, blocked])
  const total = responses.length
  const names = useMemo(
    () => responses.map((r) => r.name).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
    [responses],
  )

  // My availability — local state wins over the server copy (R3)
  const [selected, setSelected] = useState<Set<SlotKey>>(new Set())
  const seeded = useRef<string | null>(null)
  useEffect(() => {
    if (!session || status !== 'live' || seeded.current === session.participantId) return
    const mine = responses.find((r) => r.participantId === session.participantId)
    setSelected(new Set(mine?.slots ?? []))
    seeded.current = session.participantId
  }, [session, status, responses])

  function expire() {
    clearSession(event.id)
    setSession(null)
    seeded.current = null
    setSignInNote('Please sign in again.')
  }

  const save = useAutosave(session, expire)

  async function join(name: string, password: string) {
    const result = await joinEvent(event.id, name, password)
    saveSession(event.id, result)
    setSignInNote('')
    setSession(result)
  }

  function signOut() {
    clearSession(event.id)
    setSession(null)
    seeded.current = null
    setSelected(new Set())
    save.reset()
  }

  function changeSelected(next: Set<SlotKey>) {
    setSelected(next)
    save.schedule([...next].sort())
  }

  // Cell detail: hover tooltip on fine pointers, tap/focus panel otherwise (R5)
  const finePointer = useMemo(() => window.matchMedia('(pointer: fine)').matches, [])
  const [hover, setHover] = useState<{ key: SlotKey; rect: DOMRect } | null>(null)
  const [activeCell, setActiveCell] = useState<SlotKey | null>(null)
  const detailFor = (key: SlotKey) => {
    const available = counts.get(key) ?? []
    const set = new Set(available)
    return {
      label: slotRangeLabel(key, event.slotMinutes),
      available,
      unavailable: names.filter((n) => !set.has(n)),
    }
  }

  return (
    <>
      <PageHeader
        title={event.title}
        meta={
          <>
            {summarizeDates(event.dates)} · {hourLabel(event.startHour)} – {hourLabel(event.endHour)} · Times are in{' '}
            {timezoneLabel(event.timezone)}
          </>
        }
      >
        <dl className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
          <Stat label="Responses" value={String(total)} />
          <Stat label="Best time" value={best ? slotRangeLabel(best.key, event.slotMinutes).split(' · ')[1] : '—'} sub={best ? slotRangeLabel(best.key, event.slotMinutes).split(' · ')[0] : undefined} />
          <Stat label="Available" value={best ? `${best.available.length} of ${total}` : '—'} />
        </dl>
      </PageHeader>
      <PageBody>
      {status === 'reconnecting' && (
        <div role="status" className="mb-4 rounded-md border border-line bg-line-soft px-4 py-2 text-sm">
          Reconnecting…
        </div>
      )}

      <div className="mb-6">
        <BestTime best={best} total={total} slotMinutes={event.slotMinutes} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* My column */}
        <section aria-label="My availability" className="card">
          <div className="card-head">
            <h2 className="font-semibold">My availability</h2>
            {session && (
              <p className="truncate text-sm text-muted">
                <span className="font-medium text-ink">{session.name}</span>
                <span className="mx-1.5 text-line">|</span>
                <button type="button" onClick={signOut} className="btn-link text-sm">
                  Sign out
                </button>
              </p>
            )}
          </div>
          <div className="p-4 sm:p-6">
          {session ? (
            <>
              <p className="mb-3 text-sm text-muted">Tap or drag to mark when you're free.</p>
              <Grid
                dates={event.dates}
                rows={rows}
                slotMinutes={event.slotMinutes}
                blocked={blocked}
                mode="select"
                selected={selected}
                onSelectedChange={changeSelected}
              />
              <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">
                {save.state === 'saving' && 'Saving…'}
                {save.state === 'saved' && 'Saved'}
                {save.state === 'retrying' && "Couldn't save. Retrying…"}
                {save.state === 'failed' && (
                  <>
                    Couldn't save. Check your connection and try again.{' '}
                    <button type="button" onClick={save.retry} className="btn-link">
                      Retry
                    </button>
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              {signInNote && (
                <p role="alert" className="mb-3 text-sm">
                  {signInNote}
                </p>
              )}
              <SignInForm onJoin={join} />
            </>
          )}
          </div>
        </section>

        {/* Group column */}
        <section aria-label="Group availability" className="card">
          <div className="card-head">
            <h2 className="font-semibold">Group availability</h2>
            <span className="text-sm text-muted">Responses ({total})</span>
          </div>
          <div className="p-4 sm:p-6">
          <Grid
            dates={event.dates}
            rows={rows}
            slotMinutes={event.slotMinutes}
            blocked={blocked}
            mode="heatmap"
            counts={counts}
            total={total}
            highlight={best?.key ?? null}
            activeCell={activeCell}
            onCellHover={(key, rect) => finePointer && setHover(key && rect ? { key, rect } : null)}
            onCellTap={(key) => !finePointer && setActiveCell(key)}
            onCellFocus={setActiveCell}
          />
          <HeatLegend total={total} />

          {activeCell && total > 0 && (
            <div className="mt-4 rounded-md border border-line bg-line-soft/60 p-3">
              <SlotDetail {...detailFor(activeCell)} />
            </div>
          )}

          {total > 0 && (
            <p className="mt-4 text-sm text-muted">
              {names.map((n, i) => (
                <span key={n}>
                  {i > 0 && ' · '}
                  <span className={n === session?.name ? 'font-semibold text-ink' : undefined}>{n}</span>
                </span>
              ))}
            </p>
          )}
          </div>
        </section>
      </div>

      {hover && total > 0 && <Tooltip rect={hover.rect}>{<SlotDetail {...detailFor(hover.key)} />}</Tooltip>}
      </PageBody>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <dt className="eyebrow truncate">{label}</dt>
      <dd className="truncate text-base font-semibold tabular-nums sm:text-lg">{value}</dd>
      {sub && <dd className="truncate text-xs text-muted">{sub}</dd>}
    </div>
  )
}

// ─── Autosave: idle → saving(300ms debounce) → saved(2s) → idle; retry 2s × 5 → failed ───

type SaveState = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed'
const DEBOUNCE_MS = 300
const RETRY_MS = 2000
const MAX_RETRIES = 5

function useAutosave(session: Session | null, onExpired: () => void) {
  const [state, setState] = useState<SaveState>('idle')
  const pending = useRef<SlotKey[] | null>(null)
  const inFlight = useRef(false)
  const attempts = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const flush = useCallback(async () => {
    const s = sessionRef.current
    const slots = pending.current
    if (!s || !slots || inFlight.current) return
    pending.current = null
    inFlight.current = true
    // Result is only meaningful while the same participant is still signed in
    const stale = () => sessionRef.current?.participantId !== s.participantId
    try {
      await saveAvailability(s.participantId, s.token, slots)
      inFlight.current = false
      if (stale()) return
      attempts.current = 0
      if (pending.current) {
        void flush()
      } else {
        setState('saved')
        timer.current = setTimeout(() => setState((cur) => (cur === 'saved' ? 'idle' : cur)), 2000)
      }
    } catch (err) {
      inFlight.current = false
      if (stale()) {
        pending.current = null
        setState('idle')
        return
      }
      if (err instanceof SaveError && err.code === 'not_allowed') {
        pending.current = null
        setState('idle')
        onExpired()
        return
      }
      pending.current = pending.current ?? slots
      attempts.current += 1
      if (attempts.current >= MAX_RETRIES) {
        setState('failed')
      } else {
        setState('retrying')
        timer.current = setTimeout(() => void flush(), RETRY_MS)
      }
    }
  }, [onExpired])

  useEffect(() => clearTimer, [])

  return {
    state,
    schedule(slots: SlotKey[]) {
      pending.current = slots
      if (state === 'failed') attempts.current = 0
      setState('saving')
      clearTimer()
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS)
    },
    retry() {
      attempts.current = 0
      setState('saving')
      clearTimer()
      void flush()
    },
    reset() {
      clearTimer()
      pending.current = null
      attempts.current = 0
      setState('idle')
    },
  }
}

// ─── Small pieces ───

function Tooltip({ rect, children }: { rect: DOMRect; children: React.ReactNode }) {
  const width = 260
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)
  const above = rect.top > 140
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-md border border-line bg-card p-3 shadow-lg"
      style={{ width, left, top: above ? rect.top - 8 : rect.bottom + 8, transform: above ? 'translateY(-100%)' : undefined }}
    >
      {children}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md px-4 py-24 text-center text-muted">{children}</main>
}
