import { useEffect, useRef } from 'react'
import type { DateKey } from '../lib/dates'
import {
  type SlotKey,
  type SlotMinutes,
  type SlotRow,
  dateHeader,
  heatLevel,
  rowLabel,
  slotRangeLabel,
} from '../lib/slots'

type Common = { dates: DateKey[]; rows: SlotRow[]; slotMinutes: SlotMinutes; blocked: Set<SlotKey> }

export type GridProps =
  | (Common & { mode: 'block'; onBlockedChange: (next: Set<SlotKey>) => void })
  | (Common & { mode: 'select'; selected: Set<SlotKey>; onSelectedChange: (next: Set<SlotKey>) => void })
  | (Common & {
      mode: 'heatmap'
      counts: Map<SlotKey, string[]>
      total: number
      /** Best time cell — green outline */
      highlight?: SlotKey | null
      /** Cell chosen by tap/focus — for the detail panel */
      activeCell?: SlotKey | null
      onCellHover?: (key: SlotKey | null, rect: DOMRect | null) => void
      /** Pointer click/tap on a cell */
      onCellTap?: (key: SlotKey) => void
      /** Keyboard focus on a cell (:focus-visible only) */
      onCellFocus?: (key: SlotKey) => void
    })

const HATCH = 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.08) 4px 6px)'
const HEAT_BG = ['bg-card', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5']

export default function Grid(props: GridProps) {
  const { dates, rows, slotMinutes, blocked, mode } = props

  // Painting (block + select): every cell touched during one drag gets the state of the first cell
  const paintable = mode !== 'heatmap'
  const current = mode === 'block' ? props.blocked : mode === 'select' ? props.selected : null
  const emit = (next: Set<SlotKey>) => {
    if (props.mode === 'block') props.onBlockedChange(next)
    else if (props.mode === 'select') props.onSelectedChange(next)
  }
  const paint = useRef<{ on: boolean; set: Set<SlotKey> } | null>(null)
  const latest = useRef(current)
  latest.current = current

  useEffect(() => {
    const stop = () => (paint.current = null)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const skip = (key: SlotKey) => mode === 'select' && blocked.has(key)

  function apply(key: SlotKey) {
    const p = paint.current
    if (!p || skip(key) || p.set.has(key) === p.on) return
    p.set = new Set(p.set)
    if (p.on) p.set.add(key)
    else p.set.delete(key)
    emit(p.set)
  }

  function onPointerDown(e: React.PointerEvent, key: SlotKey) {
    if (!paintable || !latest.current || e.button !== 0 || skip(key)) return
    e.preventDefault()
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    paint.current = { on: !latest.current.has(key), set: latest.current }
    apply(key)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!paint.current) return
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-slot]')
    if (cell?.dataset.slot) apply(cell.dataset.slot)
  }

  function toggle(key: SlotKey) {
    if (!current || skip(key)) return
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    emit(next)
  }

  const rowHeight = slotMinutes === 30 ? 24 : 16
  // Width rule (docs/design.md §5, Spec 02 R2): columns share the available width when every
  // date fits at its minimum cell width; otherwise the grid grows to n × min width and scrolls.
  // clamp(min, 100%, max) resolves to `min` when min > max, which is exactly the overflow case.
  const n = dates.length
  const LABEL = '2.75rem'
  const gridWidth = `clamp(calc(${LABEL} + ${n} * var(--cell-w)), 100%, calc(${LABEL} + ${n} * var(--cell-max)))`
  const columns = `${LABEL} repeat(${n}, minmax(0, 1fr))`

  return (
    <div
      className="overflow-x-auto overscroll-x-contain [--cell-w:40px] [--cell-max:120px] sm:[--cell-w:48px]"
      onPointerLeave={() => props.mode === 'heatmap' && props.onCellHover?.(null, null)}
    >
      <div className="grid" style={{ width: gridWidth, gridTemplateColumns: columns }}>
        {/* Header */}
        <div className="sticky left-0 z-10 bg-card" />
        {dates.map((date) => {
          const { weekday, day } = dateHeader(date)
          return (
            <div key={date} className="px-1 pb-2 text-center leading-tight">
              <div className="text-xs text-muted">{weekday}</div>
              <div className="text-sm font-medium">{day}</div>
            </div>
          )
        })}

        {/* Body */}
        {rows.map((row, r) => {
          const onHour = row.minute % 60 === 0
          return (
            <div key={row.minute} className="contents">
              <div
                className="sticky left-0 z-10 bg-card pr-1 text-right text-[11px] leading-none text-muted"
                style={{ height: rowHeight }}
              >
                <span className="relative -top-1.5">{rowLabel(row.minute)}</span>
              </div>
              {row.slots.map((slot, c) => {
                const key = slot.key
                const isBlocked = blocked.has(key)
                const label = slotRangeLabel(key, slotMinutes)
                const edges = [
                  'border-l border-t border-line',
                  c === row.slots.length - 1 && 'border-r',
                  r === rows.length - 1 && 'border-b',
                ]
                const borderStyle = { borderTopStyle: onHour || r === 0 ? 'solid' : 'dashed' } as const

                if (props.mode === 'heatmap') {
                  const names = props.counts.get(key) ?? []
                  const level = isBlocked ? 0 : heatLevel(names.length, props.total)
                  const active = props.activeCell === key
                  const best = props.highlight === key
                  return (
                    <button
                      key={key}
                      type="button"
                      data-slot={key}
                      disabled={isBlocked}
                      aria-label={isBlocked ? `${label}, blocked` : `${label}, ${names.length} of ${props.total} available`}
                      onPointerEnter={(e) => !isBlocked && props.onCellHover?.(key, e.currentTarget.getBoundingClientRect())}
                      onClick={() => !isBlocked && props.onCellTap?.(key)}
                      onFocus={(e) => !isBlocked && e.currentTarget.matches(':focus-visible') && props.onCellFocus?.(key)}
                      className={[
                        ...edges,
                        'relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand',
                        isBlocked ? 'bg-blocked' : HEAT_BG[level],
                        best && 'z-10 outline-2 -outline-offset-2 outline-pick',
                        active && !best && 'z-10 outline-2 -outline-offset-2 outline-brand',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ height: rowHeight, ...borderStyle, backgroundImage: isBlocked ? HATCH : undefined }}
                    />
                  )
                }

                const on = current!.has(key)
                const disabled = mode === 'select' && isBlocked
                return (
                  <button
                    key={key}
                    type="button"
                    data-slot={key}
                    aria-pressed={on}
                    aria-disabled={disabled || undefined}
                    aria-label={
                      mode === 'block'
                        ? `${label}${on ? ', blocked' : ''}`
                        : isBlocked
                          ? `${label}, blocked`
                          : `${label}, ${on ? 'available' : 'not available'}`
                    }
                    onPointerDown={(e) => onPointerDown(e, key)}
                    onPointerMove={onPointerMove}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        toggle(key)
                      }
                    }}
                    className={[
                      ...edges,
                      'touch-none select-none focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand',
                      disabled && 'cursor-not-allowed',
                      mode === 'block' && (on ? 'bg-blocked' : 'bg-card hover:bg-line-soft'),
                      mode === 'select' && (isBlocked ? 'bg-blocked' : on ? 'bg-pick' : 'bg-card hover:bg-line-soft'),
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      height: rowHeight,
                      ...borderStyle,
                      backgroundImage: (mode === 'block' && on) || (mode === 'select' && isBlocked) ? HATCH : undefined,
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
