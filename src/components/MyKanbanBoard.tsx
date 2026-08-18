import { useMemo, useState } from 'react'
import { CalendarClock, ListChecks, Lock, Plus, Target, User } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { BoardStatus, Task } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { formatRelative, isNearDeadline, isPastDeadline } from '../utils/date'
import { KANBAN_COLUMNS as COLUMNS, resolveKanbanColumn as resolveColumn, type KanbanColumn } from '../utils/kanbanColumn'
import BlockTaskModal from './BlockTaskModal'
import CompleteTaskModal from './CompleteTaskModal'
import TaskDetailModal from './TaskDetailModal'

const CREATABLE_STATUSES: BoardStatus[] = ['backlog', 'todo', 'in_progress', 'awaiting_approval']

export default function MyKanbanBoard({
  tasks,
  onNewTask,
}: {
  tasks: Task[]
  onNewTask: (initialStatus?: BoardStatus) => void
}) {
  const communities = useAppStore((s) => s.communities)
  const setTaskBoardStatus = useAppStore((s) => s.setTaskBoardStatus)
  const setTaskBlocked = useAppStore((s) => s.setTaskBlocked)
  const reopenTask = useAppStore((s) => s.reopenTask)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [blockingTask, setBlockingTask] = useState<Task | null>(null)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null)

  const byColumn = useMemo(() => {
    const map: Record<KanbanColumn, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      awaiting_approval: [],
      blocked: [],
      completed: [],
    }
    for (const t of tasks) map[resolveColumn(t)].push(t)
    for (const col of COLUMNS) map[col.key].sort((a, b) => a.boardOrder - b.boardOrder)
    return map
  }, [tasks])

  function orderBefore(column: KanbanColumn, draggedId: string, beforeTaskId: string | null): number {
    const columnTasks = byColumn[column].filter((t) => t.id !== draggedId)
    if (!beforeTaskId) {
      const last = columnTasks[columnTasks.length - 1]
      return last ? last.boardOrder + 1 : 0
    }
    const idx = columnTasks.findIndex((t) => t.id === beforeTaskId)
    const before = columnTasks[idx]
    const prev = columnTasks[idx - 1]
    if (!before) {
      const last = columnTasks[columnTasks.length - 1]
      return last ? last.boardOrder + 1 : 0
    }
    return prev ? (prev.boardOrder + before.boardOrder) / 2 : before.boardOrder - 1
  }

  async function moveTask(task: Task, target: KanbanColumn, order: number) {
    if (target === resolveColumn(task)) {
      if (target === 'backlog' || target === 'todo' || target === 'in_progress' || target === 'awaiting_approval') {
        await setTaskBoardStatus(task.id, target, order)
      }
      return
    }

    if (target === 'blocked') {
      setBlockingTask(task)
      return
    }
    if (target === 'completed') {
      setCompletingTask(task)
      return
    }

    // Saindo de bloqueada ou concluída pra uma coluna "em aberto".
    if (task.blocked) {
      await setTaskBlocked(task.id, false, undefined, order)
      await setTaskBoardStatus(task.id, target, order)
      return
    }
    if (task.completed) {
      await reopenTask(task.id)
      if (target !== 'in_progress') await setTaskBoardStatus(task.id, target, order)
      return
    }
    await setTaskBoardStatus(task.id, target, order)
  }

  function handleDropOnColumn(column: KanbanColumn) {
    return async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverColumn(null)
      const taskId = e.dataTransfer.getData('text/plain')
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      await moveTask(task, column, orderBefore(column, taskId, null))
    }
  }

  function handleDropOnCard(column: KanbanColumn, beforeTaskId: string) {
    return async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverColumn(null)
      const taskId = e.dataTransfer.getData('text/plain')
      if (taskId === beforeTaskId) return
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      await moveTask(task, column, orderBefore(column, taskId, beforeTaskId))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">Suas tarefas de todas as comunidades e pessoais, num quadro só. Arraste os cards entre as colunas.</p>
        <button onClick={() => onNewTask()} className="btn-secondary !w-auto px-3 shrink-0">
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const colTasks = byColumn[col.key]
          const isDragOver = dragOverColumn === col.key
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverColumn(col.key)
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
              onDrop={handleDropOnColumn(col.key)}
              className={`shrink-0 w-72 sm:w-80 xl:w-96 min-h-[70vh] rounded-2xl border p-2.5 flex flex-col gap-2 transition-colors ${
                isDragOver
                  ? 'border-purple-500/50 bg-purple-500/[0.04]'
                  : 'border-white/10 bg-white/[0.02] light:border-black/10 light:bg-black/[0.015]'
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-zinc-300 light:text-zinc-700">{col.label}</h3>
                <div className="flex items-center gap-2">
                  {CREATABLE_STATUSES.includes(col.key as BoardStatus) && (
                    <button
                      type="button"
                      onClick={() => onNewTask(col.key as BoardStatus)}
                      title={`Nova tarefa em "${col.label}"`}
                      className="p-0.5 rounded text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                  <span className="text-[10px] text-zinc-500 tabular-nums">{colTasks.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-h-[40px]">
                {colTasks.length === 0 && (
                  <div className="h-14 rounded-xl border border-dashed border-white/10 light:border-black/10" />
                )}
                {colTasks.map((t) => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    community={t.communityId ? communities.find((c) => c.id === t.communityId) : undefined}
                    onClick={() => setSelectedTaskId(t.id)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={handleDropOnCard(col.key, t.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
      {blockingTask && <BlockTaskModal task={blockingTask} onClose={() => setBlockingTask(null)} />}
      {completingTask && <CompleteTaskModal task={completingTask} onClose={() => setCompletingTask(null)} />}
    </div>
  )
}

function KanbanCard({
  task,
  community,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  task: Task
  community?: { type: 'trabalho' | 'competicao'; name: string }
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}) {
  const cfg = URGENCY_CONFIG[task.urgency]
  const communityTypeCfg = community ? COMMUNITY_TYPE_CONFIG[community.type] : null
  const doneCount = task.subtasks.filter((s) => s.done).length
  const overdue = !task.completed && isPastDeadline(task.deadline)
  const near = !task.completed && !overdue && isNearDeadline(task.deadline)

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className="glass-panel rounded-xl p-3 text-left flex flex-col gap-1.5 border border-white/5 hover:border-purple-500/30 transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          {cfg.label}
        </span>
        {task.blocked && <Lock size={11} className="text-slate-400 shrink-0" />}
      </div>
      <p className="text-xs font-medium text-zinc-200 light:text-zinc-800 line-clamp-2">{task.title}</p>
      {task.macroObjective && (
        <p className="flex items-center gap-1 text-[10px] text-purple-300/70 light:text-purple-600/70 truncate">
          <Target size={9} className="shrink-0" /> {task.macroObjective}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className={`flex items-center gap-1 text-[10px] truncate ${communityTypeCfg ? communityTypeCfg.color : 'text-zinc-500'}`}>
          {communityTypeCfg ? <communityTypeCfg.icon size={10} className="shrink-0" /> : <User size={10} className="shrink-0" />}
          {community?.name ?? 'Pessoal'}
        </span>
        {task.subtasks.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
            <ListChecks size={10} /> {doneCount}/{task.subtasks.length}
          </span>
        )}
      </div>
      {!task.completed && (
        <span
          className={`flex items-center gap-1 text-[10px] shrink-0 ${
            overdue ? 'text-rose-400 light:text-rose-600' : near ? 'text-amber-400 light:text-amber-600' : 'text-zinc-600'
          }`}
        >
          <CalendarClock size={10} /> {formatRelative(task.deadline)}
        </span>
      )}
    </button>
  )
}
