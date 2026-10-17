import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTimezoneGroups, filterTimezoneGroups, listTimezones, timezoneLabel } from '../lib/dates'

type Props = {
  value: string
  onChange: (tz: string) => void
  id?: string
}

export default function TimezoneSelect({ value, onChange, id }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allGroups = useMemo(() => buildTimezoneGroups(listTimezones()), [])
  const groups = useMemo(() => filterTimezoneGroups(allGroups, query), [allGroups, query])
  const flat = useMemo(() => groups.flatMap((g) => g.zones), [groups])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Keep the active option visible
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function openList() {
    setQuery('')
    setActive(Math.max(0, allGroups.flatMap((g) => g.zones).findIndex((z) => z.id === value)))
    setOpen(true)
  }

  function choose(tz: string) {
    onChange(tz)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) choose(flat[active].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  let index = -1

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex h-11 w-full items-center justify-between text-left hover:border-muted"
      >
        <span className="truncate">{timezoneLabel(value)}</span>
        <span className="ml-2 text-muted" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-line bg-card shadow-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Search city or region"
              aria-label="Search time zones"
              className="field h-10 w-full text-sm"
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {groups.length === 0 && <p className="px-3 py-2 text-sm text-muted">No matches.</p>}
            {groups.map((g) => (
              <div key={g.group}>
                <div className="sticky top-0 bg-card px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-faint">
                  {g.group}
                </div>
                {g.zones.map((z) => {
                  index++
                  const i = index
                  return (
                    <div
                      key={z.id}
                      role="option"
                      data-index={i}
                      aria-selected={z.id === value}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => choose(z.id)}
                      className={[
                        'cursor-pointer px-3 py-2 text-sm',
                        i === active && 'bg-line-soft',
                        z.id === value && 'font-medium',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {z.label}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
