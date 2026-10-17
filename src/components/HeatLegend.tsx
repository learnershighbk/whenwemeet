const LEVELS = ['bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5']

/** Heatmap legend (specs/04-availability R4). Hidden when nobody has responded. */
export default function HeatLegend({ total }: { total: number }) {
  if (total === 0) return null
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-muted" aria-label="Heatmap legend">
      <span>0/{total} available</span>
      <div className="flex overflow-hidden rounded border border-line">
        <span className="h-3 w-5 bg-white" />
        {LEVELS.map((cls) => (
          <span key={cls} className={`h-3 w-5 ${cls}`} />
        ))}
      </div>
      <span>
        {total}/{total} available
      </span>
    </div>
  )
}
