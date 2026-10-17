import { useRef, useState } from 'react'
import { JoinError } from '../lib/api'

const MAX_NAME = 30

const MESSAGES: Record<string, string> = {
  wrong_password: 'Wrong password for this name.',
  invalid_name: `Please enter a name (up to ${MAX_NAME} characters).`,
  event_full: 'This event already has 100 people.',
}
const FALLBACK = 'Something went wrong. Please try again.'

type Props = {
  /** Resolves on success; throws JoinError (or anything) on failure */
  onJoin: (name: string, password: string) => Promise<void>
}

export default function SignInForm({ onJoin }: Props) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const canSubmit = name.trim().length > 0 && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      await onJoin(name.trim(), password)
    } catch (err) {
      const code = err instanceof JoinError ? err.code : 'unknown'
      setError(MESSAGES[code] ?? FALLBACK)
      if (code === 'wrong_password') {
        setPassword('')
        passwordRef.current?.focus()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">Who are you?</h2>

      <label htmlFor="name" className="mb-1 block text-sm text-muted">
        Your name
      </label>
      <input
        id="name"
        value={name}
        maxLength={MAX_NAME}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        autoFocus
        className="field mb-4 h-11 w-full"
      />

      <label htmlFor="password" className="mb-1 block text-sm text-muted">
        Password (optional)
      </label>
      <input
        id="password"
        ref={passwordRef}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="off"
        className="field mb-2 h-11 w-full"
      />
      <p className="mb-4 text-sm text-muted">
        No sign-up needed. Add a password only if you want to keep others from editing your times.
      </p>

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-primary h-12 w-full"
      >
        {busy ? 'Joining…' : 'Continue'}
      </button>
      <p className="mt-2 min-h-5 text-sm" role="alert">
        {error}
      </p>
    </form>
  )
}
