import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Clock, History, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { formatDeadline } from '../utils/date'
import TaskDetailModal from './TaskDetailModal'

type Filter = 'all' | 'active' | 'completed' | 'expired'

export default function TaskHistoryModal({
  userId,
  communityId,
  isAdminView = false,
  onClose,
}: {
  userId: string
  communityId?: string
  isAdminView?: boolean
  onClose: () => void
}) {
  const users = useAppStore((s) => s.users)
  const authUser = useAppStore((s) => s.authUser)
  const allTasks = useAppStore((s) => s.tasks)
  const [filter, setFilter] = useState<Filter>('all')
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const user = users.find((u) => u.id === userId) ?? (authUser?.id === userId ? authUser : undefined)

  const filterOptions: Filter[] = isAdminView ? ['all', 'active', 'completed', 'expired'] : ['all', 'completed', 'expired']

  const entries = useMemo(() => {
    return allTasks
      .filter((t) => t.userId === userId)
      .filter((t) => !communityId || t.communityId === communityId)
      .filter((t) => isAdminView || t.completed || t.expired)
      .filter((t) => {
        if (filter === 'all') return true
        if (filter === 'completed') return t.completed
        if (filter === 'expired') return t.expired && !t.completed
        return !t.completed && !t.expired
      })
      .sort((a, b) => {
        const da = a.completed ? (a.completedAt ?? a.deadline) : a.deadline
        const db = b.completed ? (b.completedAt ?? b.deadline) : b.deadline
        return db.localeCompare(da)
      })
  }, [allTasks, userId, communityId, filter, isAdminView])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <History size={18} className="text-purple-300 light:text-purple-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">
                Histórico{user ? ` — ${user.name}` : ''}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {communityId ? 'Só nesta comunidade' : 'Todas as comunidades'}
                {isAdminView ? ' · visão de administrador' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 flex flex-wrap gap-1.5">
          {filterOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === f
                  ? 'bg-purple-500/15 text-purple-300 light:text-purple-600 border border-purple-500/30'
                  : 'text-zinc-500 border border-transparent hover:bg-white/5'
              }`}
            >
              {{ all: 'Todas', active: 'Em andamento', completed: 'Concluídas', expired: 'Expiradas' }[f]}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden max-h-96 overflow-y-auto">
              {entries.map((t) => {
                const isActive = !t.completed && !t.expired
                const content = (
                  <>
                    {t.completed ? (
                      <CheckCircle2 size={15} className="text-emerald-400 light:text-emerald-600 shrink-0 mt-0.5" />
                    ) : isActive ? (
                      <Clock size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                    ) : (
                      <TriangleAlert size={15} className="text-rose-400 light:text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {t.completed
                          ? `Concluída em ${formatDeadline(t.completedAt ?? t.deadline)}`
                          : isActive
                            ? `${t.started ? 'Em andamento' : 'Não iniciada'} · prazo ${formatDeadline(t.deadline)}`
                            : `Expirou em ${formatDeadline(t.deadline)}`}
                      </p>
                    </div>
                  </>
                )
                return isAdminView ? (
                  <button
                    key={t.id}
                    onClick={() => setDetailTaskId(t.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 light:hover:bg-black/5 transition-colors"
                  >
                    {content}
                  </button>
                ) : (
                  <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                    {content}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </div>,
    document.body,
  )
}
