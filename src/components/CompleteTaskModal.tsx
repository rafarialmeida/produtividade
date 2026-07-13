import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Loader2, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'

export default function CompleteTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const completeTask = useAppStore((s) => s.completeTask)
  const hasSubtasks = task.subtasks.length > 0
  const [subtaskMinutes, setSubtaskMinutes] = useState<Record<string, string>>(
    Object.fromEntries(task.subtasks.map((s) => [s.id, ''])),
  )
  const [directMinutes, setDirectMinutes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isValid = hasSubtasks
    ? task.subtasks.every((s) => subtaskMinutes[s.id].trim() !== '' && Number(subtaskMinutes[s.id]) >= 0)
    : directMinutes.trim() !== '' && Number(directMinutes) >= 0

  const totalMinutes = hasSubtasks
    ? task.subtasks.reduce((sum, s) => sum + (Number(subtaskMinutes[s.id]) || 0), 0)
    : Number(directMinutes) || 0

  async function handleConfirm() {
    if (!isValid || submitting) return
    setSubmitting(true)
    try {
      if (hasSubtasks) {
        const minutes = Object.fromEntries(task.subtasks.map((s) => [s.id, Number(subtaskMinutes[s.id])]))
        await completeTask(task.id, { subtasks: minutes })
      } else {
        await completeTask(task.id, { direct: Number(directMinutes) })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={18} className="text-emerald-300 shrink-0" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">Concluir tarefa</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-zinc-500">
            Comunidades de trabalho pedem quanto tempo foi gasto antes de concluir, pra montar o relatório de horas da equipe.
          </p>

          {hasSubtasks ? (
            <div className="flex flex-col gap-2.5">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 light:text-zinc-700 flex-1 min-w-0 truncate">{s.text}</span>
                  <input
                    type="number"
                    min={0}
                    value={subtaskMinutes[s.id]}
                    onChange={(e) => setSubtaskMinutes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="min"
                    className="input !w-20 !py-1 !text-xs shrink-0"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Minutos gastos</label>
              <input
                type="number"
                min={0}
                value={directMinutes}
                onChange={(e) => setDirectMinutes(e.target.value)}
                placeholder="Ex.: 90 (1h30)"
                className="input"
              />
            </div>
          )}

          <p className="text-[11px] text-zinc-500">
            Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min
          </p>

          <button onClick={handleConfirm} disabled={!isValid || submitting} className="btn-secondary disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Concluir tarefa'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
