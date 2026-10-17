import { useParams } from 'react-router'

// Placeholder — implemented in specs/03-join-event, specs/04-availability
export default function EventPage() {
  const { id } = useParams()
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Event</h1>
      <p className="text-muted">{id}</p>
    </main>
  )
}
