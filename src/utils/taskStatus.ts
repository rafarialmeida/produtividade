import type { Task } from '../types'

export type TaskStatus = 'nao_iniciada' | 'em_andamento' | 'concluida' | 'expirada'

export function getTaskStatus(task: Task): TaskStatus {
  if (task.completed) return 'concluida'
  if (task.expired) return 'expirada'
  return task.started ? 'em_andamento' : 'nao_iniciada'
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  nao_iniciada: { label: 'Não iniciada', color: 'text-zinc-400', bg: 'bg-white/5', border: 'border-white/10' },
  em_andamento: { label: 'Em andamento', color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  concluida: { label: 'Concluída', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  expirada: { label: 'Expirada', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
}
