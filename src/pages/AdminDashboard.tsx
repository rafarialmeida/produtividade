import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Layers, Plus, ShieldCheck, TrendingDown, Users } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import CreateCommunityModal from '../components/CreateCommunityModal'
import { SEVERITY_LABEL, URGENCY_POINTS } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'

export default function AdminDashboard() {
  const communities = useAppStore((s) => s.communities)
  const users = useAppStore((s) => s.users)
  const tasks = useAppStore((s) => s.tasks)
  const [showCreate, setShowCreate] = useState(false)

  const totalMembers = new Set(communities.flatMap((c) => c.memberIds)).size
  const totalTasks = tasks.length
  const totalCompleted = tasks.filter((t) => t.completed).length
  const totalLostPoints = tasks
    .filter((t) => t.expired && !t.completed)
    .reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)
  const completionRate = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Progresso geral e gestão de comunidades</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary !w-auto px-4">
          <Plus size={16} /> Criar Nova Comunidade
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Comunidades" value={communities.length} accent="purple" />
        <StatCard label="Membros totais" value={totalMembers} accent="purple" />
        <StatCard label="Taxa de conclusão" value={completionRate} suffix="%" accent="emerald" />
        <StatCard label="Pontos perdidos (geral)" value={totalLostPoints} prefix="-" accent="rose" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Comunidades</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {communities.map((c) => {
            const cfg = URGENCY_CONFIG[c.severity]
            const communityTasks = tasks.filter((t) => t.communityId === c.id)
            const expiredCount = communityTasks.filter((t) => t.expired && !t.completed).length
            const members = c.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean)

            return (
              <Link
                key={c.id}
                to={`/community/${c.id}`}
                className="glass-panel rounded-2xl p-5 hover:border-purple-500/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <Layers size={16} className="text-purple-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{c.name}</p>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Users size={11} /> {members.length} membros
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-purple-300 transition-colors shrink-0" />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                    Gravidade {SEVERITY_LABEL[c.severity]}
                  </span>
                  {expiredCount > 0 && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-center gap-1">
                      <TrendingDown size={11} /> {expiredCount} penalidade{expiredCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex -space-x-2 mt-4">
                  {members.slice(0, 6).map((m) => (
                    <div
                      key={m!.id}
                      title={m!.name}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/50 to-emerald-500/50 border-2 border-[#0d0e14] flex items-center justify-center text-[10px] font-semibold text-white"
                    >
                      {m!.name.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                  {members.length > 6 && (
                    <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#0d0e14] flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                      +{members.length - 6}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {showCreate && <CreateCommunityModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  prefix = '',
  suffix = '',
}: {
  label: string
  value: number
  accent: 'purple' | 'emerald' | 'rose'
  prefix?: string
  suffix?: string
}) {
  const colors = {
    purple: 'text-purple-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-400',
  }
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className={`text-2xl font-bold tabular-nums ${colors[accent]}`}>
        {prefix}
        {value}
        {suffix}
      </p>
      <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
    </div>
  )
}
