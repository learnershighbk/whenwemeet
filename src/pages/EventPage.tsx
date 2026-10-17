import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import SignInForm from '../components/SignInForm'
import { type Event, getEvent, joinEvent } from '../lib/api'
import { hourLabel, summarizeDates, timezoneLabel } from '../lib/dates'
import { type Session, clearSession, loadSession, saveSession } from '../lib/session'

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'error' } | { status: 'ready'; event: Event }

export default function EventPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [session, setSession] = useState<Session | null>(() => loadSession(id))

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

  async function join(name: string, password: string) {
    const result = await joinEvent(id, name, password)
    saveSession(id, result)
    setSession(result)
  }

  function signOut() {
    clearSession(id)
    setSession(null)
  }

  if (state.status === 'loading') {
    return <Centered>Loading…</Centered>
  }
  if (state.status === 'missing') {
    return (
      <Centered>
        <p className="mb-4">This event doesn't exist. Check the link and try again.</p>
        <Link to="/" className="underline underline-offset-4">
          Plan a new meeting
        </Link>
      </Centered>
    )
  }
  if (state.status === 'error') {
    return (
      <Centered>
        <p className="mb-4">Couldn't load the event.</p>
        <button
          type="button"
          onClick={load}
          className="h-11 rounded-lg border border-line px-5 font-medium hover:border-muted"
        >
          Try again
        </button>
      </Centered>
    )
  }

  const { event } = state

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">{event.title}</h1>
        <p className="mt-1 text-muted">
          {summarizeDates(event.dates)} · {hourLabel(event.startHour)} – {hourLabel(event.endHour)}
        </p>
        <p className="text-sm text-muted">Times are in {timezoneLabel(event.timezone)}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* My column */}
        <section aria-label="My availability">
          {session ? (
            <div className="flex items-baseline justify-between gap-3">
              <p>
                Signed in as <span className="font-medium">{session.name}</span>
              </p>
              <button type="button" onClick={signOut} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
                Not you? Sign out
              </button>
            </div>
          ) : (
            <SignInForm onJoin={join} />
          )}
          {/* My availability grid — specs/04-availability */}
        </section>

        {/* Group column — specs/04-availability */}
        <section aria-label="Group availability" />
      </div>
    </main>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md px-4 py-24 text-center text-muted">{children}</main>
}
