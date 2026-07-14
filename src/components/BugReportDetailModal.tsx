import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Bug, Check, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { BugReport } from '../types'
import { formatDeadline } from '../utils/date'

export default function BugReportDetailModal({
  report,
  onClose,
  onDeleted,
  onReplied,
}: {
  report: BugReport
  onClose: () => void
  onDeleted: (id: string) => void
  onReplied: (id: string, reply: string) => void
}) {
  const replyToBugReport = useAppStore((s) => s.replyToBugReport)
  const deleteBugReport = useAppStore((s) => s.deleteBugReport)
  const [reply, setReply] = useState(report.adminReply ?? '')
  const [sendingReply, setSendingReply] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleReply() {
    if (!reply.trim() || sendingReply) return
    setSendingReply(true)
    setError('')
    try {
      const err = await replyToBugReport(report.id, reply.trim())
      if (err) setError(err)
      else {
        setSent(true)
        onReplied(report.id, reply.trim())
      }
    } finally {
      setSendingReply(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este relato? Essa ação não pode ser desfeita.')) return
    setDeleting(true)
    setError('')
    try {
      const err = await deleteBugReport(report.id)
      if (err) setError(err)
      else {
        onDeleted(report.id)
        onClose()
      }
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            {report.type === 'bug' ? (
              <Bug size={18} className="text-rose-300 light:text-rose-700 shrink-0" />
            ) : (
              <Sparkles size={18} className="text-purple-300 light:text-purple-700 shrink-0" />
            )}
            <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">
              {report.type === 'bug' ? 'Relato de bug' : 'Sugestão de melhoria'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">
              {report.reporterName} · {formatDeadline(report.createdAt)}
              {report.pageUrl && ` · ${report.pageUrl}`}
            </p>
            <p className="text-sm text-zinc-200 light:text-zinc-800 whitespace-pre-wrap">{report.message}</p>
          </div>

          {report.adminReply && !sent && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-emerald-300 light:text-emerald-700 mb-1">
                Sua resposta {report.repliedAt && `· ${formatDeadline(report.repliedAt)}`}
              </p>
              <p className="text-sm text-zinc-200 light:text-zinc-800 whitespace-pre-wrap">{report.adminReply}</p>
            </div>
          )}

          {sent ? (
            <div className="flex items-center gap-2 text-sm text-emerald-300 light:text-emerald-700">
              <Check size={16} /> Resposta enviada.
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">
                {report.adminReply ? 'Editar resposta' : 'Responder'}
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Escreva sua resposta..."
                rows={3}
                className="input resize-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-1.5 flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 light:text-rose-700 text-sm font-medium py-2.5 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
            </button>
            {!sent && (
              <button onClick={handleReply} disabled={!reply.trim() || sendingReply} className="btn-secondary flex-1 disabled:opacity-50">
                {sendingReply ? <Loader2 size={14} className="animate-spin" /> : 'Enviar resposta'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
