import { useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Pencil,
  Play,
  Repeat,
  RotateCcw,
  StickyNote,
  Tag,
  Target,
  Trash2,
  TriangleAlert,
  Unlock,
  User,
  UserCog,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'
import { RECURRENCE_LABEL } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { getTaskStatus, TASK_STATUS_CONFIG } from '../utils/taskStatus'
import { formatDeadline, formatRelative, isNearDeadline, isPastDeadline } from '../utils/date'
import TaskForm from './TaskForm'
import AssignTaskModal from './AssignTaskModal'
import BlockTaskModal from './BlockTaskModal'
import CompleteTaskModal from './CompleteTaskModal'
import NoteViewerModal from './NoteViewerModal'

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export default function TaskCard({
  task,
  showOwner = false,
  showCommunity = false,
  assignedSubtaskOnly = false,
}: {
  task: Task
  showOwner?: boolean
  showCommunity?: boolean
  assignedSubtaskOnly?: boolean
}) {
  const authUser = useAppStore((s) => s.authUser)
  const currentUserId = authUser?.id
  const toggleSubtask = useAppStore((s) => s.toggleSubtask)
  const setTaskStarted = useAppStore((s) => s.setTaskStarted)
  const reopenTask = useAppStore((s) => s.reopenTask)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const setTaskBlocked = useAppStore((s) => s.setTaskBlocked)
  const owner = useAppStore((s) => s.getUserById(task.userId))
  const users = useAppStore((s) => s.users)
  const community = useAppStore((s) => (task.communityId ? s.getCommunityById(task.communityId) : undefined))
  const cfg = URGENCY_CONFIG[task.urgency]
  const communityTypeCfg = community ? COMMUNITY_TYPE_CONFIG[community.type] : null
  const isOwner = task.userId === currentUserId
  const isCommunityAdmin = Boolean(
    community && authUser && (authUser.role === 'admin' || community.adminIds.includes(authUser.id)),
  )
  const isWorkCommunity = community?.type === 'trabalho'
  const canBlock = isOwner || isCommunityAdmin
  const taskStatus = getTaskStatus(task)
  const statusCfg = TASK_STATUS_CONFIG[taskStatus]
  const [editing, setEditing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [viewingNote, setViewingNote] = useState<{ title: string; text: string } | null>(null)

  function handleDelete() {
    if (window.confirm(`Excluir a tarefa "${task.title}"? Ela vai pra lixeira e dá pra restaurar depois.`)) {
      deleteTask(task.id)
    }
  }

  function handleUnblock() {
    setTaskBlocked(task.id, false)
  }

  function handleComplete() {
    setCompleting(true)
  }

  const near = !task.completed && !task.expired && isNearDeadline(task.deadline)
  const doneCount = task.subtasks.filter((s) => s.done).length
  const allSubtasksDone = doneCount === task.subtasks.length

  const cardStatus = task.completed ? 'completed' : task.blocked ? 'blocked' : task.expired ? 'expired' : near ? 'near' : 'active'

  const statusStyles: Record<string, string> = {
    completed: 'border-white/10 opacity-70',
    blocked: 'border-slate-400/30 bg-slate-500/[0.04]',
    expired: 'border-rose-500/40 bg-rose-500/[0.04]',
    near: 'border-amber-500/40 bg-amber-500/[0.04]',
    active: 'border-white/10',
  }

  return (
    <div className={`glass-panel rounded-2xl p-5 border ${statusStyles[cardStatus]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {task.macroObjectiveDescription ? (
            <button
              type="button"
              onClick={() => setViewingNote({ title: task.macroObjective, text: task.macroObjectiveDescription! })}
              title="Ver descrição do objetivo"
              className="flex items-center gap-1.5 text-[11px] text-purple-300/80 hover:text-purple-200 light:text-purple-600/80 light:hover:text-purple-700 mb-1.5 transition-colors"
            >
              <Target size={11} className="shrink-0" />
              <span className="truncate">{task.macroObjective}</span>
              <StickyNote size={10} className="shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 light:text-purple-600/80 mb-1.5">
              <Target size={11} />
              <span className="truncate">{task.macroObjective}</span>
            </div>
          )}
          <h3 className={`font-semibold text-white light:text-zinc-900 ${task.completed ? 'line-through decoration-zinc-600' : ''}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-zinc-400 light:text-zinc-600 mt-1 whitespace-pre-wrap break-words">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 light:text-zinc-600 light:bg-black/[0.03] light:border-black/10">
              <Tag size={9} /> {task.category}
            </span>
            {task.recurrence && (
              <span
                title="Tarefa recorrente"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300 light:text-purple-600 bg-purple-500/10 border border-purple-500/30 rounded px-1.5 py-0.5"
              >
                <Repeat size={9} /> {RECURRENCE_LABEL[task.recurrence]}
              </span>
            )}
            {(taskStatus === 'nao_iniciada' || taskStatus === 'em_andamento') && (
              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
            {task.blocked && (
              <span
                title={task.blockedReason}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-300 bg-slate-500/10 border border-slate-400/30 rounded px-1.5 py-0.5 light:text-slate-600"
              >
                <Lock size={9} /> Bloqueada{task.blockedReason ? `: ${task.blockedReason}` : ''}
              </span>
            )}
            {assignedSubtaskOnly && (
              <span
                title="Você não é o dono da tarefa, mas tem uma subtarefa atribuída a você aqui"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 light:text-sky-700 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.5"
              >
                <UserCog size={9} /> Subtarefa atribuída a você
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
          {isCommunityAdmin && isWorkCommunity && (
            <button
              onClick={() => setAssigning(true)}
              title="Atribuir responsável"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-sky-300 light:hover:text-sky-700 hover:bg-sky-500/10 transition-colors"
            >
              <UserCog size={13} />
            </button>
          )}
          {canBlock && !task.completed && (
            <button
              onClick={() => (task.blocked ? handleUnblock() : setBlocking(true))}
              title={task.blocked ? 'Desbloquear tarefa' : 'Bloquear tarefa (pausa o prazo)'}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-300 light:hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
            >
              {task.blocked ? <Unlock size={13} /> : <Lock size={13} />}
            </button>
          )}
          {(isOwner || isCommunityAdmin) && (
            <button
              onClick={() => setEditing(true)}
              title="Editar tarefa"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-purple-300 light:hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
            >
              <Pencil size={13} />
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              title="Excluir tarefa"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
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
          const subtaskAssignee = st.assigneeId && st.assigneeId !== task.userId ? users.find((u) => u.id === st.assigneeId) : undefined
          return (
            <div key={st.id} className="flex items-center gap-2">
              <button
                onClick={() => !task.completed && toggleSubtask(task.id, st.id)}
                disabled={task.completed}
                className="flex items-center gap-2 text-left group min-w-0"
              >
                {st.done ? (
                  <CheckCircle2 size={15} className="text-emerald-400 light:text-emerald-600 shrink-0" />
                ) : (
                  <Circle size={15} className="text-zinc-600 shrink-0 group-hover:text-zinc-400" />
                )}
                <span className={`text-sm truncate ${st.done ? 'text-zinc-500 line-through' : 'text-zinc-300 light:text-zinc-700'}`}>
                  {st.text}
                </span>
              </button>
              {subtaskAssignee && (
                <span className="text-[10px] text-sky-300 light:text-sky-700 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.5 shrink-0">
                  {subtaskAssignee.name}
                </span>
              )}
              {st.note && (
                <button
                  type="button"
                  onClick={() => setViewingNote({ title: st.text, text: st.note! })}
                  title="Ver observação"
                  className="text-zinc-600 hover:text-amber-400 light:hover:text-amber-600 shrink-0"
                >
                  <StickyNote size={11} />
                </button>
              )}
              {st.dueDate && !st.done && (
                <span
                  className={`flex items-center gap-1 text-[10px] shrink-0 ${
                    subtaskOverdue ? 'text-rose-400 light:text-rose-600' : subtaskNear ? 'text-amber-400 light:text-amber-600' : 'text-zinc-600'
                  }`}
                >
                  <CalendarClock size={10} /> {formatRelative(st.dueDate)}
                </span>
              )}
              {task.completed && st.minutesSpent != null && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
                  <Clock size={10} /> {formatMinutes(st.minutesSpent)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {task.completed && task.completionNote && (
        <p className="mt-3 text-xs text-zinc-400 light:text-zinc-600 whitespace-pre-wrap break-words">
          <span className="text-zinc-500">Observações da conclusão:</span> {task.completionNote}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {task.completed ? (
            <span className="flex items-center gap-1 text-emerald-400 light:text-emerald-600">
              <CheckCircle2 size={13} /> Concluída{task.completedAt && ` em ${formatDeadline(task.completedAt)}`}
            </span>
          ) : task.expired ? (
            <span className="flex items-center gap-1 text-rose-400 light:text-rose-600 font-medium">
              <TriangleAlert size={13} /> Expirada · -{cfg.points} pt{cfg.points > 1 ? 's' : ''}
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${near ? 'text-amber-400 light:text-amber-600 font-medium' : 'text-zinc-500'}`}>
              <Clock size={13} /> {formatDeadline(task.deadline)} ({formatRelative(task.deadline)})
            </span>
          )}
        </div>

        {!task.completed && !task.expired && (
          <div className="flex items-center gap-1.5">
            {taskStatus === 'nao_iniciada' && (
              <button
                onClick={() => setTaskStarted(task.id, true)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 light:text-sky-700 border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
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
              onClick={handleComplete}
              disabled={!allSubtasksDone}
              title={!allSubtasksDone ? 'Conclua todas as subtarefas do plano de execução primeiro' : ''}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 light:text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Concluir
            </button>
          </div>
        )}

        {task.completed && (isOwner || isCommunityAdmin) && (
          <button
            onClick={() => reopenTask(task.id)}
            title="Voltar para Em andamento"
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-zinc-400 border border-white/10 hover:bg-white/5 hover:text-white transition-colors light:text-zinc-600 light:border-black/10 light:hover:bg-black/5 light:hover:text-zinc-900"
          >
            <RotateCcw size={12} /> Reabrir
          </button>
        )}
      </div>

      {editing && (
        <TaskForm task={task} communityId={task.communityId} userId={task.userId} onClose={() => setEditing(false)} />
      )}
      {assigning && <AssignTaskModal task={task} onClose={() => setAssigning(false)} />}
      {completing && <CompleteTaskModal task={task} onClose={() => setCompleting(false)} />}
      {blocking && <BlockTaskModal task={task} onClose={() => setBlocking(false)} />}
      {viewingNote && (
        <NoteViewerModal title={viewingNote.title} note={viewingNote.text} onClose={() => setViewingNote(null)} />
      )}
    </div>
  )
}
