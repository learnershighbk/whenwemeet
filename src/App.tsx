import { Link, NavLink, Route, Routes } from 'react-router'
import AboutPage from './pages/AboutPage'
import CreatePage from './pages/CreatePage'
import EventPage from './pages/EventPage'

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
      <footer className="border-t border-line py-5 text-center text-xs text-faint">
        WhenWeMeet · Find the time that works for everyone.
      </footer>
    </div>
  )
}
