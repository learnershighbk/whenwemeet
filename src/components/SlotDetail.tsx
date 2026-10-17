type Props = {
  label: string
  available: string[]
  unavailable: string[]
}

/** Who can / can't make one slot. Shared by the hover tooltip and the tap panel (R5). */
export default function SlotDetail({ label, available, unavailable }: Props) {
  return (
    <div className="text-sm">
      <p className="mb-1 font-medium">{label}</p>
      <p>
        <span className="text-muted">Available ({available.length}):</span>{' '}
        {available.length ? available.join(', ') : '—'}
      </p>
      <p>
        <span className="text-muted">Not available ({unavailable.length}):</span>{' '}
        {unavailable.length ? unavailable.join(', ') : '—'}
      </p>
    </div>
  )
}
