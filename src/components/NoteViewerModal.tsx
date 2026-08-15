import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function NoteViewerModal({
  title,
  note,
  onClose,
}: {
  title: string
  note: string
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel neon-border-purple rounded-2xl w-full max-w-sm p-5 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white light:text-zinc-900 truncate">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-zinc-300 light:text-zinc-700 whitespace-pre-wrap break-words">{note}</p>
      </div>
    </div>,
    document.body,
  )
}
