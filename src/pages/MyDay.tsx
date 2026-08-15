import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Circle, ListFilter, Play, Plus, Podium, Tag, TrendingDown, UserCog, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import TaskForm from '../components/TaskForm'
import TaskCard from '../components/TaskCard'
import TaskCalendar from '../components/TaskCalendar'
import TaskListModal from '../components/TaskListModal'
import MoodWall from '../components/MoodWall'
import { isNearDeadline } from '../utils/date'
import { URGENCY_POINTS } from '../types'
import type { Task } from '../types'
import { useTheme } from '../hooks/useTheme'
import { KANBAN_COLUMNS, resolveKanbanColumn, type KanbanColumn } from '../utils/kanbanColumn'

export default function MyDay() {
  const { theme } = useTheme()
  const optionStyle = theme === 'light' ? { backgroundColor: '#fff', color: '#18181b' } : { backgroundColor: '#0d0e14', color: '#fff' }
  const user = useAppStore((s) => s.authUser)!
  const allCommunities = useAppStore((s) => s.communities)
  const communities = useMemo(
    () => allCommunities.filter((c) => c.memberIds.includes(user.id)),
    [allCommunities, user.id],
  )
  const allTasks = useAppStore((s) => s.tasks)
  const levelMode = useAppStore((s) => s.levelMode)

  const [showForm, setShowForm] = useState(false)
  const [listModal, setListModal] = useState<{ title: string; tasks: Task[] } | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | KanbanColumn>('all')

  const workCommunityIds = useMemo(
    () => new Set(allCommunities.filter((c) => c.type === 'trabalho').map((c) => c.id)),
    [allCommunities],
  )

  const levelFiltered = useMemo(() => {
    const mine = allTasks.filter((t) => t.userId === user.id)
    if (levelMode === 'all') return mine
    return mine.filter((t) => {
      const isWork = !!t.communityId && workCommunityIds.has(t.communityId)
      return levelMode === 'work' ? isWork : !isWork
    })
  }, [allTasks, user.id, levelMode, workCommunityIds])

  // Tarefas que não são minhas, mas em que fui atribuído a uma subtarefa
  // específica — aparecem numa seção separada (não contam pra "Tarefas
  // ativas"/"Pontos perdidos" nem entram no filtro de nível, que são sobre
  // responsabilidade da tarefa em si, não de uma subtarefa dentro dela).
  const assignedSubtaskTasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.userId !== user.id && !t.completed && t.subtasks.some((s) => s.assigneeId === user.id))
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [allTasks, user.id],
  )

  const availableCategories = useMemo(
    () => Array.from(new Set(levelFiltered.map((t) => t.category))).sort((a, b) => a.localeCompare(b)),
    [levelFiltered],
  )

  useEffect(() => {
    if (categoryFilter !== 'all' && !availableCategories.includes(categoryFilter)) setCategoryFilter('all')
  }, [availableCategories, categoryFilter])

  const myTasks = useMemo(() => {
    let list = categoryFilter === 'all' ? levelFiltered : levelFiltered.filter((t) => t.category === categoryFilter)
    if (statusFilter !== 'all') list = list.filter((t) => resolveKanbanColumn(t) === statusFilter)
    return list
  }, [levelFiltered, categoryFilter, statusFilter])

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
          <h1 className="text-2xl font-bold text-white light:text-zinc-900">Olá, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {levelMode === 'work'
              ? 'Mostrando tarefas de trabalho — clique no seu nível no topo para trocar o filtro'
              : levelMode === 'personal'
                ? 'Mostrando tarefas gerais — clique no seu nível no topo para trocar o filtro'
                : 'Mostrando todas as tarefas — clique no seu nível no topo para trocar o filtro'}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-secondary !w-auto px-4">
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Vencem em 24h"
          value={dueToday.length}
          accent="amber"
          onClick={dueToday.length > 0 ? () => setListModal({ title: 'Vencem em 24h', tasks: dueToday }) : undefined}
        />
        <StatCard
          label="Tarefas ativas"
          value={active.length}
          accent="purple"
          onClick={active.length > 0 ? () => setListModal({ title: 'Tarefas ativas', tasks: active }) : undefined}
        />
        <StatCard
          label="Expiradas"
          value={expired.length}
          accent="rose"
          onClick={expired.length > 0 ? () => setListModal({ title: 'Expiradas', tasks: expired }) : undefined}
        />
        <StatCard
          label="Pontos perdidos"
          value={lostPoints}
          accent="rose"
          prefix="-"
          onClick={expired.length > 0 ? () => setListModal({ title: 'Tarefas que geraram pontos perdidos', tasks: expired }) : undefined}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/communities"
          className="glass-panel rounded-2xl px-5 py-4 flex items-center justify-between hover:border-purple-500/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Users size={16} className="text-purple-300 light:text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-white light:text-zinc-900">Minhas comunidades</p>
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
              <Podium size={16} className="text-rose-300 light:text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-white light:text-zinc-900">Ranking Geral</p>
              <p className="text-xs text-zinc-500">Ranking de negligência de toda a plataforma</p>
            </div>
          </div>
        </Link>
      </div>

      {nearCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-300 light:text-amber-600 bg-amber-500/[0.06] border border-amber-500/25 rounded-xl px-4 py-2.5">
          <TrendingDown size={14} className="shrink-0" />
          {nearCount} tarefa{nearCount !== 1 ? 's' : ''} perto do prazo — evite perder pontos.
        </div>
      )}

      {expired.length > 0 && (
        <Section title="Expiradas — penalizadas" icon={<TrendingDown size={16} className="text-rose-400 light:text-rose-600" />}>
          {expired.map((t) => (
            <TaskCard key={t.id} task={t} showCommunity={multiCommunity} />
          ))}
        </Section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {availableCategories.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-purple-400 light:text-purple-600 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input !w-auto !py-1.5 !text-xs"
            >
              <option value="all" style={optionStyle}>
                Todas as categorias
              </option>
              {availableCategories.map((c) => (
                <option key={c} value={c} style={optionStyle}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ListFilter size={13} className="text-purple-400 light:text-purple-600 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | KanbanColumn)}
            className="input !w-auto !py-1.5 !text-xs"
          >
            <option value="all" style={optionStyle}>
              Todos os status
            </option>
            {KANBAN_COLUMNS.map((c) => (
              <option key={c.key} value={c.key} style={optionStyle}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {assignedSubtaskTasks.length > 0 && (
        <Section title="Subtarefas atribuídas a você" icon={<UserCog size={14} className="text-sky-300 light:text-sky-700" />}>
          {assignedSubtaskTasks.map((t) => (
            <TaskCard key={t.id} task={t} showOwner showCommunity={multiCommunity} assignedSubtaskOnly />
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
        <Section title="Em andamento" icon={<Play size={14} className="text-sky-300 light:text-sky-700" />}>
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
      {listModal && (
        <TaskListModal
          title={listModal.title}
          tasks={listModal.tasks}
          showCommunity={multiCommunity}
          onClose={() => setListModal(null)}
        />
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 light:text-zinc-700 mb-3">
        {icon} {title}
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="sm:col-span-2 glass-panel rounded-2xl p-8 text-center">
      <p className="text-zinc-400 light:text-zinc-600 text-sm">Nenhuma tarefa ativa. Planeje sua próxima execução.</p>
      <button onClick={onCreate} className="btn-secondary !w-auto px-4 mx-auto mt-4">
        <Plus size={15} /> Criar tarefa
      </button>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  prefix = '',
  onClick,
}: {
  label: string
  value: number
  accent: 'purple' | 'amber' | 'rose'
  prefix?: string
  onClick?: () => void
}) {
  const colors = {
    purple: 'text-purple-300 light:text-purple-600',
    amber: 'text-amber-300 light:text-amber-600',
    rose: 'text-rose-400 light:text-rose-600',
  }
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`glass-panel rounded-2xl p-4 text-left transition-colors ${onClick ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'}`}
    >
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>
        {prefix}
        {value}
      </p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
    </button>
  )
}
