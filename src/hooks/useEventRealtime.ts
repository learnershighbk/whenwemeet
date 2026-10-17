import { useEffect, useState } from 'react'
import { type AvailabilityChange, listAvailability, subscribeAvailability } from '../lib/api'
import type { Response } from '../lib/slots'

export type RealtimeStatus = 'loading' | 'live' | 'reconnecting'

function applyChange(list: Response[], change: AvailabilityChange): Response[] {
  if (change.type === 'delete') return list.filter((r) => r.participantId !== change.participantId)
  const i = list.findIndex((r) => r.participantId === change.response.participantId)
  if (i === -1) return [...list, change.response]
  const next = list.slice()
  next[i] = change.response
  return next
}

/**
 * All responses for an event, kept current via Supabase Realtime (specs/04-availability R8).
 * Loads once, then subscribes; reloads on every (re)SUBSCRIBED so nothing is missed in between.
 * Changes that arrive while a reload is in flight are replayed on top of the reload result,
 * so an older snapshot never overwrites a newer event.
 */
export function useEventRealtime(eventId: string): { responses: Response[]; status: RealtimeStatus } {
  const [responses, setResponses] = useState<Response[]>([])
  const [status, setStatus] = useState<RealtimeStatus>('loading')

  useEffect(() => {
    let active = true
    let reloading = 0
    let buffered: AvailabilityChange[] = []
    setResponses([])
    setStatus('loading')

    const reload = async () => {
      reloading++
      try {
        const rows = await listAvailability(eventId)
        if (!active) return
        reloading--
        if (reloading === 0) {
          const replay = buffered
          buffered = []
          setResponses(replay.reduce(applyChange, rows))
        }
        return true
      } catch {
        reloading--
        if (active) setStatus('reconnecting')
        return false
      }
    }

    reload()

    const unsubscribe = subscribeAvailability(
      eventId,
      (change) => {
        if (!active) return
        if (reloading > 0) buffered.push(change)
        setResponses((prev) => applyChange(prev, change))
      },
      (channelStatus) => {
        if (!active) return
        if (channelStatus === 'SUBSCRIBED') {
          reload().then((ok) => {
            if (active && ok) setStatus('live')
          })
        } else {
          setStatus('reconnecting')
        }
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [eventId])

  return { responses, status }
}
