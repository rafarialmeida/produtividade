import { CheckCircle2, Circle, Clock, Target, TriangleAlert } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { formatDeadline, formatRelative, isNearDeadline } from '../utils/date'

export default function TaskCard({ task, showOwner = false }: { task: Task; showOwner?: boolean }) {
  const toggleSubtask = useAppStore((s) => s.toggleSubtask)
  const completeTask = useAppStore((s) => s.completeTask)
  const owner = useAppStore((s) => s.getUserById(task.userId))
  const cfg = URGENCY_CONFIG[task.urgency]

  const near = !task.completed && !task.expired && isNearDeadline(task.deadline)
  const doneCount = task.subtasks.filter((s) => s.done).length
  const allSubtasksDone = doneCount === task.subtasks.length

  const status = task.completed ? 'completed' : task.expired ? 'expired' : near ? 'near' : 'active'

  const statusStyles: Record<string, string> = {
    completed: 'border-white/10 opacity-70',
    expired: 'border-rose-500/40 bg-rose-500/[0.04]',
    near: 'border-amber-500/40 bg-amber-500/[0.04]',
    active: 'border-white/10',
  }

  return (
    <div className={`glass-panel rounded-2xl p-5 border ${statusStyles[status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 mb-1.5">
            <Target size={11} />
            <span className="truncate">{task.macroObjective}</span>
          </div>
          <h3 className={`font-semibold text-white ${task.completed ? 'line-through decoration-zinc-600' : ''}`}>
            {task.title}
          </h3>
          {showOwner && owner && <p className="text-xs text-zinc-500 mt-0.5">Responsável: {owner.name}</p>}
        </div>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {task.subtasks.map((st) => (
          <button
            key={st.id}
            onClick={() => !task.completed && toggleSubtask(task.id, st.id)}
            disabled={task.completed}
            className="flex items-center gap-2 text-left group"
          >
            {st.done ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : (
              <Circle size={15} className="text-zinc-600 shrink-0 group-hover:text-zinc-400" />
            )}
            <span className={`text-sm ${st.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{st.text}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {task.completed ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} /> Concluída
            </span>
          ) : task.expired ? (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <TriangleAlert size={13} /> Expirada · -{cfg.points} pt{cfg.points > 1 ? 's' : ''}
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${near ? 'text-amber-400 font-medium' : 'text-zinc-500'}`}>
              <Clock size={13} /> {formatDeadline(task.deadline)} ({formatRelative(task.deadline)})
            </span>
          )}
        </div>

        {!task.completed && !task.expired && (
          <button
            onClick={() => completeTask(task.id)}
            disabled={!allSubtasksDone}
            title={!allSubtasksDone ? 'Conclua todas as subtarefas do plano de execução primeiro' : ''}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Concluir
          </button>
        )}
      </div>
    </div>
  )
}
