import { Link, NavLink, Route, Routes } from 'react-router'
import AboutPage from './pages/AboutPage'
import CreatePage from './pages/CreatePage'
import EventPage from './pages/EventPage'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm bg-pick" />
            WhenWeMeet
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? 'font-medium text-ink' : 'text-muted hover:text-ink')}
            >
              About
            </NavLink>
            <Link to="/" className="text-muted hover:text-ink">
              New event
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<CreatePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/e/:id" element={<EventPage />} />
        </Routes>
      </div>
      <footer className="py-6 text-center text-xs text-faint">Find the time that works for everyone.</footer>
    </div>
  )
}
