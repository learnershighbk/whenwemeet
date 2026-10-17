import { useEffect, useRef } from 'react'
import type { DateKey } from '../lib/dates'
import { type SlotKey, type SlotMinutes, type SlotRow, dateHeader, rowLabel, slotRangeLabel } from '../lib/slots'

type Props = {
  dates: DateKey[]
  rows: SlotRow[]
  slotMinutes: SlotMinutes
  mode: 'block'
  blocked: Set<SlotKey>
  onBlockedChange: (next: Set<SlotKey>) => void
}

const HATCH = 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.08) 4px 6px)'

export default function Grid({ dates, rows, slotMinutes, blocked, onBlockedChange }: Props) {
  // Drag painting: every cell touched during one drag gets the same state as the first one
  const paint = useRef<{ on: boolean; set: Set<SlotKey> } | null>(null)
  const latest = useRef(blocked)
  latest.current = blocked

  useEffect(() => {
    const stop = () => (paint.current = null)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  function apply(key: SlotKey) {
    const p = paint.current
    if (!p || p.set.has(key) === p.on) return
    p.set = new Set(p.set)
    if (p.on) p.set.add(key)
    else p.set.delete(key)
    onBlockedChange(p.set)
  }

  function onPointerDown(e: React.PointerEvent, key: SlotKey) {
    if (e.button !== 0) return
    e.preventDefault()
    // Let pointermove reach whatever cell is under the finger
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
    const next = new Set(blocked)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onBlockedChange(next)
  }

  const rowHeight = slotMinutes === 30 ? 24 : 16
  const columns = `2.75rem repeat(${dates.length}, minmax(var(--cell-w), 120px))`

  return (
    <div className="overflow-x-auto overscroll-x-contain [--cell-w:40px] sm:[--cell-w:48px]">
      <div className="grid w-max min-w-full" style={{ gridTemplateColumns: columns }}>
        {/* Header */}
        <div className="sticky left-0 z-10 bg-white" />
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
                className="sticky left-0 z-10 bg-white pr-1 text-right text-[11px] leading-none text-muted"
                style={{ height: rowHeight }}
              >
                <span className="relative -top-1.5">{rowLabel(row.minute)}</span>
              </div>
              {row.slots.map((slot, c) => {
                const isBlocked = blocked.has(slot.key)
                return (
                  <button
                    key={slot.key}
                    type="button"
                    data-slot={slot.key}
                    aria-pressed={isBlocked}
                    aria-label={`${slotRangeLabel(slot.key, slotMinutes)}${isBlocked ? ', blocked' : ''}`}
                    onPointerDown={(e) => onPointerDown(e, slot.key)}
                    onPointerMove={onPointerMove}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        toggle(slot.key)
                      }
                    }}
                    className={[
                      'touch-none select-none border-line focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink',
                      'border-l border-t',
                      c === row.slots.length - 1 && 'border-r',
                      r === rows.length - 1 && 'border-b',
                      isBlocked ? 'bg-blocked' : 'bg-white hover:bg-line/40',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      height: rowHeight,
                      borderTopStyle: onHour || r === 0 ? 'solid' : 'dashed',
                      backgroundImage: isBlocked ? HATCH : undefined,
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
