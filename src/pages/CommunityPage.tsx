import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Dices, Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import ProcrastinationWall from '../components/ProcrastinationWall'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import InviteModal from '../components/InviteModal'
import CommunityDashboard from '../components/CommunityDashboard'
import TaskHistoryModal from '../components/TaskHistoryModal'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { SEVERITY_LABEL } from '../types'

const CommunityBoard = lazy(() => import('../components/CommunityBoard'))

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.authUser)!
  const currentUserId = currentUser.id
  const community = useAppStore((s) => (id ? s.getCommunityById(id) : undefined))
  const deleteCommunity = useAppStore((s) => s.deleteCommunity)
  const setCommunityBoardEnabled = useAppStore((s) => s.setCommunityBoardEnabled)
  const allTasks = useAppStore((s) => s.tasks)
  const tasks = useMemo(() => allTasks.filter((t) => t.communityId === id), [allTasks, id])
  const [showForm, setShowForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'completed'>('all')
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'dashboard' | 'board'>('tasks')
  const [togglingBoard, setTogglingBoard] = useState(false)

  useEffect(() => {
    if (!community) return
    const boardOk = community.type === 'trabalho' && community.boardEnabled
    const dashboardOk = community.type === 'trabalho' && (currentUser?.role === 'admin' || community.adminIds.includes(currentUserId))
    if (activeTab === 'board' && !boardOk) setActiveTab('tasks')
    if (activeTab === 'dashboard' && !dashboardOk) setActiveTab('tasks')
  }, [community, activeTab, currentUser, currentUserId])

  if (!community) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 light:text-zinc-600">Comunidade não encontrada.</p>
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
  const isCommunityAdmin = currentUser?.role === 'admin' || community.adminIds.includes(currentUserId)
  const showDashboard = community.type === 'trabalho' && isCommunityAdmin
  const showBoard = community.type === 'trabalho' && community.boardEnabled
  const canToggleBoard = community.type === 'trabalho' && isCommunityAdmin
  const tabs = [
    { key: 'tasks' as const, label: 'Tarefas' },
    ...(showDashboard ? [{ key: 'dashboard' as const, label: 'Dashboard' }] : []),
    ...(showBoard ? [{ key: 'board' as const, label: 'Tabuleiro' }] : []),
  ]

  async function handleDeleteCommunity() {
    if (!community) return
    if (window.confirm(`Excluir a comunidade "${community.name}"? Todas as tarefas dela serão perdidas. Essa ação não pode ser desfeita.`)) {
      await deleteCommunity(community.id)
      navigate('/communities')
    }
  }

  async function handleToggleBoard() {
    if (!community) return
    setTogglingBoard(true)
    try {
      await setCommunityBoardEnabled(community.id, !community.boardEnabled)
      if (activeTab === 'board' && community.boardEnabled) setActiveTab('tasks')
    } finally {
      setTogglingBoard(false)
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
        <Link to="/day" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700 mb-3">
          <ArrowLeft size={13} /> Voltar
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${typeCfg.bg} border ${typeCfg.border} flex items-center justify-center`}>
              <typeCfg.icon size={18} className={typeCfg.color} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white light:text-zinc-900">{community.name}</h1>
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
            {canToggleBoard && (
              <button
                onClick={handleToggleBoard}
                disabled={togglingBoard}
                title={community.boardEnabled ? 'Desativar tabuleiro gamificado' : 'Ativar tabuleiro gamificado'}
                className={`p-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                  community.boardEnabled
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                    : 'border-white/10 bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 light:border-black/10 light:bg-black/[0.03]'
                }`}
              >
                <Dices size={15} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDeleteCommunity}
                title="Excluir comunidade"
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-500 hover:text-rose-400 transition-colors light:border-black/10 light:bg-black/[0.03]"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ProcrastinationWall communityId={community.id} />

      {tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/5 light:border-black/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`text-sm px-3 py-2 -mb-px border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-purple-400 text-white light:text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'dashboard' && showDashboard && (
        <CommunityDashboard communityId={community.id} onViewHistory={setHistoryUserId} />
      )}

      {activeTab === 'board' && showBoard && (
        <Suspense fallback={<div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 size={20} className="animate-spin" /></div>}>
          <CommunityBoard communityId={community.id} />
        </Suspense>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Tarefas da comunidade</h2>
            <div className="flex gap-1">
              {(['all', 'active', 'expired', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-white/10 text-white light:bg-black/[0.06] light:text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
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
      )}

      {showForm && <TaskForm communityId={community.id} userId={currentUserId} onClose={() => setShowForm(false)} />}
      {showInvite && <InviteModal communityId={community.id} onClose={() => setShowInvite(false)} />}
      {historyUserId && (
        <TaskHistoryModal
          userId={historyUserId}
          communityId={community.id}
          isAdminView
          onClose={() => setHistoryUserId(null)}
        />
      )}
    </div>
  )
}
