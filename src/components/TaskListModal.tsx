import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Task } from '../types'
import TaskCard from './TaskCard'

export default function TaskListModal({
  title,
  tasks,
  showOwner = false,
  showCommunity = false,
  onClose,
}: {
  title: string
  tasks: Task[]
  showOwner?: boolean
  showCommunity?: boolean
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-8">Nenhuma tarefa aqui.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} showOwner={showOwner} showCommunity={showCommunity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
