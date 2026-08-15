import type { Task } from '../types'

export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'awaiting_approval' | 'blocked' | 'completed'

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'A Fazer' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'awaiting_approval', label: 'Aguardando aprovação' },
  { key: 'blocked', label: 'Bloqueadas' },
  { key: 'completed', label: 'Concluídas' },
]

export function resolveKanbanColumn(task: Task): KanbanColumn {
  if (task.completed) return 'completed'
  if (task.blocked) return 'blocked'
  return task.boardStatus
}
