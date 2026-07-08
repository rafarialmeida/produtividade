import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, ShieldCheck, Zap } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { useExpirationTicker } from '../hooks/useExpirationTicker'
import NotificationToasts from './NotificationToasts'

export default function Layout({ children }: { children: ReactNode }) {
  useExpirationTicker()
  const navigate = useNavigate()
  const currentUserId = useAppStore((s) => s.currentUserId)
  const user = useAppStore((s) => (currentUserId ? s.getUserById(currentUserId) : undefined))
  const logout = useAppStore((s) => s.logout)

  return (
    <div className="min-h-screen flex flex-col">
      {user && <NotificationToasts userId={user.id} />}
      <header className="border-b border-white/5 sticky top-0 z-40 backdrop-blur-md bg-black/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)]">
              <Zap size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-lg text-white">FailSync</span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <nav className="hidden sm:flex items-center gap-1 mr-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <LayoutDashboard size={15} /> Dashboard
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ShieldCheck size={15} /> Admin
                  </Link>
                )}
              </nav>
              <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
                  <p className="text-[11px] text-zinc-500 leading-tight">
                    {user.role === 'admin' ? 'Administrador' : 'Membro'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <button
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  title="Sair"
                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
