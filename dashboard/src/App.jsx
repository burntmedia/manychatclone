import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import Automations from './pages/Automations'
import Keywords from './pages/Keywords'
import Settings from './pages/Settings'

// The main router for the dashboard. Routes are nested under AppLayout so that
// the sidebar/topbar stay persistent across pages.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/keywords" element={<Keywords />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
