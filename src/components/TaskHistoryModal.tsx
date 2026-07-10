import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, History, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { formatDeadline } from '../utils/date'

export default function TaskHistoryModal({
  userId,
  communityId,
  onClose,
}: {
  userId: string
  communityId?: string
  onClose: () => void
}) {
  const users = useAppStore((s) => s.users)
  const authUser = useAppStore((s) => s.authUser)
  const allTasks = useAppStore((s) => s.tasks)
  const [filter, setFilter] = useState<'all' | 'completed' | 'expired'>('all')

  const user = users.find((u) => u.id === userId) ?? (authUser?.id === userId ? authUser : undefined)

  const entries = useMemo(() => {
    return allTasks
      .filter((t) => t.userId === userId && (t.completed || t.expired))
      .filter((t) => !communityId || t.communityId === communityId)
      .filter((t) => filter === 'all' || (filter === 'completed' ? t.completed : t.expired && !t.completed))
      .sort((a, b) => {
        const da = a.completed ? (a.completedAt ?? a.deadline) : a.deadline
        const db = b.completed ? (b.completedAt ?? b.deadline) : b.deadline
        return db.localeCompare(da)
      })
  }, [allTasks, userId, communityId, filter])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <History size={18} className="text-purple-300 shrink-0" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">
              Histórico{user ? ` — ${user.name}` : ''}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-1.5">
          {(['all', 'completed', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === f
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-zinc-500 border border-transparent hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'completed' ? 'Concluídas' : 'Expiradas'}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden max-h-96 overflow-y-auto">
              {entries.map((t) => (
                <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                  {t.completed ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <TriangleAlert size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {t.completed
                        ? `Concluída em ${formatDeadline(t.completedAt ?? t.deadline)}`
                        : `Expirou em ${formatDeadline(t.deadline)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
