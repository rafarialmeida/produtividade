import { createPortal } from 'react-dom'
import { Canvas } from '@react-three/fiber'
import { Coins, PawPrint, X } from 'lucide-react'
import { AdditiveBlending, DoubleSide } from 'three'
import Character3D from './Character3D'
import { getLevelInfo } from '../utils/level'
import { PET_MAP, type CharacterRecipe } from '../utils/boardPieces'
import { SHOP_ITEM_MAP } from '../utils/shopItems'

function PreviewAuraRing({ colors }: { colors: [string, string?] }) {
  return (
    <group position={[0, -0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.55, 0.78, 48]} />
        <meshBasicMaterial color={colors[0]} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      {colors[1] && (
        <mesh rotation={[0, 0, Math.PI / 6]}>
          <ringGeometry args={[0.8, 0.95, 48]} />
          <meshBasicMaterial color={colors[1]} transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

export default function CharacterProfileModal({
  recipe,
  color,
  workXp,
  groundAuraColors,
  petId,
  petColor,
  petLevel,
  criticalTasksCompleted,
  coins,
  onClose,
}: {
  recipe: CharacterRecipe
  color: string
  workXp: number
  groundAuraColors?: [string, string?]
  petId?: string
  petColor?: string
  petLevel?: number
  criticalTasksCompleted: number
  coins: number
  onClose: () => void
}) {
  const petRecipe = petId ? PET_MAP[petId] : undefined
  const levelInfo = getLevelInfo(workXp)
  const positive = levelInfo.level >= 1

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-sm my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Meu Perfil</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="rounded-xl overflow-hidden border border-white/10 light:border-black/10" style={{ height: 200 }}>
            <Canvas camera={{ position: [0, 1, 3.2], fov: 38 }}>
              <color attach="background" args={['#0b0c12']} />
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 4, 3]} intensity={1.1} />
              {groundAuraColors && <PreviewAuraRing colors={groundAuraColors} />}
              <group position={[0, -0.55, 0]}>
                <Character3D recipe={recipe} color={color} idle scale={1} />
                {petRecipe && petColor && (
                  <group position={[0.85, 0, 0.2]}>
                    <Character3D recipe={petRecipe} color={petColor} idle scale={1.3} />
                  </group>
                )}
              </group>
            </Canvas>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-purple-300 light:text-purple-600">{recipe.label} · Nv {levelInfo.level}</p>
              <p className="text-xs text-zinc-400 light:text-zinc-600 tabular-nums">{workXp} XP</p>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-white/5 light:bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${Math.min(100, Math.max(0, levelInfo.progress * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {positive
                ? `${levelInfo.xpToNextLevel} XP para o nível ${levelInfo.level + 1}`
                : `${levelInfo.xpToNextLevel} XP para cair pro nível ${levelInfo.level - 1}`}
            </p>
          </div>

          {petRecipe && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-rose-300 light:text-rose-700">
                <PawPrint size={14} /> {petId ? (SHOP_ITEM_MAP[petId]?.label ?? 'Bichinho') : 'Bichinho'} · Nv {petLevel}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                {criticalTasksCompleted} tarefa{criticalTasksCompleted !== 1 ? 's' : ''} crítica
                {criticalTasksCompleted !== 1 ? 's' : ''} concluída{criticalTasksCompleted !== 1 ? 's' : ''} — só isso faz o
                bichinho evoluir.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300 light:text-amber-600">
              <Coins size={15} /> Moedas
            </p>
            <p className="text-sm font-semibold text-amber-300 light:text-amber-600 tabular-nums">{coins}</p>
          </div>

          <p className="text-[11px] text-zinc-600 text-center">Só você vê essa tela.</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
