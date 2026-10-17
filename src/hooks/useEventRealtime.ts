import { useEffect, useState } from 'react'
import { listAvailability, subscribeAvailability } from '../lib/api'
import type { Response } from '../lib/slots'

export type RealtimeStatus = 'loading' | 'live' | 'reconnecting'

/**
 * All responses for an event, kept current via Supabase Realtime (specs/04-availability R8).
 * Loads once, then subscribes; reloads on every (re)SUBSCRIBED so nothing is missed in between.
 */
export function useEventRealtime(eventId: string): { responses: Response[]; status: RealtimeStatus } {
  const [responses, setResponses] = useState<Response[]>([])
  const [status, setStatus] = useState<RealtimeStatus>('loading')

  useEffect(() => {
    let active = true
    setResponses([])
    setStatus('loading')

    const reload = async () => {
      try {
        const rows = await listAvailability(eventId)
        if (active) setResponses(rows)
      } catch {
        if (active) setStatus('reconnecting')
      }
    }

    reload()

    const unsubscribe = subscribeAvailability(
      eventId,
      (change) => {
        if (!active) return
        setResponses((prev) => {
          if (change.type === 'delete') return prev.filter((r) => r.participantId !== change.participantId)
          const i = prev.findIndex((r) => r.participantId === change.response.participantId)
          if (i === -1) return [...prev, change.response]
          const next = prev.slice()
          next[i] = change.response
          return next
        })
      },
      (channelStatus) => {
        if (!active) return
        if (channelStatus === 'SUBSCRIBED') {
          reload().then(() => {
            if (active) setStatus('live')
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
