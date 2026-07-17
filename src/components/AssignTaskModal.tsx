import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, UserCog, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'
import { useTheme } from '../hooks/useTheme'

export default function AssignTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { theme } = useTheme()
  const optionStyle = theme === 'light' ? { backgroundColor: '#fff', color: '#18181b' } : { backgroundColor: '#0d0e14', color: '#fff' }
  const community = useAppStore((s) => (task.communityId ? s.getCommunityById(task.communityId) : undefined))
  const users = useAppStore((s) => s.users)
  const assignTask = useAppStore((s) => s.assignTask)
  const assignSubtask = useAppStore((s) => s.assignSubtask)

  const [taskAssignee, setTaskAssignee] = useState(task.userId)
  const [subtaskAssignees, setSubtaskAssignees] = useState<Record<string, string>>(
    Object.fromEntries(task.subtasks.map((s) => [s.id, s.assigneeId ?? ''])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!community) return null

  const members = community.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean)

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      if (taskAssignee !== task.userId) {
        const err = await assignTask(task.id, taskAssignee)
        if (err) {
          setError(err === 'NOT_A_MEMBER' ? 'Essa pessoa não é membro da comunidade.' : err)
          return
        }
      }

      for (const s of task.subtasks) {
        const chosen = subtaskAssignees[s.id] ?? ''
        const current = s.assigneeId ?? ''
        if (chosen !== current) {
          const err = await assignSubtask(s.id, chosen || null)
          if (err) {
            setError(err === 'NOT_A_MEMBER' ? 'Essa pessoa não é membro da comunidade.' : err)
            return
          }
        }
      }

      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <UserCog size={18} className="text-purple-300 light:text-purple-600 shrink-0" />
              <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">Atribuir responsável</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Responsável pela tarefa</label>
            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="input">
              {members.map((m) => (
                <option key={m!.id} value={m!.id} style={optionStyle}>
                  {m!.name}
                </option>
              ))}
            </select>
          </div>

          {task.subtasks.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Responsável por subtarefa</label>
              <div className="flex flex-col gap-2">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300 light:text-zinc-700 flex-1 min-w-0 truncate">{s.text}</span>
                    <select
                      value={subtaskAssignees[s.id] ?? ''}
                      onChange={(e) => setSubtaskAssignees((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="input !w-32 sm:!w-40 !py-1 !text-xs shrink-0"
                    >
                      <option value="" style={optionStyle}>
                        Mesmo da tarefa
                      </option>
                      {members.map((m) => (
                        <option key={m!.id} value={m!.id} style={optionStyle}>
                          {m!.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar responsáveis'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
