import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus, Skull, TrendingDown } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import TaskForm from '../components/TaskForm'
import TaskCard from '../components/TaskCard'
import { isNearDeadline } from '../utils/date'
import { URGENCY_POINTS } from '../types'

export default function MemberDashboard() {
  const currentUserId = useAppStore((s) => s.currentUserId)!
  const user = useAppStore((s) => s.getUserById(currentUserId))!
  const allCommunities = useAppStore((s) => s.communities)
  const communities = useMemo(
    () => allCommunities.filter((c) => user.communityIds.includes(c.id)),
    [allCommunities, user.communityIds],
  )
  const allTasks = useAppStore((s) => s.tasks)

  const [activeCommunityId, setActiveCommunityId] = useState(communities[0]?.id ?? '')
  const [showForm, setShowForm] = useState(false)

  const communityId = activeCommunityId || communities[0]?.id

  const myTasks = useMemo(
    () => allTasks.filter((t) => t.userId === user.id && t.communityId === communityId),
    [allTasks, user.id, communityId],
  )

  const active = myTasks.filter((t) => !t.completed && !t.expired).sort((a, b) => a.deadline.localeCompare(b.deadline))
  const expired = myTasks.filter((t) => t.expired && !t.completed)
  const completed = myTasks.filter((t) => t.completed)
  const nearCount = active.filter((t) => isNearDeadline(t.deadline)).length
  const lostPoints = expired.reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)

  if (!communityId) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Você ainda não faz parte de nenhuma comunidade.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-zinc-500 text-sm mt-1">Seu painel pessoal de execução</p>
        </div>
        <div className="flex items-center gap-2">
          {communities.length > 1 && (
            <select
              value={communityId}
              onChange={(e) => setActiveCommunityId(e.target.value)}
              className="input !w-auto text-sm"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setShowForm(true)} className="btn-secondary !w-auto px-4">
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tarefas ativas" value={active.length} accent="purple" />
        <StatCard label="Perto do prazo" value={nearCount} accent="amber" />
        <StatCard label="Expiradas" value={expired.length} accent="rose" />
        <StatCard label="Pontos perdidos" value={lostPoints} accent="rose" prefix="-" />
      </div>

      <Link
        to={`/community/${communityId}`}
        className="glass-panel rounded-2xl px-5 py-4 flex items-center justify-between hover:border-purple-500/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Skull size={16} className="text-purple-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Ver Muro da Procrastinação</p>
            <p className="text-xs text-zinc-500">Ranking de negligência de {communities.find((c) => c.id === communityId)?.name}</p>
          </div>
        </div>
        <ArrowUpRight size={18} className="text-zinc-600 group-hover:text-purple-300 transition-colors" />
      </Link>

      {expired.length > 0 && (
        <Section title="Expiradas — penalizadas" icon={<TrendingDown size={16} className="text-rose-400" />}>
          {expired.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </Section>
      )}

      <Section title="Em andamento">
        {active.length === 0 ? (
          <EmptyState onCreate={() => setShowForm(true)} />
        ) : (
          active.map((t) => <TaskCard key={t.id} task={t} />)
        )}
      </Section>

      {completed.length > 0 && (
        <Section title="Concluídas">
          {completed.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </Section>
      )}

      {showForm && <TaskForm communityId={communityId} userId={user.id} onClose={() => setShowForm(false)} />}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 mb-3">
        {icon} {title}
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="sm:col-span-2 glass-panel rounded-2xl p-8 text-center">
      <p className="text-zinc-400 text-sm">Nenhuma tarefa ativa. Planeje sua próxima execução.</p>
      <button onClick={onCreate} className="btn-secondary !w-auto px-4 mx-auto mt-4">
        <Plus size={15} /> Criar tarefa
      </button>
    </div>
  )
}

function StatCard({ label, value, accent, prefix = '' }: { label: string; value: number; accent: 'purple' | 'amber' | 'rose'; prefix?: string }) {
  const colors = {
    purple: 'text-purple-300',
    amber: 'text-amber-300',
    rose: 'text-rose-400',
  }
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>
        {prefix}
        {value}
      </p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
    </div>
  )
}
