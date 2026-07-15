import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas } from '@react-three/fiber'
import { User, X } from 'lucide-react'
import Character3D from './Character3D'
import ProfileModal from './ProfileModal'
import type { CharacterRecipe } from '../utils/boardPieces'

export default function BoardMemberModal({
  userId,
  name,
  recipe,
  color,
  completed,
  onClose,
}: {
  userId: string
  name: string
  recipe: CharacterRecipe
  color: string
  completed: number
  onClose: () => void
}) {
  const [showProfile, setShowProfile] = useState(false)

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-xs">
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <h2 className="text-base font-bold text-white light:text-zinc-900 truncate">{name}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10 shrink-0"
            >
              <X size={17} />
            </button>
          </div>

          <div className="px-5 pb-5 flex flex-col gap-3">
            <div className="rounded-xl overflow-hidden border border-white/10 light:border-black/10" style={{ height: 180 }}>
              <Canvas camera={{ position: [0, 1, 2.9], fov: 38 }}>
                <color attach="background" args={['#0b0c12']} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[3, 4, 3]} intensity={1.1} />
                <group position={[0, -0.55, 0]}>
                  <Character3D recipe={recipe} color={color} idle scale={1} />
                </group>
              </Canvas>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-white light:text-zinc-900">{recipe.label}</p>
              <p className="text-[11px] text-zinc-500">
                {completed} tarefa{completed !== 1 ? 's' : ''} concluída{completed !== 1 ? 's' : ''} na comunidade
              </p>
            </div>

            <button onClick={() => setShowProfile(true)} className="btn-secondary flex items-center justify-center gap-1.5">
              <User size={14} /> Ver perfil
            </button>
          </div>
        </div>
      </div>

      {showProfile && <ProfileModal userId={userId} onClose={() => setShowProfile(false)} />}
    </>,
    document.body,
  )
}
