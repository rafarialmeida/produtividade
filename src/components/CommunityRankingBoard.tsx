import { useEffect, useState } from 'react'
import { Loader2, Swords, Timer, Users } from 'lucide-react'
import { useAppStore, type CommunityRankingEntry } from '../store/useStore'
import { computeCompositeRanking } from '../utils/ranking'
import { formatDurationHours } from '../utils/date'
import RankBadge from './RankBadge'

export default function CommunityRankingBoard({ communityId }: { communityId: string }) {
  const fetchWorkCommunityRankings = useAppStore((s) => s.fetchWorkCommunityRankings)
  const [rankings, setRankings] = useState<CommunityRankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchWorkCommunityRankings().then((rows) => {
      if (cancelled) return
      setRankings(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchWorkCommunityRankings])

  const ranked = computeCompositeRanking(
    rankings.map((c) => ({
      id: c.communityId,
      leadTimeHours: c.leadTimeHours,
      cycleTimeHours: c.cycleTimeHours,
      tasksCompleted: c.tasksCompleted,
      subtasksCompleted: c.subtasksCompleted,
    })),
  ).map((r) => ({ ...r, community: rankings.find((c) => c.communityId === r.item.id)! }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Swords size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Ranking entre Comunidades de Trabalho</h2>
      </div>
      <p className="text-xs text-zinc-500">
        Sua comunidade comparada com as demais comunidades de Trabalho da plataforma — posição média em 4 critérios: lead
        time médio, cycle time médio, tarefas concluídas e subtarefas concluídas.
      </p>
      <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            {ranked.map(({ item, compositeRank, community }) => {
              const isCurrent = item.id === communityId
              return (
                <div key={item.id} className={`px-5 py-3.5 flex items-center gap-4 ${isCurrent ? 'bg-sky-500/[0.06]' : ''}`}>
                  <RankBadge rank={compositeRank} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${isCurrent ? 'text-sky-300' : 'text-white light:text-zinc-900'}`}>
                        {community.name}
                        {isCurrent && ' (sua comunidade)'}
                      </p>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-600 shrink-0">
                        <Users size={10} /> {community.memberCount} membro{community.memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Timer size={10} /> Lead {formatDurationHours(community.leadTimeHours)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer size={10} /> Cycle {formatDurationHours(community.cycleTimeHours)}
                      </span>
                      <span>{community.tasksCompleted} tarefas concluídas</span>
                      <span>{community.subtasksCompleted} subtarefas concluídas</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {ranked.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">Nenhuma comunidade de trabalho ainda.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
