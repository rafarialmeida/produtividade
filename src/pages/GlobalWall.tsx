import { useEffect, useState } from 'react'
import { Crown, Flame, Globe2, Loader2 } from 'lucide-react'
import { useAppStore, type GlobalWallEntry } from '../store/useStore'

export default function GlobalWall() {
  const fetchGlobalWall = useAppStore((s) => s.fetchGlobalWall)
  const [ranking, setRanking] = useState<GlobalWallEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchGlobalWall().then((rows) => {
      if (cancelled) return
      setRanking(rows.filter((r) => r.communityCount > 0).sort((a, b) => b.lostPoints - a.lostPoints))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchGlobalWall])

  const maxPoints = Math.max(1, ranking[0]?.lostPoints ?? 1)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Globe2 className="text-purple-400" size={22} /> Muro Global
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Ranking invertido de toda a plataforma — soma de pontos perdidos em todas as comunidades
        </p>
      </div>

      <div className="glass-panel neon-border-purple rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-14 flex items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {ranking.map((entry, i) => {
              const isLeader = i === 0 && entry.lostPoints > 0
              const barWidth = entry.lostPoints === 0 ? 0 : Math.max(6, (entry.lostPoints / maxPoints) * 100)
              return (
                <div key={entry.userId} className={`px-6 py-4 flex items-center gap-4 ${isLeader ? 'bg-rose-500/[0.06]' : ''}`}>
                  <div
                    className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isLeader
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                    }`}
                  >
                    {isLeader ? <Flame size={15} /> : i + 1}
                  </div>

                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                    {entry.name.slice(0, 1).toUpperCase()}
                  </div>

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
                        className={`h-full rounded-full ${isLeader ? 'bg-rose-500' : 'bg-purple-500/70'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${isLeader ? 'text-rose-400' : 'text-white'}`}>
                      -{entry.lostPoints}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {entry.expiredCount} tarefa{entry.expiredCount !== 1 ? 's' : ''} perdida{entry.expiredCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
            {ranking.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">Ninguém na plataforma ainda.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
