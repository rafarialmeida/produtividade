import { createPortal } from 'react-dom'
import { Clock, X } from 'lucide-react'
import type { Task } from '../types'
import { formatDeadline } from '../utils/date'

export default function MemberHoursModal({
  name,
  tasks,
  onClose,
}: {
  name: string
  tasks: Task[]
  onClose: () => void
}) {
  const withHours = tasks.filter((t) => (t.minutesSpent ?? 0) > 0 || t.subtasks.some((s) => (s.minutesSpent ?? 0) > 0))
  const totalMinutes = withHours.reduce((sum, t) => sum + (t.minutesSpent ?? 0), 0)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-purple-300 light:text-purple-600 shrink-0" />
              <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">Horas gastas — {name}</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Total: {(totalMinutes / 60).toFixed(1)}h</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {withHours.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-8">Nenhuma hora registrada ainda.</p>
          ) : (
            withHours.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 light:border-black/10 light:bg-black/[0.02]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                  <span className="text-xs font-semibold text-purple-300 light:text-purple-600 shrink-0 tabular-nums">
                    {((t.minutesSpent ?? 0) / 60).toFixed(1)}h
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {t.completedAt ? `Concluída em ${formatDeadline(t.completedAt)}` : 'Em andamento'}
                </p>
                {t.subtasks.some((s) => (s.minutesSpent ?? 0) > 0) && (
                  <div className="mt-2.5 flex flex-col gap-1.5 border-t border-white/5 pt-2.5">
                    {t.subtasks
                      .filter((s) => (s.minutesSpent ?? 0) > 0)
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-zinc-400 light:text-zinc-600 truncate">{s.text}</span>
                          <span className="text-zinc-400 light:text-zinc-600 tabular-nums shrink-0">
                            {((s.minutesSpent ?? 0) / 60).toFixed(1)}h
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
