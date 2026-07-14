import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, Loader2, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Task } from '../types'

export default function BlockTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const setTaskBlocked = useAppStore((s) => s.setTaskBlocked)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!reason.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const err = await setTaskBlocked(task.id, true, reason.trim())
      if (err) setError(err)
      else onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock size={18} className="text-amber-300 light:text-amber-600 shrink-0" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">Bloquear tarefa</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-zinc-500">
            Enquanto bloqueada, "{task.title}" para de contar prazo — não expira nem gera negligência. Desbloqueie quando
            voltar a ser prioridade.
          </p>

          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: mudança de prioridade, aguardando outra equipe, projeto pausado..."
              rows={3}
              className="input resize-none"
            />
          </div>

          {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

          <button onClick={handleConfirm} disabled={!reason.trim() || submitting} className="btn-secondary disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Bloquear tarefa'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
