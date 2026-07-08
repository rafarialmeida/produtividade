import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppStore } from './store/useStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import MyDay from './pages/MyDay'
import CommunitiesHub from './pages/CommunitiesHub'
import GlobalWall from './pages/GlobalWall'
import AdminDashboard from './pages/AdminDashboard'
import CommunityPage from './pages/CommunityPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const currentUserId = useAppStore((s) => s.currentUserId)
  if (!currentUserId) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const currentUserId = useAppStore((s) => s.currentUserId)
  const user = useAppStore((s) => (currentUserId ? s.getUserById(currentUserId) : undefined))
  if (!currentUserId) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/day" replace />
  return <Layout>{children}</Layout>
}

function RootRedirect() {
  const currentUserId = useAppStore((s) => s.currentUserId)
  if (!currentUserId) return <Navigate to="/login" replace />
  return <Navigate to="/day" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/day"
        element={
          <RequireAuth>
            <MyDay />
          </RequireAuth>
        }
      />
      <Route
        path="/communities"
        element={
          <RequireAuth>
            <CommunitiesHub />
          </RequireAuth>
        }
      />
      <Route
        path="/global-wall"
        element={
          <RequireAuth>
            <GlobalWall />
          </RequireAuth>
        }
      />
      <Route
        path="/community/:id"
        element={
          <RequireAuth>
            <CommunityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
