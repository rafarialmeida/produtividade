import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Bug,
  HelpCircle,
  Layers,
  LogOut,
  Moon,
  MoreVertical,
  Podium,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Users,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { useExpirationTicker } from '../hooks/useExpirationTicker'
import { usePresence } from '../hooks/usePresence'
import { useTheme } from '../hooks/useTheme'
import { getLevelInfo } from '../utils/level'
import NotificationToasts from './NotificationToasts'
import OnboardingTour from './OnboardingTour'
import OnlineDot from './OnlineDot'
import PushToggle from './PushToggle'
import ProfileModal from './ProfileModal'
import ReportBugModal from './ReportBugModal'
import MessagesPanel from './MessagesPanel'
import TermsAcceptanceModal from './TermsAcceptanceModal'

const NAV_ITEMS = [
  { to: '/day', label: 'Minhas tarefas', icon: Sparkles },
  { to: '/communities', label: 'Comunidades', icon: Users },
  { to: '/global-wall', label: 'Ranking Geral', icon: Podium },
]

export default function Layout({ children }: { children: ReactNode }) {
  useExpirationTicker()
  usePresence()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.authUser)
  const myStats = useAppStore((s) => s.myStats)
  const onlineUserIds = useAppStore((s) => s.onlineUserIds)
  const signOut = useAppStore((s) => s.signOut)
  const [showProfile, setShowProfile] = useState(false)
  const [showTourAgain, setShowTourAgain] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showReportBug, setShowReportBug] = useState(false)
  const levelMode = useAppStore((s) => s.levelMode)
  const setLevelMode = useAppStore((s) => s.setLevelMode)
  const activeLevelInfo = myStats
    ? (() => {
        const workLevel = getLevelInfo(myStats.workXp)
        const personalLevel = getLevelInfo(myStats.personalXp)
        if (levelMode === 'work') return workLevel
        if (levelMode === 'personal') return personalLevel
        // Nível Total: soma dos dois níveis (não o nível derivado da soma dos XPs).
        return { level: workLevel.level + personalLevel.level, xp: myStats.workXp + myStats.personalXp }
      })()
    : null
  const { theme, toggleTheme } = useTheme()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMobileMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setShowMobileMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMobileMenu])

  return (
    <div className="min-h-screen flex flex-col">
      {user && <NotificationToasts userId={user.id} />}
      <header className="border-b border-white/5 light:border-black/10 sticky top-0 z-40 backdrop-blur-md bg-black/30 light:bg-white/70">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          <Link to="/day" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.5)]">
              <Zap size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-lg text-white light:text-zinc-900 hidden sm:inline">Flawless</span>
          </Link>

          {user && (
            <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-3 border-l border-white/10 light:border-black/10 shrink-0">
                {activeLevelInfo && (
                  <button
                    onClick={() =>
                      setLevelMode(levelMode === 'work' ? 'personal' : levelMode === 'personal' ? 'all' : 'work')
                    }
                    title={
                      levelMode === 'work'
                        ? 'Nível de Trabalho — filtrando tarefas de trabalho em Minhas tarefas. Clique para ver o nível de tarefas gerais'
                        : levelMode === 'personal'
                          ? 'Nível de tarefas gerais — filtrando tarefas gerais em Minhas tarefas. Clique para ver o Nível Total'
                          : 'Nível Total (nível de Trabalho + nível de tarefas gerais) — sem filtro em Minhas tarefas. Clique para ver o nível de Trabalho'
                    }
                    className={`flex items-center gap-1 text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                      activeLevelInfo.level >= 1
                        ? levelMode === 'work'
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 light:text-sky-700 hover:bg-sky-500/20 light:text-sky-600'
                          : levelMode === 'personal'
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 light:text-purple-600 hover:bg-purple-500/20 light:text-purple-600'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light:text-emerald-600 hover:bg-emerald-500/20 light:text-emerald-600'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400 light:text-rose-600 hover:bg-rose-500/20 light:text-rose-600'
                    }`}
                  >
                    {levelMode === 'work' ? <Briefcase size={11} /> : levelMode === 'personal' ? <Star size={11} /> : <Layers size={11} />}
                    Nv {activeLevelInfo.level}
                    <span className="hidden sm:inline text-zinc-400 light:text-zinc-500 font-normal">· {activeLevelInfo.xp} XP</span>
                  </button>
                )}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white light:text-zinc-900 leading-tight">{user.name}</p>
                  <p className="text-[11px] text-zinc-500 leading-tight">
                    {user.role === 'admin' ? 'Administrador' : 'Membro'}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowProfile(true)}
                    title="Meu perfil"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 light:border-black/10 hover:border-purple-400/60 flex items-center justify-center text-xs font-semibold text-white transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.slice(0, 1).toUpperCase()
                    )}
                  </button>
                  <OnlineDot online={onlineUserIds.has(user.id)} className="absolute -bottom-0.5 -right-0.5 border border-black/50 light:border-white/70" />
                </div>
                <PushToggle userId={user.id} />
                <MessagesPanel userId={user.id} />
                <button
                  onClick={() => setShowReportBug(true)}
                  title="Reportar bug ou melhoria"
                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-300 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  <Bug size={16} />
                </button>

                {/* Telas maiores: ícones soltos. No mobile eles ficam agrupados no menu "⋮" pra caber tudo sem precisar dar zoom out. */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setShowTourAgain(true)}
                    title="Ver tutorial de boas-vindas novamente"
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors"
                  >
                    <HelpCircle size={16} />
                  </button>
                  <button
                    onClick={() => navigate('/trash')}
                    title="Lixeira"
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={async () => {
                      await signOut()
                      navigate('/login')
                    }}
                    title="Sair"
                    className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                <div className="relative sm:hidden" ref={mobileMenuRef}>
                  <button
                    onClick={() => setShowMobileMenu((v) => !v)}
                    title="Mais opções"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMobileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-xl overflow-hidden z-50 py-1">
                      <button
                        onClick={() => {
                          setShowTourAgain(true)
                          setShowMobileMenu(false)
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5 transition-colors"
                      >
                        <HelpCircle size={15} /> Tutorial
                      </button>
                      <button
                        onClick={() => {
                          navigate('/trash')
                          setShowMobileMenu(false)
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5 transition-colors"
                      >
                        <Trash2 size={15} /> Lixeira
                      </button>
                      <button
                        onClick={async () => {
                          setShowMobileMenu(false)
                          await signOut()
                          navigate('/login')
                        }}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left text-rose-400 light:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={15} /> Sair
                      </button>
                    </div>
                  )}
                </div>
              </div>
          )}

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5 transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {user && (
          <nav className="hidden sm:flex items-center gap-1 max-w-6xl mx-auto px-3 sm:px-6 py-2 border-t border-white/5 light:border-black/10">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white light:bg-black/[0.06] light:text-zinc-900'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 light:text-zinc-500 light:hover:text-zinc-900 light:hover:bg-black/[0.04]'
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
                    isActive
                      ? 'bg-white/10 text-white light:bg-black/[0.06] light:text-zinc-900'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5 light:text-zinc-500 light:hover:text-zinc-900 light:hover:bg-black/[0.04]'
                  }`
                }
              >
                <ShieldCheck size={15} /> Admin
              </NavLink>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">{children}</main>
      {user && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-white/10 bg-black/80 backdrop-blur-md light:border-black/10 light:bg-white/85 pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-purple-300 light:text-purple-600'
                    : 'text-zinc-500 light:text-zinc-500'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-purple-300 light:text-purple-600'
                    : 'text-zinc-500 light:text-zinc-500'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin
            </NavLink>
          )}
        </nav>
      )}
      {showProfile && user && <ProfileModal userId={user.id} onClose={() => setShowProfile(false)} />}
      {showReportBug && <ReportBugModal onClose={() => setShowReportBug(false)} />}
      {user && !user.termsAcceptedAt && <TermsAcceptanceModal />}
      {user && user.termsAcceptedAt && (!user.onboardingCompletedAt || showTourAgain) && (
        <OnboardingTour onDismiss={() => setShowTourAgain(false)} />
      )}
    </div>
  )
}
