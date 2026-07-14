import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Bug, Check, Loader2, Sparkles, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'

export default function ReportBugModal({ onClose }: { onClose: () => void }) {
  const reportBug = useAppStore((s) => s.reportBug)
  const [type, setType] = useState<'bug' | 'melhoria'>('bug')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const err = await reportBug(type, message.trim())
      if (err) setError(err)
      else setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bug size={18} className="text-rose-300 light:text-rose-700 shrink-0" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900 truncate">Reportar bug ou melhoria</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Check size={22} />
            </div>
            <p className="text-sm text-zinc-300 light:text-zinc-700">
              Valeu! Seu relato foi enviado. A gente vai dar uma olhada.
            </p>
            <button onClick={onClose} className="btn-ghost !w-auto px-5 mt-1">
              Fechar
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-xs text-zinc-500">
              Encontrou algo quebrado ou tem uma ideia pra melhorar o app? Manda aqui — cai direto pra gente ver.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl border transition-colors ${
                  type === 'bug'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 light:text-rose-700'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:text-zinc-600 light:hover:bg-black/5'
                }`}
              >
                <Bug size={14} /> Bug
              </button>
              <button
                type="button"
                onClick={() => setType('melhoria')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl border transition-colors ${
                  type === 'melhoria'
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 light:text-purple-700'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:text-zinc-600 light:hover:bg-black/5'
                }`}
              >
                <Sparkles size={14} /> Melhoria
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">
                {type === 'bug' ? 'O que aconteceu' : 'O que você sugere'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === 'bug'
                    ? 'Ex.: cliquei em "Salvar" e a tela travou...'
                    : 'Ex.: seria legal poder ordenar as tarefas por...'
                }
                rows={4}
                className="input resize-none"
              />
            </div>

            {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

            <button onClick={handleSubmit} disabled={!message.trim() || submitting} className="btn-secondary disabled:opacity-50">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
