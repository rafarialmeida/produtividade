import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { CharacterRecipe, ColorSlot } from '../utils/boardPieces'

const WHITE = '#f8fafc'
const BLACK = '#18181b'
const FALLBACK = '#a1a1aa'

function colorForSlot(slot: ColorSlot, color: string, recipe: CharacterRecipe): string {
  if (slot === 'primary') return color
  if (slot === 'accentA') return recipe.accentA ?? FALLBACK
  if (slot === 'accentB') return recipe.accentB ?? FALLBACK
  if (slot === 'white') return WHITE
  return BLACK
}

function toVec3(v: number | [number, number, number]): [number, number, number] {
  return typeof v === 'number' ? [v, v, v] : v
}

export default function Character3D({
  recipe,
  color,
  idle = false,
  scale = 1,
}: {
  recipe: CharacterRecipe
  color: string
  idle?: boolean
  scale?: number
}) {
  const groupRef = useRef<Group>(null)
  const phase = useRef(Math.random() * Math.PI * 2)

  useFrame((state) => {
    if (!idle || !groupRef.current) return
    const t = state.clock.elapsedTime + phase.current
    groupRef.current.position.y = Math.sin(t * 1.6) * 0.03
    groupRef.current.rotation.y = Math.sin(t * 0.6) * 0.35
  })

  return (
    <group ref={groupRef} scale={scale}>
      {recipe.parts.map((part, i) => {
        const partColor = colorForSlot(part.slot, color, recipe)
        const partScale = toVec3(part.scale)
        return (
          <mesh key={i} position={part.position} rotation={part.rotation ?? [0, 0, 0]} scale={partScale} castShadow receiveShadow>
            {part.shape === 'sphere' && <sphereGeometry args={[0.5, 16, 12]} />}
            {part.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
            {part.shape === 'cone' && <coneGeometry args={[0.5, 1, 14]} />}
            {part.shape === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 14]} />}
            {part.shape === 'torus' && <torusGeometry args={[0.35, 0.12, 8, 22]} />}
            <meshStandardMaterial
              color={partColor}
              emissive={part.emissive ? partColor : '#000000'}
              emissiveIntensity={part.emissive ? 0.8 : 0}
              roughness={0.45}
              metalness={0.08}
            />
          </mesh>
        )
      })}
    </group>
  )
}
