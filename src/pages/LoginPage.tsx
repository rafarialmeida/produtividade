import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck, Sparkles, Ticket, User, Zap } from 'lucide-react'
import { useAppStore } from '../store/useStore'

type Tab = 'admin' | 'member' | 'invite'

export default function LoginPage() {
  const navigate = useNavigate()
  const loginAdmin = useAppStore((s) => s.loginAdmin)
  const loginMember = useAppStore((s) => s.loginMember)
  const joinWithInviteCode = useAppStore((s) => s.joinWithInviteCode)
  const users = useAppStore((s) => s.users)

  const [tab, setTab] = useState<Tab>('admin')
  const [error, setError] = useState('')

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [memberEmail, setMemberEmail] = useState('')

  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const user = loginAdmin(adminEmail.trim(), adminPassword)
    if (!user) {
      setError('Credenciais de administrador inválidas.')
      return
    }
    navigate('/admin')
  }

  function handleMemberLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const user = loginMember(memberEmail.trim())
    if (!user) {
      setError('E-mail não encontrado. Peça um código de convite ou fale com o admin.')
      return
    }
    navigate(user.role === 'admin' ? '/admin' : '/dashboard')
  }

  function handleInviteJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteCode.trim()) {
      setError('Preencha nome, e-mail e código de convite.')
      return
    }
    const user = joinWithInviteCode(inviteName.trim(), inviteEmail.trim(), inviteCode.trim())
    if (!user) {
      setError('Código de convite inválido.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-emerald-400 flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.55)] mb-4">
            <Zap size={26} className="text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FailSync</h1>
          <p className="text-zinc-500 text-sm mt-1 text-center">
            Execução estratégica. Sem desculpas. <span className="text-emerald-400">Sem procrastinação.</span>
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 mb-6">
          <TabButton active={tab === 'admin'} onClick={() => { setTab('admin'); setError('') }} icon={<ShieldCheck size={14} />}>
            Admin
          </TabButton>
          <TabButton active={tab === 'member'} onClick={() => { setTab('member'); setError('') }} icon={<User size={14} />}>
            Membro
          </TabButton>
          <TabButton active={tab === 'invite'} onClick={() => { setTab('invite'); setError('') }} icon={<Ticket size={14} />}>
            Convite
          </TabButton>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-7">
          {tab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">E-mail do administrador</label>
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  type="email"
                  placeholder="admin@failsync.com"
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Senha</label>
                <input
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="input"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminEmail('admin@failsync.com')
                  setAdminPassword('senha123')
                }}
                className="flex items-center justify-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 -mt-1"
              >
                <Sparkles size={12} /> Preencher credenciais de demonstração
              </button>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button type="submit" className="btn-primary mt-1">
                <KeyRound size={15} /> Entrar como Admin
              </button>
            </form>
          )}

          {tab === 'member' && (
            <form onSubmit={handleMemberLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Seu e-mail</label>
                <input
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  type="email"
                  placeholder="ana@failsync.com"
                  className="input"
                />
              </div>
              <p className="text-[11px] text-zinc-500 -mt-1">
                Membros de demonstração: ana@, bruno@, carla@ ou diego@failsync.com
              </p>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button type="submit" className="btn-primary mt-1">
                <User size={15} /> Entrar como Membro
              </button>
            </form>
          )}

          {tab === 'invite' && (
            <form onSubmit={handleInviteJoin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Seu nome</label>
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Seu nome completo" className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Seu e-mail</label>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="voce@exemplo.com" className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Código de convite</label>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="EX: 8F3K2A"
                  className="input font-mono tracking-widest"
                />
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button type="submit" className="btn-secondary mt-1">
                <Ticket size={15} /> Entrar com convite
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          {users.length} usuários cadastrados na plataforma de demonstração
        </p>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all ${
        active ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon} {children}
    </button>
  )
}
