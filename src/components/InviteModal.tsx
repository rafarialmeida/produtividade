import { useState } from 'react'
import { Check, Copy, RefreshCcw, UserPlus, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'

export default function InviteModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const addFictionalMember = useAppStore((s) => s.addFictionalMember)
  const regenerateInviteCode = useAppStore((s) => s.regenerateInviteCode)

  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  if (!community) return null

  const members = community.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean)

  function handleCopy() {
    navigator.clipboard?.writeText(community!.inviteCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addFictionalMember(communityId, name.trim())
    setName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <UserPlus size={18} className="text-emerald-300" />
            <h2 className="text-lg font-bold text-white">Convidar Membros</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Código de convite</label>
            <div className="flex items-center gap-2">
              <div className="input font-mono tracking-[0.3em] text-center text-emerald-300 !w-auto flex-1">
                {community.inviteCode}
              </div>
              <button onClick={handleCopy} className="btn-ghost !w-auto px-3" title="Copiar código">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
              <button onClick={() => regenerateInviteCode(communityId)} className="btn-ghost !w-auto px-3" title="Gerar novo código">
                <RefreshCcw size={15} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Compartilhe este código na aba "Convite" da tela de login para novos membros entrarem.
            </p>
          </div>

          <div className="border-t border-white/5 pt-5">
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Simular novo membro fictício</label>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Marina Costa" className="input" />
              <button type="submit" className="btn-secondary !w-auto px-4">
                Adicionar
              </button>
            </form>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Adiciona instantaneamente um membro simulado para popular o ranking.
            </p>
          </div>

          <div className="border-t border-white/5 pt-5">
            <p className="text-xs font-medium text-zinc-400 mb-2">Membros ({members.length})</p>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => (
                <div key={m!.id} className="flex items-center gap-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border border-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                    {m!.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{m!.name}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{m!.email}</p>
                  </div>
                  {m!.role === 'admin' && (
                    <span className="ml-auto text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
