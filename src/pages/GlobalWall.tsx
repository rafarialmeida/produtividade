import { useEffect, useState } from 'react'
import { Crown, Flame, Globe2, Loader2, Swords, Timer, Trophy, Users } from 'lucide-react'
import { useAppStore, type CommunityRankingEntry, type GlobalWallEntry } from '../store/useStore'
import ProfileModal from '../components/ProfileModal'
import RankBadge from '../components/RankBadge'
import { computeCompositeRanking } from '../utils/ranking'
import { formatDurationHours } from '../utils/date'
import { formatDisplayName } from '../utils/name'

type Tab = 'positive' | 'negative' | 'communities'

export default function GlobalWall() {
  const fetchGlobalWall = useAppStore((s) => s.fetchGlobalWall)
  const fetchCompetitionCommunityRankings = useAppStore((s) => s.fetchCompetitionCommunityRankings)
  const [ranking, setRanking] = useState<GlobalWallEntry[]>([])
  const [communityRanking, setCommunityRanking] = useState<CommunityRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCommunities, setLoadingCommunities] = useState(true)
  const [tab, setTab] = useState<Tab>('positive')
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchGlobalWall().then((rows) => {
      if (cancelled) return
      setRanking(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchGlobalWall])

  useEffect(() => {
    let cancelled = false
    fetchCompetitionCommunityRankings().then((rows) => {
      if (cancelled) return
      setCommunityRanking(rows)
      setLoadingCommunities(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchCompetitionCommunityRankings])

  const sorted = [...ranking].sort((a, b) =>
    tab === 'positive' ? b.personalPositivePoints - a.personalPositivePoints : b.personalLostPoints - a.personalLostPoints,
  )
  const maxPoints = Math.max(
    1,
    sorted[0]?.[tab === 'positive' ? 'personalPositivePoints' : 'personalLostPoints'] ?? 1,
  )

  const rankedCommunities = computeCompositeRanking(
    communityRanking.map((c) => ({
      id: c.communityId,
      leadTimeHours: c.leadTimeHours,
      cycleTimeHours: c.cycleTimeHours,
      tasksCompleted: c.tasksCompleted,
      subtasksCompleted: c.subtasksCompleted,
    })),
  ).map((r) => ({ ...r, community: communityRanking.find((c) => c.communityId === r.item.id)! }))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white light:text-zinc-900 flex items-center gap-2.5">
          <Globe2 className="text-purple-400" size={22} /> Muro Global
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Ranking de tarefas gerais de toda a plataforma — clique em alguém para ver o perfil
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setTab('positive')}
          className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
            tab === 'positive'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
          }`}
        >
          <Trophy size={14} /> Ranking de execução
        </button>
        <button
          onClick={() => setTab('negative')}
          className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
            tab === 'negative'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
          }`}
        >
          <Flame size={14} /> Muro da Procrastinação
        </button>
        <button
          onClick={() => setTab('communities')}
          className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
            tab === 'communities'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
              : 'text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
          }`}
        >
          <Swords size={14} /> Comunidades de Competição
        </button>
      </div>

      {tab !== 'communities' ? (
        <div className="glass-panel neon-border-purple rounded-2xl overflow-hidden">
          {loading ? (
            <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sorted.map((entry, i) => {
                const points = tab === 'positive' ? entry.personalPositivePoints : entry.personalLostPoints
                const isLeader = i === 0 && points > 0
                const barWidth = points === 0 ? 0 : Math.max(6, (points / maxPoints) * 100)
                const positive = tab === 'positive'
                return (
                  <button
                    key={entry.userId}
                    onClick={() => setOpenProfileId(entry.userId)}
                    className={`w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-white/[0.03] transition-colors ${
                      isLeader ? (positive ? 'bg-emerald-500/[0.06]' : 'bg-rose-500/[0.06]') : ''
                    }`}
                  >
                    {positive ? (
                      <RankBadge rank={points > 0 ? i + 1 : null} />
                    ) : (
                      <div
                        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isLeader
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-white/5 text-zinc-400 border border-white/10 light:bg-black/[0.03] light:text-zinc-600 light:border-black/10'
                        }`}
                      >
                        {isLeader ? <Flame size={15} /> : i + 1}
                      </div>
                    )}

                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.name} className="w-8 h-8 shrink-0 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                        {entry.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white light:text-zinc-900 truncate">{formatDisplayName(entry.name)}</p>
                        {entry.role === 'admin' && <Crown size={12} className="text-amber-400 shrink-0" />}
                        <span className="text-[11px] text-zinc-600">
                          · {entry.communityCount} comunidade{entry.communityCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 light:bg-black/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isLeader ? (positive ? 'bg-emerald-500' : 'bg-rose-500') : positive ? 'bg-emerald-500/60' : 'bg-rose-500/60'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-lg font-bold tabular-nums ${
                          isLeader ? (positive ? 'text-emerald-400' : 'text-rose-400') : 'text-white light:text-zinc-900'
                        }`}
                      >
                        {positive ? '+' : '-'}
                        {points}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {positive
                          ? `${entry.personalTasksCompleted} tarefa${entry.personalTasksCompleted !== 1 ? 's' : ''} concluída${entry.personalTasksCompleted !== 1 ? 's' : ''}`
                          : `${entry.personalTasksExpired} tarefa${entry.personalTasksExpired !== 1 ? 's' : ''} perdida${entry.personalTasksExpired !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </button>
                )
              })}
              {sorted.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-zinc-500">Ninguém na plataforma ainda.</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            Comunidades de Competição ranqueadas pela posição média em 4 critérios: lead time médio, cycle time médio,
            tarefas concluídas e subtarefas concluídas.
          </p>
          <div className="glass-panel neon-border-purple rounded-2xl overflow-hidden">
            {loadingCommunities ? (
              <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {rankedCommunities.map(({ item, compositeRank, community }) => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                    <RankBadge rank={compositeRank} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white light:text-zinc-900 truncate">{community.name}</p>
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
                ))}
                {rankedCommunities.length === 0 && (
                  <div className="px-6 py-10 text-center text-sm text-zinc-500">Nenhuma comunidade de competição ainda.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {openProfileId && <ProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />}
    </div>
  )
}
