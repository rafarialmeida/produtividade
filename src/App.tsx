import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from './store/useStore'
import { isSupabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import MyDay from './pages/MyDay'
import CommunitiesHub from './pages/CommunitiesHub'
import GlobalWall from './pages/GlobalWall'
import AdminDashboard from './pages/AdminDashboard'
import CommunityPage from './pages/CommunityPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const authUser = useAppStore((s) => s.authUser)
  if (!authUser) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const authUser = useAppStore((s) => s.authUser)
  if (!authUser) return <Navigate to="/login" replace />
  if (authUser.role !== 'admin') return <Navigate to="/day" replace />
  return <Layout>{children}</Layout>
}

function RootRedirect() {
  const authUser = useAppStore((s) => s.authUser)
  if (!authUser) return <Navigate to="/login" replace />
  return <Navigate to="/day" replace />
}

function AppSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-400 animate-pulse" />
    </div>
  )
}

function SupabaseSetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-2xl p-6 max-w-md w-full flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-amber-300">
          <AlertTriangle size={20} />
          <h1 className="text-lg font-bold text-white light:text-zinc-900">Configuração do Supabase pendente</h1>
        </div>
        <p className="text-sm text-zinc-400 light:text-zinc-600">
          Defina <code className="text-zinc-200 light:text-zinc-800">VITE_SUPABASE_URL</code> e{' '}
          <code className="text-zinc-200 light:text-zinc-800">VITE_SUPABASE_ANON_KEY</code> (veja{' '}
          <code className="text-zinc-200 light:text-zinc-800">.env.example</code>)
          e rode <code className="text-zinc-200 light:text-zinc-800">supabase/schema.sql</code> no seu projeto Supabase antes de usar o
          app.
        </p>
      </div>
    </div>
  )
}

function App() {
  const authLoading = useAppStore((s) => s.authLoading)
  if (!isSupabaseConfigured) return <SupabaseSetupNotice />
  if (authLoading) return <AppSplash />

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
