import { useMemo } from 'react'
import { Swords, Timer, Trophy } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { computeCompositeRanking } from '../utils/ranking'
import { formatDurationHours } from '../utils/date'

export default function CommunityMemberRanking({ communityId }: { communityId: string }) {
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const allTasks = useAppStore((s) => s.tasks)
  const communityTasks = useMemo(() => allTasks.filter((t) => t.communityId === communityId), [allTasks, communityId])

  const metrics = useMemo(() => {
    if (!community) return []
    const leadByUser = new Map<string, number[]>()
    const cycleByUser = new Map<string, number[]>()
    const tasksCompletedByUser = new Map<string, number>()
    const subtasksCompletedByUser = new Map<string, number>()

    for (const t of communityTasks) {
      if (!t.completed || !t.completedAt) continue
      const leadHours = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
      leadByUser.set(t.userId, [...(leadByUser.get(t.userId) ?? []), leadHours])
      if (t.startedAt) {
        const cycleHours = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 3600000
        cycleByUser.set(t.userId, [...(cycleByUser.get(t.userId) ?? []), cycleHours])
      }
      tasksCompletedByUser.set(t.userId, (tasksCompletedByUser.get(t.userId) ?? 0) + 1)
      for (const s of t.subtasks) {
        const creditedTo = s.assigneeId ?? t.userId
        subtasksCompletedByUser.set(creditedTo, (subtasksCompletedByUser.get(creditedTo) ?? 0) + 1)
      }
    }

    const avg = (arr?: number[]) => (arr && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined)

    return community.memberIds.map((id) => {
      const user = users.find((u) => u.id === id)
      return {
        id,
        name: user?.name ?? 'Membro',
        avatarUrl: user?.avatarUrl,
        leadTimeHours: avg(leadByUser.get(id)),
        cycleTimeHours: avg(cycleByUser.get(id)),
        tasksCompleted: tasksCompletedByUser.get(id) ?? 0,
        subtasksCompleted: subtasksCompletedByUser.get(id) ?? 0,
      }
    })
  }, [community, communityTasks, users])

  const ranked = computeCompositeRanking(metrics)

  if (!community) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Swords size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Ranking da Comunidade</h2>
      </div>
      <p className="text-xs text-zinc-500">
        Posição média em 4 critérios: lead time médio, cycle time médio, tarefas concluídas e subtarefas concluídas.
      </p>
      <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
        {ranked.map(({ item, compositeRank }) => (
          <div key={item.id} className="px-5 py-3.5 flex items-center gap-4">
            <div
              className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                compositeRank === 1
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-white/5 text-zinc-400 border border-white/10 light:bg-black/[0.03] light:text-zinc-600 light:border-black/10'
              }`}
            >
              {compositeRank === 1 ? <Trophy size={15} /> : (compositeRank ?? '—')}
            </div>
            {item.avatarUrl ? (
              <img src={item.avatarUrl} alt={item.name} className="w-8 h-8 shrink-0 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                {item.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white light:text-zinc-900 truncate">{item.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Timer size={10} /> Lead {formatDurationHours(item.leadTimeHours)}
                </span>
                <span className="flex items-center gap-1">
                  <Timer size={10} /> Cycle {formatDurationHours(item.cycleTimeHours)}
                </span>
                <span>{item.tasksCompleted} tarefas</span>
                <span>{item.subtasksCompleted} subtarefas</span>
              </div>
            </div>
          </div>
        ))}
        {ranked.length === 0 && <div className="px-5 py-8 text-center text-sm text-zinc-500">Nenhum membro ainda.</div>}
      </div>
    </div>
  )
}
