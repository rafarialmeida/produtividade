import { useMemo, useState } from 'react'
import { Clock, History, LayoutDashboard, Timer, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { COMPLEXITY_MULTIPLIER, URGENCY_POINTS } from '../types'
import type { Task } from '../types'
import { formatDeadline, formatDurationHours, formatRelative } from '../utils/date'
import { formatDisplayName } from '../utils/name'
import { getTaskStatus, TASK_STATUS_CONFIG, type TaskStatus } from '../utils/taskStatus'
import TaskDetailModal from './TaskDetailModal'
import MemberHoursModal from './MemberHoursModal'
import OnlineDot from './OnlineDot'
import TaskListModal from './TaskListModal'

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

interface MemberStat {
  userId: string
  name: string
  avatarUrl?: string
  total: number
  inProgress: number
  notStarted: number
  completed: number
  expired: number
  lostPoints: number
  positivePoints: number
  hours: number
  perWeek: number
}

function avgDurationLabel(hoursList: number[]): string {
  if (hoursList.length === 0) return '—'
  return formatDurationHours(hoursList.reduce((a, b) => a + b, 0) / hoursList.length)
}

export default function CommunityDashboard({
  communityId,
  onViewHistory,
}: {
  communityId: string
  onViewHistory: (userId: string) => void
}) {
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const allTasks = useAppStore((s) => s.tasks)
  const onlineUserIds = useAppStore((s) => s.onlineUserIds)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all')
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [hoursUserId, setHoursUserId] = useState<string | null>(null)
  const [listModal, setListModal] = useState<{ title: string; tasks: Task[] } | null>(null)

  const communityTasks = useMemo(() => allTasks.filter((t) => t.communityId === communityId), [allTasks, communityId])

  const stats: MemberStat[] = useMemo(() => {
    if (!community) return []
    const weeksElapsed = Math.max(1, (Date.now() - new Date(community.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))

    // Pontos positivos são creditados a quem efetivamente fez o trabalho: a
    // tarefa em si sempre credita o responsável pela tarefa, mas cada
    // subtarefa credita seu próprio responsável (se atribuído), não
    // necessariamente o dono da tarefa.
    const positiveByUser = new Map<string, number>()
    for (const t of communityTasks) {
      if (!t.completed) continue
      const mult = COMPLEXITY_MULTIPLIER[t.complexity]
      positiveByUser.set(t.userId, (positiveByUser.get(t.userId) ?? 0) + mult)
      for (const s of t.subtasks) {
        const creditedTo = s.assigneeId ?? t.userId
        positiveByUser.set(creditedTo, (positiveByUser.get(creditedTo) ?? 0) + mult)
      }
    }

    return community.memberIds.map((id) => {
      const user = users.find((u) => u.id === id)
      const memberTasks = communityTasks.filter((t) => t.userId === id)
      const completed = memberTasks.filter((t) => t.completed)
      const expired = memberTasks.filter((t) => t.expired && !t.completed)
      const inProgress = memberTasks.filter((t) => !t.completed && !t.expired && t.started)
      const notStarted = memberTasks.filter((t) => !t.completed && !t.expired && !t.started)
      return {
        userId: id,
        name: user?.name ?? 'Membro',
        avatarUrl: user?.avatarUrl,
        total: memberTasks.length,
        inProgress: inProgress.length,
        notStarted: notStarted.length,
        completed: completed.length,
        expired: expired.length,
        lostPoints: expired.reduce((sum, t) => sum + URGENCY_POINTS[t.urgency] * COMPLEXITY_MULTIPLIER[t.complexity], 0),
        positivePoints: positiveByUser.get(id) ?? 0,
        hours: completed.reduce((sum, t) => sum + (t.minutesSpent ?? 0), 0) / 60,
        perWeek: completed.length / weeksElapsed,
      }
    })
  }, [community, communityTasks, users])

  const upcoming = useMemo(
    () =>
      communityTasks
        .filter((t) => !t.completed && !t.expired)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 6),
    [communityTasks],
  )

  const { leadLabel, cycleLabel } = useMemo(() => {
    const completed = communityTasks.filter((t) => t.completed && t.completedAt)
    const leadHours = completed.map((t) => (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600000)
    const cycleHours = completed
      .filter((t) => t.startedAt)
      .map((t) => (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / 3600000)
    return { leadLabel: avgDurationLabel(leadHours), cycleLabel: avgDurationLabel(cycleHours) }
  }, [communityTasks])

  const filteredTasks = useMemo(() => {
    const cutoff = Date.now() - TWO_WEEKS_MS
    return communityTasks
      .filter((t) => (taskFilter === 'all' ? true : getTaskStatus(t) === taskFilter))
      .filter((t) => {
        if (taskFilter !== 'concluida' || showAllCompleted || !t.completed) return true
        const completedTime = t.completedAt ? new Date(t.completedAt).getTime() : 0
        return completedTime >= cutoff
      })
      .sort((a, b) => {
        const da = a.completed ? (a.completedAt ?? a.deadline) : a.deadline
        const db = b.completed ? (b.completedAt ?? b.deadline) : b.deadline
        return db.localeCompare(da)
      })
  }, [communityTasks, taskFilter, showAllCompleted])

  if (!community) return null

  const inProgressTasks = communityTasks.filter((t) => !t.completed && !t.expired && t.started)
  const notStartedTasks = communityTasks.filter((t) => !t.completed && !t.expired && !t.started)
  const expiredTasks = communityTasks.filter((t) => t.expired && !t.completed)

  const lowestProductivity = [...stats].filter((s) => s.total > 0).sort((a, b) => a.positivePoints - b.positivePoints)[0]
  const mostDelivering = [...stats].sort((a, b) => b.completed - a.completed)[0]
  const mostDemand = [...stats].sort((a, b) => b.inProgress + b.notStarted - (a.inProgress + a.notStarted))[0]

  const taskFilters: { key: 'all' | TaskStatus; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'nao_iniciada', label: 'Não iniciadas' },
    { key: 'em_andamento', label: 'Em andamento' },
    { key: 'expirada', label: 'Expiradas' },
    { key: 'concluida', label: 'Concluídas' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <LayoutDashboard size={16} className="text-purple-400" />
        <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Dashboard da Equipe</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Tarefas no total"
          value={communityTasks.length}
          accent="purple"
          onClick={communityTasks.length > 0 ? () => setListModal({ title: 'Tarefas no total', tasks: communityTasks }) : undefined}
        />
        <StatCard
          label="Em andamento"
          value={inProgressTasks.length}
          accent="sky"
          onClick={inProgressTasks.length > 0 ? () => setListModal({ title: 'Em andamento', tasks: inProgressTasks }) : undefined}
        />
        <StatCard
          label="Não iniciadas"
          value={notStartedTasks.length}
          accent="amber"
          onClick={notStartedTasks.length > 0 ? () => setListModal({ title: 'Não iniciadas', tasks: notStartedTasks }) : undefined}
        />
        <StatCard
          label="Expiradas"
          value={expiredTasks.length}
          accent="rose"
          onClick={expiredTasks.length > 0 ? () => setListModal({ title: 'Expiradas', tasks: expiredTasks }) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <Timer size={12} /> Lead time médio
          </p>
          <p className="text-xl font-bold text-white light:text-zinc-900 mt-1">{leadLabel}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Da criação até a conclusão</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <Timer size={12} /> Cycle time médio
          </p>
          <p className="text-xl font-bold text-white light:text-zinc-900 mt-1">{cycleLabel}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Do início até a conclusão</p>
        </div>
      </div>

      {(mostDelivering?.total || mostDemand?.total || lowestProductivity) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {mostDelivering && mostDelivering.completed > 0 && (
            <HighlightCard
              icon={TrendingUp}
              color="emerald"
              label="Entregando mais"
              name={mostDelivering.name}
              detail={`${mostDelivering.completed} concluída${mostDelivering.completed !== 1 ? 's' : ''}`}
            />
          )}
          {mostDemand && mostDemand.inProgress + mostDemand.notStarted > 0 && (
            <HighlightCard
              icon={Users}
              color="purple"
              label="Mais demanda"
              name={mostDemand.name}
              detail={`${mostDemand.inProgress + mostDemand.notStarted} pendente${mostDemand.inProgress + mostDemand.notStarted !== 1 ? 's' : ''}`}
            />
          )}
          {lowestProductivity && (
            <HighlightCard
              icon={TrendingDown}
              color="rose"
              label="Menor produtividade"
              name={lowestProductivity.name}
              detail={`${lowestProductivity.positivePoints.toFixed(1)} pt${lowestProductivity.positivePoints !== 1 ? 's' : ''} positivos`}
            />
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">
            <Clock size={12} /> Próximos prazos
          </p>
          <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
            {upcoming.map((t) => {
              const owner = users.find((u) => u.id === t.userId)
              return (
                <button
                  key={t.id}
                  onClick={() => setDetailTaskId(t.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-left hover:bg-white/5 light:hover:bg-black/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                    <p className="text-zinc-500">{owner?.name ?? 'Membro'}</p>
                  </div>
                  <span className="text-zinc-500 shrink-0">
                    {formatDeadline(t.deadline)} ({formatRelative(t.deadline)})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Por membro</p>
        <div className="glass-panel rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-white/5">
                <th className="px-4 py-2 font-medium">Membro</th>
                <th className="px-3 py-2 font-medium text-right">Em andamento</th>
                <th className="px-3 py-2 font-medium text-right">Não iniciadas</th>
                <th className="px-3 py-2 font-medium text-right">Concluídas</th>
                <th className="px-3 py-2 font-medium text-right">Expiradas</th>
                <th className="px-3 py-2 font-medium text-right">Itens/semana</th>
                <th className="px-3 py-2 font-medium text-right">Horas</th>
                <th className="px-3 py-2 font-medium text-right">Pontos +</th>
                <th className="px-3 py-2 font-medium text-right">Pontos -</th>
                <th className="px-3 py-2 font-medium text-right">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.userId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 text-zinc-200 light:text-zinc-800 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt={s.name} className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-purple-600/50 to-emerald-500/50 flex items-center justify-center text-[9px] font-semibold text-white">
                          {s.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <OnlineDot online={onlineUserIds.has(s.userId)} />
                      {formatDisplayName(s.name)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-sky-300 tabular-nums">{s.inProgress}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400 light:text-zinc-600 tabular-nums">{s.notStarted}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums">{s.completed}</td>
                  <td className="px-3 py-2.5 text-right text-rose-400 tabular-nums">{s.expired}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400 light:text-zinc-600 tabular-nums">{s.perWeek.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400 light:text-zinc-600 tabular-nums">{s.hours.toFixed(1)}h</td>
                  <td className="px-3 py-2.5 text-right text-emerald-300 tabular-nums">+{s.positivePoints.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right text-rose-300 tabular-nums">-{s.lostPoints.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => onViewHistory(s.userId)}
                      title="Ver histórico"
                      className="p-1 rounded text-zinc-500 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    >
                      <History size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Horas gastas por membro</p>
        <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
          {[...stats]
            .sort((a, b) => b.hours - a.hours)
            .map((s) => (
              <button
                key={s.userId}
                onClick={() => setHoursUserId(s.userId)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 text-xs text-left hover:bg-white/5 light:hover:bg-black/5 transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.name} className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-purple-600/50 to-emerald-500/50 flex items-center justify-center text-[9px] font-semibold text-white">
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-zinc-200 light:text-zinc-800 truncate">{formatDisplayName(s.name)}</span>
                </span>
                <span className="text-zinc-400 light:text-zinc-600 tabular-nums shrink-0">{s.hours.toFixed(1)}h</span>
              </button>
            ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-medium text-zinc-400 light:text-zinc-600">Tarefas</p>
          <div className="flex flex-wrap gap-1">
            {taskFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setTaskFilter(f.key)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  taskFilter === f.key
                    ? 'bg-white/10 text-white light:bg-black/[0.06] light:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {taskFilter === 'concluida' && (
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showAllCompleted}
              onChange={(e) => setShowAllCompleted(e.target.checked)}
              className="accent-purple-500"
            />
            Ver todas (por padrão só as últimas 2 semanas)
          </label>
        )}
        <div className="glass-panel rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-white/5">
                <th className="px-4 py-2 font-medium">Tarefa</th>
                <th className="px-3 py-2 font-medium">Responsável</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Complexidade</th>
                <th className="px-3 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Nenhuma tarefa nesse filtro.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => setDetailTaskId(t.id)} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
      {hoursUserId && (
        <MemberHoursModal
          name={stats.find((s) => s.userId === hoursUserId)?.name ?? 'Membro'}
          tasks={communityTasks.filter((t) => t.userId === hoursUserId)}
          onClose={() => setHoursUserId(null)}
        />
      )}
      {listModal && (
        <TaskListModal title={listModal.title} tasks={listModal.tasks} showOwner onClose={() => setListModal(null)} />
      )}
    </div>
  )
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const users = useAppStore((s) => s.users)
  const owner = users.find((u) => u.id === task.userId)
  const status = getTaskStatus(task)
  const statusCfg = TASK_STATUS_CONFIG[status]
  const dateLabel = task.completed
    ? task.completedAt && `Concluída ${formatDeadline(task.completedAt)}`
    : `Prazo ${formatDeadline(task.deadline)}`

  return (
    <tr onClick={onClick} className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 light:hover:bg-black/5 transition-colors">
      <td className="px-4 py-2.5 text-zinc-200 light:text-zinc-800 max-w-[220px] truncate">{task.title}</td>
      <td className="px-3 py-2.5 text-zinc-400 light:text-zinc-600 whitespace-nowrap">{owner?.name ?? 'Membro'}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-zinc-400 light:text-zinc-600 capitalize whitespace-nowrap">{task.complexity}</td>
      <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">{dateLabel}</td>
    </tr>
  )
}

function StatCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string
  value: number
  accent: 'purple' | 'amber' | 'rose' | 'sky'
  onClick?: () => void
}) {
  const colors = { purple: 'text-purple-300', amber: 'text-amber-300', rose: 'text-rose-400', sky: 'text-sky-300' }
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`glass-panel rounded-2xl p-4 text-left transition-colors ${onClick ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'}`}
    >
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
    </button>
  )
}

function HighlightCard({
  icon: Icon,
  color,
  label,
  name,
  detail,
}: {
  icon: typeof TrendingUp
  color: 'emerald' | 'purple' | 'rose'
  label: string
  name: string
  detail: string
}) {
  const styles = {
    emerald: { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/25', text: 'text-emerald-300' },
    purple: { bg: 'bg-purple-500/[0.06]', border: 'border-purple-500/25', text: 'text-purple-300' },
    rose: { bg: 'bg-rose-500/[0.06]', border: 'border-rose-500/25', text: 'text-rose-300' },
  }[color]
  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-medium ${styles.text}`}>
        <Icon size={12} /> {label}
      </p>
      <p className="text-sm font-semibold text-white light:text-zinc-900 mt-1 truncate">{name}</p>
      <p className="text-[11px] text-zinc-500">{detail}</p>
    </div>
  )
}
