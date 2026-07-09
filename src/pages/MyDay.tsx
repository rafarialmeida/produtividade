import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Circle, Globe2, Play, Plus, TrendingDown, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import TaskForm from '../components/TaskForm'
import TaskCard from '../components/TaskCard'
import TaskCalendar from '../components/TaskCalendar'
import MoodWall from '../components/MoodWall'
import { isNearDeadline } from '../utils/date'
import { URGENCY_POINTS } from '../types'

export default function MyDay() {
  const currentUserId = useAppStore((s) => s.currentUserId)!
  const user = useAppStore((s) => s.getUserById(currentUserId))!
  const allCommunities = useAppStore((s) => s.communities)
  const communities = useMemo(
    () => allCommunities.filter((c) => user.communityIds.includes(c.id)),
    [allCommunities, user.communityIds],
  )
  const allTasks = useAppStore((s) => s.tasks)

  const [showForm, setShowForm] = useState(false)

  const myTasks = useMemo(() => allTasks.filter((t) => t.userId === user.id), [allTasks, user.id])

  const active = myTasks.filter((t) => !t.completed && !t.expired).sort((a, b) => a.deadline.localeCompare(b.deadline))
  const notStarted = active.filter((t) => !t.started)
  const inProgress = active.filter((t) => t.started)
  const dueToday = active.filter((t) => isNearDeadline(t.deadline, 24))
  const expired = myTasks.filter((t) => t.expired && !t.completed)
  const completed = myTasks.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const nearCount = active.filter((t) => isNearDeadline(t.deadline)).length
  const lostPoints = expired.reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)

  const multiCommunity = communities.length > 1

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-zinc-500 text-sm mt-1">Seu painel pessoal de execução, todas as comunidades reunidas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-secondary !w-auto px-4">
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Vencem em 24h" value={dueToday.length} accent="amber" />
        <StatCard label="Tarefas ativas" value={active.length} accent="purple" />
        <StatCard label="Expiradas" value={expired.length} accent="rose" />
        <StatCard label="Pontos perdidos" value={lostPoints} accent="rose" prefix="-" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/communities"
          className="glass-panel rounded-2xl px-5 py-4 flex items-center justify-between hover:border-purple-500/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Users size={16} className="text-purple-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Minhas comunidades</p>
              <p className="text-xs text-zinc-500">{communities.length} comunidade{communities.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </Link>
        <Link
          to="/global-wall"
          className="glass-panel rounded-2xl px-5 py-4 flex items-center justify-between hover:border-purple-500/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <Globe2 size={16} className="text-rose-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Muro Global</p>
              <p className="text-xs text-zinc-500">Ranking de negligência de toda a plataforma</p>
            </div>
          </div>
        </Link>
      </div>

      {nearCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/[0.06] border border-amber-500/25 rounded-xl px-4 py-2.5">
          <TrendingDown size={14} className="shrink-0" />
          {nearCount} tarefa{nearCount !== 1 ? 's' : ''} perto do prazo — evite perder pontos.
        </div>
      )}

      {expired.length > 0 && (
        <Section title="Expiradas — penalizadas" icon={<TrendingDown size={16} className="text-rose-400" />}>
          {expired.map((t) => (
            <TaskCard key={t.id} task={t} showCommunity={multiCommunity} />
          ))}
        </Section>
      )}

      <Section title="Não iniciadas" icon={<Circle size={14} className="text-zinc-400" />}>
        {notStarted.length === 0 && inProgress.length === 0 ? (
          <EmptyState onCreate={() => setShowForm(true)} />
        ) : notStarted.length === 0 ? (
          <p className="sm:col-span-2 text-sm text-zinc-500 py-2">Nenhuma tarefa esperando para começar.</p>
        ) : (
          notStarted.map((t) => <TaskCard key={t.id} task={t} showCommunity={multiCommunity} />)
        )}
      </Section>

      {inProgress.length > 0 && (
        <Section title="Em andamento" icon={<Play size={14} className="text-sky-300" />}>
          {inProgress.map((t) => (
            <TaskCard key={t.id} task={t} showCommunity={multiCommunity} />
          ))}
        </Section>
      )}

      <TaskCalendar tasks={myTasks} />

      <MoodWall tasks={myTasks} />

      {completed.length > 0 && (
        <Section title="Concluídas">
          {completed.map((t) => (
            <TaskCard key={t.id} task={t} showCommunity={multiCommunity} />
          ))}
        </Section>
      )}

      {showForm && <TaskForm userId={user.id} onClose={() => setShowForm(false)} />}
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
