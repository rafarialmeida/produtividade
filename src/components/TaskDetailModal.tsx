import { useEffect } from 'react'
import { X } from 'lucide-react'
import TaskCard from './TaskCard'
import { useAppStore } from '../store/useStore'

export default function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useAppStore((s) => s.tasks.find((t) => t.id === taskId))

  useEffect(() => {
    if (!task) onClose()
  }, [task, onClose])

  if (!task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end mb-2">
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 bg-black/40 light:hover:text-zinc-900">
            <X size={18} />
          </button>
        </div>
        <TaskCard task={task} showOwner showCommunity />
      </div>
    </div>
  )
}
