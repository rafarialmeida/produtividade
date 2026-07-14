import { useState } from 'react'
import type { Task } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { formatDeadline, formatRelative } from '../utils/date'
import TaskDetailModal from './TaskDetailModal'

const ZONES = [
  {
    key: 'vacilando',
    title: 'Você tá vacilando',
    emoji: '🔥',
    color: 'text-rose-300',
    bg: 'bg-rose-500/[0.06]',
    border: 'border-rose-500/30',
  },
  {
    key: 'bronca',
    title: 'Quer tomar bronca mesmo?',
    emoji: '😬',
    color: 'text-amber-300',
    bg: 'bg-amber-500/[0.06]',
    border: 'border-amber-500/30',
  },
  {
    key: 'controle',
    title: 'Está tudo sob controle',
    emoji: '😎',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/[0.06]',
    border: 'border-emerald-500/30',
  },
] as const

function daysUntil(deadline: string) {
  return (new Date(deadline).getTime() - Date.now()) / 86400000
}

function zoneFor(deadline: string): (typeof ZONES)[number]['key'] {
  const days = daysUntil(deadline)
  if (days <= 1) return 'vacilando'
  if (days <= 5) return 'bronca'
  return 'controle'
}

export default function MoodWall({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => !t.completed && !t.expired)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700 mb-3">O Mural do Humor</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {ZONES.map((zone) => {
          const zoneTasks = active
            .filter((t) => zoneFor(t.deadline) === zone.key)
            .sort((a, b) => a.deadline.localeCompare(b.deadline))

          return (
            <div key={zone.key} className={`glass-panel rounded-2xl border ${zone.border} ${zone.bg} overflow-hidden`}>
              <div className="px-4 py-3 border-b border-white/5 light:border-black/5 flex items-center gap-2">
                <span className="text-lg leading-none">{zone.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${zone.color}`}>{zone.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {zoneTasks.length} tarefa{zoneTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
                {zoneTasks.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-4">Nada por aqui.</p>
                ) : (
                  zoneTasks.map((t) => {
                    const cfg = URGENCY_CONFIG[t.urgency]
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className="text-left rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2 light:bg-black/[0.02] light:border-black/5 hover:bg-white/[0.06] light:hover:bg-black/[0.04] transition-colors"
                      >
                        <p className="text-xs font-medium text-white light:text-zinc-900 truncate">{t.title}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate" title={formatDeadline(t.deadline)}>
                            {formatRelative(t.deadline)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  )
}
