import { useMemo, useState } from 'react'
import { Clock, History, LayoutDashboard, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { URGENCY_POINTS } from '../types'
import { formatDeadline, formatRelative } from '../utils/date'
import TaskDetailModal from './TaskDetailModal'

interface MemberStat {
  userId: string
  name: string
  avatarUrl?: string
  total: number
  active: number
  completed: number
  expired: number
  lostPoints: number
  positivePoints: number
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
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const communityTasks = useMemo(() => allTasks.filter((t) => t.communityId === communityId), [allTasks, communityId])

  const stats: MemberStat[] = useMemo(() => {
    if (!community) return []
    return community.memberIds.map((id) => {
      const user = users.find((u) => u.id === id)
      const memberTasks = communityTasks.filter((t) => t.userId === id)
      const completed = memberTasks.filter((t) => t.completed)
      const expired = memberTasks.filter((t) => t.expired && !t.completed)
      const active = memberTasks.filter((t) => !t.completed && !t.expired)
      return {
        userId: id,
        name: user?.name ?? 'Membro',
        avatarUrl: user?.avatarUrl,
        total: memberTasks.length,
        active: active.length,
        completed: completed.length,
        expired: expired.length,
        lostPoints: expired.reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0),
        positivePoints: completed.reduce((sum, t) => sum + 1 + t.subtasks.length, 0),
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

  if (!community) return null

  const totalTasks = communityTasks.length
  const totalActive = communityTasks.filter((t) => !t.completed && !t.expired).length
  const totalExpired = communityTasks.filter((t) => t.expired && !t.completed).length

  const lowestProductivity = [...stats].filter((s) => s.total > 0).sort((a, b) => a.positivePoints - b.positivePoints)[0]
  const mostDelivering = [...stats].sort((a, b) => b.completed - a.completed)[0]
  const mostDemand = [...stats].sort((a, b) => b.active - a.active)[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <LayoutDashboard size={16} className="text-purple-400" />
        <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Dashboard da Equipe</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Tarefas no total" value={totalTasks} accent="purple" />
        <StatCard label="Ativas" value={totalActive} accent="amber" />
        <StatCard label="Expiradas" value={totalExpired} accent="rose" />
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
          {mostDemand && mostDemand.active > 0 && (
            <HighlightCard
              icon={Users}
              color="purple"
              label="Mais demanda"
              name={mostDemand.name}
              detail={`${mostDemand.active} ativa${mostDemand.active !== 1 ? 's' : ''}`}
            />
          )}
          {lowestProductivity && (
            <HighlightCard
              icon={TrendingDown}
              color="rose"
              label="Menor produtividade"
              name={lowestProductivity.name}
              detail={`${lowestProductivity.positivePoints} pt${lowestProductivity.positivePoints !== 1 ? 's' : ''} positivos`}
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
                <th className="px-3 py-2 font-medium text-right">Ativas</th>
                <th className="px-3 py-2 font-medium text-right">Concluídas</th>
                <th className="px-3 py-2 font-medium text-right">Expiradas</th>
                <th className="px-3 py-2 font-medium text-right">Pontos +</th>
                <th className="px-3 py-2 font-medium text-right">Pontos -</th>
                <th className="px-3 py-2 font-medium text-right">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.userId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 text-zinc-200 light:text-zinc-800 whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-400 light:text-zinc-600 tabular-nums">{s.active}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-400 tabular-nums">{s.completed}</td>
                  <td className="px-3 py-2.5 text-right text-rose-400 tabular-nums">{s.expired}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-300 tabular-nums">+{s.positivePoints}</td>
                  <td className="px-3 py-2.5 text-right text-rose-300 tabular-nums">-{s.lostPoints}</td>
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

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'purple' | 'amber' | 'rose' }) {
  const colors = { purple: 'text-purple-300', amber: 'text-amber-300', rose: 'text-rose-400' }
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
    </div>
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
