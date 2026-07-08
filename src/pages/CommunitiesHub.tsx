import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, KeyRound, Plus, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import CreateCommunityModal from '../components/CreateCommunityModal'
import InviteModal from '../components/InviteModal'
import { SEVERITY_LABEL, URGENCY_POINTS } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'

export default function CommunitiesHub() {
  const currentUserId = useAppStore((s) => s.currentUserId)!
  const user = useAppStore((s) => s.getUserById(currentUserId))!
  const allCommunities = useAppStore((s) => s.communities)
  const users = useAppStore((s) => s.users)
  const tasks = useAppStore((s) => s.tasks)
  const joinCommunityWithCode = useAppStore((s) => s.joinCommunityWithCode)

  const [showCreate, setShowCreate] = useState(false)
  const [inviteFor, setInviteFor] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')

  const myCommunities = useMemo(
    () => allCommunities.filter((c) => user.communityIds.includes(c.id)),
    [allCommunities, user.communityIds],
  )

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    setJoinSuccess('')
    if (!joinCode.trim()) return
    const community = joinCommunityWithCode(user.id, joinCode.trim())
    if (!community) {
      setJoinError('Código de convite inválido.')
      return
    }
    setJoinSuccess(`Você entrou em "${community.name}"!`)
    setJoinCode('')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Comunidades</h1>
          <p className="text-zinc-500 text-sm mt-1">Times de trabalho e racha de produtividade com amigos</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary !w-auto px-4">
          <Plus size={16} /> Criar Comunidade
        </button>
      </div>

      <form onSubmit={handleJoin} className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
            <KeyRound size={13} /> Entrar em uma comunidade com código de convite
          </label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="EX: 8F3K2A"
            className="input font-mono tracking-widest"
          />
        </div>
        <button type="submit" className="btn-secondary !w-auto px-5">
          Entrar
        </button>
        {joinError && <p className="text-xs text-rose-400 sm:ml-3">{joinError}</p>}
        {joinSuccess && <p className="text-xs text-emerald-400 sm:ml-3">{joinSuccess}</p>}
      </form>

      <div className="grid sm:grid-cols-2 gap-4">
        {myCommunities.map((c) => {
          const typeCfg = COMMUNITY_TYPE_CONFIG[c.type]
          const severityCfg = URGENCY_CONFIG[c.severity]
          const members = c.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean)
          const communityTasks = tasks.filter((t) => t.communityId === c.id)

          const leader = members
            .map((m) => {
              const lost = communityTasks
                .filter((t) => t.userId === m!.id && t.expired && !t.completed)
                .reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)
              return { user: m!, lost }
            })
            .sort((a, b) => b.lost - a.lost)[0]

          return (
            <div key={c.id} className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 shrink-0 rounded-xl ${typeCfg.bg} border ${typeCfg.border} flex items-center justify-center`}>
                    <typeCfg.icon size={16} className={typeCfg.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Users size={11} /> {members.length} membros
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${typeCfg.bg} ${typeCfg.border} ${typeCfg.color}`}>
                  {typeCfg.label}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${severityCfg.bg} ${severityCfg.border} ${severityCfg.color}`}>
                  Gravidade {SEVERITY_LABEL[c.severity]}
                </span>
              </div>

              {leader && leader.lost > 0 && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/[0.06] border border-rose-500/20 rounded-xl px-3 py-2">
                  <Flame size={13} className="shrink-0" />
                  <span className="truncate">
                    <strong>{leader.user.name}</strong> lidera o muro com -{leader.lost} pts
                  </span>
                </div>
              )}

              <div className="flex -space-x-2">
                {members.slice(0, 8).map((m) => (
                  <div
                    key={m!.id}
                    title={m!.name}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/50 to-emerald-500/50 border-2 border-[#0d0e14] flex items-center justify-center text-[10px] font-semibold text-white"
                  >
                    {m!.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
                {members.length > 8 && (
                  <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#0d0e14] flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                    +{members.length - 8}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-1">
                <Link to={`/community/${c.id}`} className="btn-ghost flex-1">
                  Ver comunidade
                </Link>
                <button onClick={() => setInviteFor(c.id)} className="btn-ghost flex-1">
                  Convidar
                </button>
              </div>
            </div>
          )
        })}

        {myCommunities.length === 0 && (
          <div className="sm:col-span-2 glass-panel rounded-2xl p-10 text-center">
            <p className="text-zinc-400 text-sm">Você ainda não faz parte de nenhuma comunidade.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary !w-auto px-4 mx-auto mt-4">
              <Plus size={15} /> Criar a primeira
            </button>
          </div>
        )}
      </div>

      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
      {inviteFor && <InviteModal communityId={inviteFor} onClose={() => setInviteFor(null)} />}
    </div>
  )
}
