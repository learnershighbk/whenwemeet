import { Link } from 'react-router'
import PageHeader, { PageBody } from '../components/PageHeader'

const ORGANIZER_STEPS = [
  ['Name your event', 'Give the meeting a short name.'],
  ['Pick days and hours', 'Click the days you want to ask about, or switch to a date range. Set the hours and time zone.'],
  ['Fine-tune', 'Choose 30- or 15-minute slots and block any times you don’t need.'],
  ['Share the link', 'Finalize and send the link to your participants. That’s it.'],
]

const PARTICIPANT_STEPS = [
  ['Open the link', 'No account needed. Enter your name — add a password only if you want to lock your answer.'],
  ['Mark when you’re free', 'Tap or drag across the slots that work for you. Changes save automatically.'],
  ['See the best time', 'The group heatmap and the Best time card update live as people answer.'],
]

const FAQ = [
  ['Who can see my answer?', 'Anyone with the event link. Nothing is public or searchable — the link itself is the key.'],
  ['Can I change my answer later?', 'Yes. Open the same link, sign in with the same name, and edit your slots.'],
  ['Can the organizer edit the event?', 'No. Once finalized, the days and hours are fixed. Create a new event to change them.'],
  ['What time zone is shown?', 'The one the organizer picked. It’s shown under the event name.'],
]

export default function AboutPage() {
  return (
    <>
      <PageHeader width="md" title="About WhenWeMeet" meta="One link. Everyone marks when they're free. The best time shows up on its own." />
      <PageBody width="md">
      <p className="mb-8 text-lg text-muted">
        WhenWeMeet helps a group find the time that works for the most people. One person sets up the
        options, everyone marks when they&apos;re free, and the best time shows up on its own &mdash; no
        sign-ups, no back-and-forth.
      </p>

      <Steps title="If you're organizing" steps={ORGANIZER_STEPS} />
      <Steps title="If you're invited" steps={PARTICIPANT_STEPS} />

      <section className="card mb-10 p-5 sm:p-6">
        <p className="eyebrow mb-1">FAQ</p>
        <h2 className="mb-4 text-lg font-semibold">Good to know</h2>
        <dl className="space-y-4">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1 text-sm text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="text-center">
        <Link to="/" className="btn-primary inline-flex h-12 items-center px-6">
          Plan a meeting
        </Link>
      </div>
      </PageBody>
    </>
  )
}

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="card mb-6 p-5 sm:p-6">
      <p className="eyebrow mb-1">How it works</p>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <ol className="space-y-4">
        {steps.map(([heading, body], i) => (
          <li key={heading} className="flex gap-4">
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
            >
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{heading}</p>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
