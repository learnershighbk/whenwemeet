// Participant sign-in kept per event in localStorage (docs/architecture.md §6).
// Storage can be unavailable (private mode, blocked); every access is guarded.

export type Session = { participantId: string; token: string; name: string }

const key = (eventId: string) => `wwm:${eventId}`

export function loadSession(eventId: string): Session | null {
  try {
    const raw = localStorage.getItem(key(eventId))
    if (!raw) return null
    const s = JSON.parse(raw)
    if (typeof s?.participantId === 'string' && typeof s?.token === 'string' && typeof s?.name === 'string') {
      return s
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(eventId: string, session: Session): void {
  try {
    localStorage.setItem(key(eventId), JSON.stringify(session))
  } catch {
    // Storage unavailable — sign-in lasts for this visit only
  }
}

export function clearSession(eventId: string): void {
  try {
    localStorage.removeItem(key(eventId))
  } catch {
    // ignore
  }
}
