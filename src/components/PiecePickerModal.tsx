import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Lock, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { BOARD_COLORS, BOARD_PIECES } from '../utils/boardPieces'

export default function PiecePickerModal({
  communityId,
  isCommunityAdmin,
  currentPieceId,
  currentColor,
  onClose,
}: {
  communityId: string
  isCommunityAdmin: boolean
  currentPieceId?: string
  currentColor?: string
  onClose: () => void
}) {
  const setCommunityPiece = useAppStore((s) => s.setCommunityPiece)
  const [pieceId, setPieceId] = useState(currentPieceId ?? BOARD_PIECES[0].id)
  const [color, setColor] = useState(currentColor ?? BOARD_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    setSaving(true)
    const err = await setCommunityPiece(communityId, pieceId, color)
    setSaving(false)
    if (err) setError('Não foi possível salvar. Tente novamente.')
    else onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Escolher peça</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Boneco</p>
            <div className="grid grid-cols-5 gap-2">
              {BOARD_PIECES.map((p) => {
                const locked = p.exclusive && !isCommunityAdmin
                const selected = pieceId === p.id
                return (
                  <button
                    key={p.id}
                    disabled={locked}
                    onClick={() => setPieceId(p.id)}
                    title={locked ? `${p.label} (exclusivo de admins)` : p.label}
                    className={`relative aspect-square rounded-xl border flex items-center justify-center transition-colors ${
                      selected
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-white/10 bg-white/[0.03] light:border-black/10 light:bg-black/[0.02]'
                    } ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/25'} ${
                      p.exclusive ? 'ring-1 ring-amber-500/30' : ''
                    }`}
                  >
                    <p.icon size={18} style={{ color: selected ? color : undefined }} className={selected ? '' : 'text-zinc-400'} />
                    {locked && <Lock size={10} className="absolute top-1 right-1 text-zinc-500" />}
                    {selected && <Check size={10} className="absolute bottom-1 right-1 text-emerald-400" />}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Bonecos com borda dourada são exclusivos de administradores da comunidade.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Cor</p>
            <div className="grid grid-cols-10 gap-2">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  style={{ backgroundColor: c }}
                  className={`aspect-square rounded-full border-2 transition-transform ${
                    color === c ? 'border-white light:border-zinc-900 scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar peça'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
