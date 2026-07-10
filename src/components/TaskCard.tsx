import { CalendarClock, CheckCircle2, Circle, Clock, Play, RotateCcw, Tag, Target, Trash2, TriangleAlert, User } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { getTaskStatus, TASK_STATUS_CONFIG } from '../utils/taskStatus'
import { formatDeadline, formatRelative, isNearDeadline, isPastDeadline } from '../utils/date'

export default function TaskCard({
  task,
  showOwner = false,
  showCommunity = false,
}: {
  task: Task
  showOwner?: boolean
  showCommunity?: boolean
}) {
  const currentUserId = useAppStore((s) => s.authUser?.id)
  const toggleSubtask = useAppStore((s) => s.toggleSubtask)
  const setTaskStarted = useAppStore((s) => s.setTaskStarted)
  const completeTask = useAppStore((s) => s.completeTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const owner = useAppStore((s) => s.getUserById(task.userId))
  const community = useAppStore((s) => (showCommunity ? s.getCommunityById(task.communityId) : undefined))
  const cfg = URGENCY_CONFIG[task.urgency]
  const communityTypeCfg = community ? COMMUNITY_TYPE_CONFIG[community.type] : null
  const isOwner = task.userId === currentUserId
  const taskStatus = getTaskStatus(task)
  const statusCfg = TASK_STATUS_CONFIG[taskStatus]

  function handleDelete() {
    if (window.confirm(`Excluir a tarefa "${task.title}"? Essa ação não pode ser desfeita.`)) {
      deleteTask(task.id)
    }
  }

  const near = !task.completed && !task.expired && isNearDeadline(task.deadline)
  const doneCount = task.subtasks.filter((s) => s.done).length
  const allSubtasksDone = doneCount === task.subtasks.length

  const cardStatus = task.completed ? 'completed' : task.expired ? 'expired' : near ? 'near' : 'active'

  const statusStyles: Record<string, string> = {
    completed: 'border-white/10 opacity-70',
    expired: 'border-rose-500/40 bg-rose-500/[0.04]',
    near: 'border-amber-500/40 bg-amber-500/[0.04]',
    active: 'border-white/10',
  }

  return (
    <div className={`glass-panel rounded-2xl p-5 border ${statusStyles[cardStatus]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 mb-1.5">
            <Target size={11} />
            <span className="truncate">{task.macroObjective}</span>
          </div>
          <h3 className={`font-semibold text-white light:text-zinc-900 ${task.completed ? 'line-through decoration-zinc-600' : ''}`}>
            {task.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 light:text-zinc-600 light:bg-black/[0.03] light:border-black/10">
              <Tag size={9} /> {task.category}
            </span>
            {(taskStatus === 'nao_iniciada' || taskStatus === 'em_andamento') && (
              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
          </div>
          {showOwner && owner && <p className="text-xs text-zinc-500 mt-1">Responsável: {owner.name}</p>}
          {showCommunity && (
            <p className={`flex items-center gap-1 text-[11px] mt-1 ${communityTypeCfg ? communityTypeCfg.color : 'text-zinc-500'}`}>
              {communityTypeCfg ? (
                <>
                  <communityTypeCfg.icon size={11} /> {community?.name}
                </>
              ) : (
                <>
                  <User size={11} /> Tarefa pessoal
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            {cfg.label}
          </span>
          {isOwner && (
            <button
              onClick={handleDelete}
              title="Excluir tarefa"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {task.subtasks.map((st) => {
          const subtaskOverdue = !st.done && st.dueDate && isPastDeadline(st.dueDate)
          const subtaskNear = !st.done && st.dueDate && isNearDeadline(st.dueDate)
          return (
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
              <span className={`text-sm ${st.done ? 'text-zinc-500 line-through' : 'text-zinc-300 light:text-zinc-700'}`}>{st.text}</span>
              {st.dueDate && !st.done && (
                <span
                  className={`flex items-center gap-1 text-[10px] shrink-0 ${
                    subtaskOverdue ? 'text-rose-400' : subtaskNear ? 'text-amber-400' : 'text-zinc-600'
                  }`}
                >
                  <CalendarClock size={10} /> {formatRelative(st.dueDate)}
                </span>
              )}
            </button>
          )
        })}
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
          <div className="flex items-center gap-1.5">
            {taskStatus === 'nao_iniciada' && (
              <button
                onClick={() => setTaskStarted(task.id, true)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
              >
                <Play size={12} /> Iniciar
              </button>
            )}
            {taskStatus === 'em_andamento' && (
              <button
                onClick={() => setTaskStarted(task.id, false)}
                title="Mover para Não iniciada"
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-zinc-400 border border-white/10 hover:bg-white/5 transition-colors light:text-zinc-600 light:border-black/10 light:hover:bg-black/5"
              >
                <RotateCcw size={12} /> Não iniciada
              </button>
            )}
            <button
              onClick={() => completeTask(task.id)}
              disabled={!allSubtasksDone}
              title={!allSubtasksDone ? 'Conclua todas as subtarefas do plano de execução primeiro' : ''}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Concluir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
