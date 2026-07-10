import { useMemo } from 'react'
import { Crown, Flame, Skull } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { URGENCY_POINTS } from '../types'

export default function ProcrastinationWall({ communityId }: { communityId: string }) {
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const allTasks = useAppStore((s) => s.tasks)
  const tasks = useMemo(() => allTasks.filter((t) => t.communityId === communityId), [allTasks, communityId])

  if (!community) return null

  const members = community.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))

  const ranking = members
    .map((u) => {
      const expiredTasks = tasks.filter((t) => t.userId === u.id && t.expired && !t.completed)
      const lostPoints = expiredTasks.reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)
      return { user: u, lostPoints, expiredCount: expiredTasks.length }
    })
    .sort((a, b) => b.lostPoints - a.lostPoints)

  const maxPoints = Math.max(1, ranking[0]?.lostPoints ?? 1)

  return (
    <div className="glass-panel neon-border-purple rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 light:border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skull className="text-purple-400" size={20} />
          <div>
            <h2 className="font-bold text-white light:text-zinc-900 text-lg">O Muro da Procrastinação</h2>
            <p className="text-xs text-zinc-500">Ranking invertido — quem mais negligenciou lidera o topo</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {ranking.map((entry, i) => {
          const isLeader = i === 0 && entry.lostPoints > 0
          const barWidth = entry.lostPoints === 0 ? 0 : Math.max(6, (entry.lostPoints / maxPoints) * 100)
          return (
            <div key={entry.user.id} className={`px-6 py-4 flex items-center gap-4 ${isLeader ? 'bg-rose-500/[0.06]' : ''}`}>
              <div
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                  isLeader
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-white/5 text-zinc-400 border border-white/10 light:bg-black/[0.03] light:text-zinc-600 light:border-black/10'
                }`}
              >
                {isLeader ? <Flame size={15} /> : i + 1}
              </div>

              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                {entry.user.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white light:text-zinc-900 truncate">{entry.user.name}</p>
                  {entry.user.role === 'admin' && <Crown size={12} className="text-amber-400 shrink-0" />}
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isLeader ? 'bg-rose-500' : 'bg-purple-500/70'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className={`text-lg font-bold tabular-nums ${isLeader ? 'text-rose-400' : 'text-white light:text-zinc-900'}`}>
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
          <div className="px-6 py-10 text-center text-sm text-zinc-500">Nenhum membro nesta comunidade ainda.</div>
        )}
      </div>
    </div>
  )
}
