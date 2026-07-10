import { useEffect, useState } from 'react'
import { Crown, Flame, Globe2, Loader2, Trophy } from 'lucide-react'
import { useAppStore, type GlobalWallEntry } from '../store/useStore'
import ProfileModal from '../components/ProfileModal'

type Tab = 'positive' | 'negative'

export default function GlobalWall() {
  const fetchGlobalWall = useAppStore((s) => s.fetchGlobalWall)
  const [ranking, setRanking] = useState<GlobalWallEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('positive')
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchGlobalWall().then((rows) => {
      if (cancelled) return
      setRanking(rows.filter((r) => r.communityCount > 0))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchGlobalWall])

  const sorted = [...ranking].sort((a, b) =>
    tab === 'positive' ? b.positivePoints - a.positivePoints : b.lostPoints - a.lostPoints,
  )
  const maxPoints = Math.max(1, sorted[0]?.[tab === 'positive' ? 'positivePoints' : 'lostPoints'] ?? 1)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Globe2 className="text-purple-400" size={22} /> Muro Global
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Ranking de toda a plataforma — clique em alguém para ver o perfil</p>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => setTab('positive')}
          className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
            tab === 'positive' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Trophy size={14} /> Ranking de execução
        </button>
        <button
          onClick={() => setTab('negative')}
          className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg transition-colors ${
            tab === 'negative' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Flame size={14} /> Muro da Procrastinação
        </button>
      </div>

      <div className="glass-panel neon-border-purple rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((entry, i) => {
              const points = tab === 'positive' ? entry.positivePoints : entry.lostPoints
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
                  <div
                    className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isLeader
                        ? positive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                    }`}
                  >
                    {isLeader ? (positive ? <Trophy size={15} /> : <Flame size={15} />) : i + 1}
                  </div>

                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.name} className="w-8 h-8 shrink-0 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                      {entry.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                      {entry.role === 'admin' && <Crown size={12} className="text-amber-400 shrink-0" />}
                      <span className="text-[11px] text-zinc-600">
                        · {entry.communityCount} comunidade{entry.communityCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
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
                        isLeader ? (positive ? 'text-emerald-400' : 'text-rose-400') : 'text-white'
                      }`}
                    >
                      {positive ? '+' : '-'}
                      {points}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {positive
                        ? `${entry.tasksCompleted} tarefa${entry.tasksCompleted !== 1 ? 's' : ''} concluída${entry.tasksCompleted !== 1 ? 's' : ''}`
                        : `${entry.tasksExpired} tarefa${entry.tasksExpired !== 1 ? 's' : ''} perdida${entry.tasksExpired !== 1 ? 's' : ''}`}
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

      {openProfileId && <ProfileModal userId={openProfileId} onClose={() => setOpenProfileId(null)} />}
    </div>
  )
}
