import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Lock, RefreshCcw, UserPlus, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'

export default function InviteModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const regenerateInviteCode = useAppStore((s) => s.regenerateInviteCode)

  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  if (!community) return null

  function handleCopy() {
    navigator.clipboard?.writeText(community!.inviteCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await regenerateInviteCode(communityId)
    } finally {
      setRegenerating(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <UserPlus size={18} className="text-emerald-300 light:text-emerald-600" />
            <h2 className="text-lg font-bold text-white light:text-zinc-900">Convidar Membros</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Código de convite</label>
            <div className="flex items-center gap-2">
              <div className="input font-mono tracking-[0.3em] text-center text-emerald-300 light:text-emerald-600 !w-auto flex-1">
                {community.inviteCode}
              </div>
              <button onClick={handleCopy} className="btn-ghost !w-auto px-3" title="Copiar código">
                {copied ? <Check size={15} className="text-emerald-400 light:text-emerald-600" /> : <Copy size={15} />}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="btn-ghost !w-auto px-3 disabled:opacity-50"
                title="Gerar novo código"
              >
                <RefreshCcw size={15} className={regenerating ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Compartilhe este código — a pessoa cria a conta (ou já tem uma) e pede para entrar pela aba "Comunidades". Um
              admin precisa aprovar na aba "Membros" antes de ela virar membro.
            </p>
            {community.closed && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-300 light:text-amber-600 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-2.5 py-1.5 mt-2">
                <Lock size={11} className="shrink-0" /> Comunidade fechada — mesmo com o código, ninguém consegue pedir para
                entrar agora.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
