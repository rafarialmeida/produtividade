import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Severity } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'

export default function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const createCommunity = useAppStore((s) => s.createCommunity)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [severity, setSeverity] = useState<Severity>('media')

  const isValid = name.trim().length >= 3

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    const community = createCommunity(name.trim(), severity)
    onClose()
    navigate(`/community/${community.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-purple-300" />
            <h2 className="text-lg font-bold text-white">Criar Nova Comunidade</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nome da comunidade</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Squad Beta — Growth" className="input" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block">Gravidade geral das regras</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(URGENCY_CONFIG) as Severity[]).map((key) => {
                const cfg = URGENCY_CONFIG[key]
                const active = severity === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSeverity(key)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      active ? `${cfg.bg} ${cfg.border}` : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? cfg.color : 'text-zinc-300'}`}>{cfg.label}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <button type="submit" disabled={!isValid} className="btn-primary">
            Criar Comunidade
          </button>
        </form>
      </div>
    </div>
  )
}
