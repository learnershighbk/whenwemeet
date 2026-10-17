import { Route, Routes } from 'react-router'
import CreatePage from './pages/CreatePage'
import EventPage from './pages/EventPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/e/:id" element={<EventPage />} />
    </Routes>
  )
}
