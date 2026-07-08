import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import ProcrastinationWall from '../components/ProcrastinationWall'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import InviteModal from '../components/InviteModal'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { SEVERITY_LABEL } from '../types'

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUserId = useAppStore((s) => s.currentUserId)!
  const currentUser = useAppStore((s) => s.getUserById(currentUserId))
  const community = useAppStore((s) => (id ? s.getCommunityById(id) : undefined))
  const deleteCommunity = useAppStore((s) => s.deleteCommunity)
  const allTasks = useAppStore((s) => s.tasks)
  const tasks = useMemo(() => allTasks.filter((t) => t.communityId === id), [allTasks, id])
  const [showForm, setShowForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'completed'>('all')

  if (!community) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Comunidade não encontrada.</p>
        <Link to="/day" className="text-purple-300 text-sm mt-2 inline-block">
          Voltar ao meu dia
        </Link>
      </div>
    )
  }

  const cfg = URGENCY_CONFIG[community.severity]
  const typeCfg = COMMUNITY_TYPE_CONFIG[community.type]
  const canInvite = currentUser?.role === 'admin' || community.memberIds.includes(currentUserId)
  const canDelete = currentUser?.role === 'admin' || community.creatorId === currentUserId

  function handleDeleteCommunity() {
    if (!community) return
    if (window.confirm(`Excluir a comunidade "${community.name}"? Todas as tarefas dela serão perdidas. Essa ação não pode ser desfeita.`)) {
      deleteCommunity(community.id)
      navigate('/communities')
    }
  }

  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.completed && !t.expired
      if (filter === 'expired') return t.expired && !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/day" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-3">
          <ArrowLeft size={13} /> Voltar
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${typeCfg.bg} border ${typeCfg.border} flex items-center justify-center`}>
              <typeCfg.icon size={18} className={typeCfg.color} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{community.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                <Users size={12} /> {community.memberIds.length} membros
                <span className={`px-1.5 py-0.5 rounded border ${typeCfg.bg} ${typeCfg.border} ${typeCfg.color} font-medium`}>
                  {typeCfg.label}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color} font-medium`}>
                  Gravidade {SEVERITY_LABEL[community.severity]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canInvite && (
              <button onClick={() => setShowInvite(true)} className="btn-ghost">
                <UserPlus size={15} /> Convidar
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="btn-secondary !w-auto px-4">
              <Plus size={16} /> Nova Tarefa
            </button>
            {canDelete && (
              <button
                onClick={handleDeleteCommunity}
                title="Excluir comunidade"
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ProcrastinationWall communityId={community.id} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Tarefas da comunidade</h2>
          <div className="flex gap-1">
            {(['all', 'active', 'expired', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  filter === f ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {{ all: 'Todas', active: 'Ativas', expired: 'Expiradas', completed: 'Concluídas' }[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <p className="sm:col-span-2 text-center text-sm text-zinc-500 py-10">Nenhuma tarefa nesse filtro.</p>
          ) : (
            filtered.map((t) => <TaskCard key={t.id} task={t} showOwner />)
          )}
        </div>
      </div>

      {showForm && <TaskForm communityId={community.id} userId={currentUserId} onClose={() => setShowForm(false)} />}
      {showInvite && <InviteModal communityId={community.id} onClose={() => setShowInvite(false)} />}
    </div>
  )
}
