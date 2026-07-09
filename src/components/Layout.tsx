import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Skull, Sparkles, Users, ShieldCheck, Zap } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { useExpirationTicker } from '../hooks/useExpirationTicker'
import NotificationToasts from './NotificationToasts'

const NAV_ITEMS = [
  { to: '/day', label: 'Meu dia', icon: Sparkles },
  { to: '/communities', label: 'Comunidades', icon: Users },
  { to: '/global-wall', label: 'Muro Global', icon: Skull },
]

export default function Layout({ children }: { children: ReactNode }) {
  useExpirationTicker()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.authUser)
  const signOut = useAppStore((s) => s.signOut)

  return (
    <div className="min-h-screen flex flex-col">
      {user && <NotificationToasts userId={user.id} />}
      <header className="border-b border-white/5 sticky top-0 z-40 backdrop-blur-md bg-black/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/day" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)]">
              <Zap size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-lg text-white hidden sm:inline">Flawless</span>
          </Link>

          {user && (
            <>
              <nav className="flex items-center gap-1 overflow-x-auto">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon size={15} /> {item.label}
                  </NavLink>
                ))}
                {user.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <ShieldCheck size={15} /> Admin
                  </NavLink>
                )}
              </nav>
              <div className="flex items-center gap-2 pl-3 border-l border-white/10 shrink-0">
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
                  onClick={async () => {
                    await signOut()
                    navigate('/login')
                  }}
                  title="Sair"
                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
