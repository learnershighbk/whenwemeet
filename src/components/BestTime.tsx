import { type SlotKey, type SlotMinutes, slotRangeLabel } from '../lib/slots'

type Props = {
  best: { key: SlotKey; available: string[]; unavailable: string[] } | null
  total: number
  slotMinutes: SlotMinutes
}

/** Best time card (specs/04-availability R6) */
export default function BestTime({ best, total, slotMinutes }: Props) {
  return (
    <section aria-label="Best time" className="rounded-xl border border-line p-4 sm:p-6">
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">Best time</h2>
      {best ? (
        <>
          <p className="text-lg font-semibold sm:text-xl">{slotRangeLabel(best.key, slotMinutes)}</p>
          <p className="mb-3 text-pick">
            {best.available.length} of {total} {total === 1 ? 'person' : 'people'} available
          </p>
          <p className="text-sm">
            <span className="text-muted">Available:</span> {best.available.join(', ')}
          </p>
          <p className="text-sm">
            <span className="text-muted">Not available:</span>{' '}
            {best.unavailable.length ? best.unavailable.join(', ') : '—'}
          </p>
        </>
      ) : (
        <p className="text-muted">No one has picked a time yet.</p>
      )}
    </section>
  )
}
