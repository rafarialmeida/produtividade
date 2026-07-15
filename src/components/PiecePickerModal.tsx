import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas } from '@react-three/fiber'
import { Check, Lock, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { CHARACTERS, CHARACTER_MAP, BOARD_COLORS } from '../utils/boardPieces'
import Character3D from './Character3D'

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
  const authUser = useAppStore((s) => s.authUser)
  const [pieceId, setPieceId] = useState(currentPieceId ?? CHARACTERS[0].id)
  const [color, setColor] = useState(currentColor ?? BOARD_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const recipe = CHARACTER_MAP[pieceId] ?? CHARACTERS[0]
  const regular = CHARACTERS.filter((c) => !c.exclusive)
  const exclusive = CHARACTERS.filter((c) => c.exclusive)

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
      <div className="glass-panel neon-border-green rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Escolher personagem</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="grid sm:grid-cols-[220px_1fr] gap-5">
            <div className="rounded-xl overflow-hidden border border-white/10 light:border-black/10" style={{ height: 220 }}>
              <Canvas camera={{ position: [0, 1, 2.9], fov: 38 }}>
                <color attach="background" args={['#0b0c12']} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 4, 3]} intensity={1.1} />
                <group position={[0, -0.55, 0]}>
                  <Character3D recipe={recipe} color={color} idle scale={1} />
                </group>
              </Canvas>
            </div>

            <div className="flex flex-col justify-center gap-1">
              <p className="text-sm font-semibold text-white light:text-zinc-900">{recipe.label}</p>
              <p className="text-[11px] text-zinc-500">
                {recipe.exclusive ? 'Personagem exclusivo de administradores' : 'Personagem regular'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Personagens</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {regular.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPieceId(c.id)}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors truncate ${
                    pieceId === c.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 light:text-emerald-600'
                      : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 light:border-black/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-medium text-amber-400/80 light:text-amber-600/80 mt-3 mb-2">Exclusivos de administradores</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {exclusive.map((c) => {
                const locked = !isCommunityAdmin
                const selected = pieceId === c.id
                return (
                  <button
                    key={c.id}
                    disabled={locked}
                    onClick={() => setPieceId(c.id)}
                    className={`relative flex items-center justify-between gap-1 text-left text-xs px-2.5 py-1.5 rounded-lg border ring-1 ring-amber-500/25 transition-colors truncate ${
                      selected
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 light:text-emerald-600'
                        : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 light:border-black/10'
                    } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="truncate">{c.label}</span>
                    {locked && <Lock size={11} className="shrink-0" />}
                    {selected && !locked && <Check size={11} className="text-emerald-400 light:text-emerald-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2">Cor</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
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

            {authUser?.equippedPalette && (
              <p className="text-[11px] text-amber-400/80 light:text-amber-600/80 mt-2">
                Você tem uma paleta exclusiva equipada na loja — ela substitui a cor escolhida aqui. Desequipe na loja
                pra usar uma cor normal.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-rose-400 light:text-rose-600">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar personagem'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
