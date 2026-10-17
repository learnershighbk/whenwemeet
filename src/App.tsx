import { Link, NavLink, Route, Routes } from 'react-router'
import AboutPage from './pages/AboutPage'
import CreatePage from './pages/CreatePage'
import EventPage from './pages/EventPage'

export const CONTACT_EMAIL = 'leanershigh@gmail.com'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${isActive ? 'font-medium text-nav-fg' : 'text-nav-muted hover:text-nav-fg'}`

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-nav text-nav-fg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-brand ring-2 ring-white/20" />
            WhenWeMeet
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink to="/about" className={navLink}>
              About
            </NavLink>
            <NavLink to="/" end className={navLink}>
              New event
            </NavLink>
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
      <footer className="border-t border-line py-5 text-xs text-faint">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <span>WhenWeMeet · Find the time that works for everyone.</span>
          <span>
            Suggestions or bug reports:{' '}
            <a href={`mailto:${CONTACT_EMAIL}?subject=WhenWeMeet%20feedback`} className="text-muted hover:text-ink hover:underline">
              {CONTACT_EMAIL}
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
