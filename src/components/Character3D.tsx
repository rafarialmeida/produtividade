import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, Vector3, type Group } from 'three'
import type { CharacterRecipe, ColorSlot, PartDef } from '../utils/boardPieces'

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

const EXTENDABLE_SHAPES = new Set(['cone', 'cylinder', 'capsule', 'box'])

// Stretches a limb-like part toward its parent along its own local Y axis
// (keeping the visible outer tip fixed) so joints overlap instead of leaving
// a gap, e.g. an arm plugs into the torso instead of floating next to it.
// Positive `extend` grows toward local -Y (protrusions like ears/horns/tails,
// whose wide base sits at -Y by our cone convention). Negative `extend` grows
// toward local +Y instead (hanging limbs like arms/legs/tentacles, whose tip
// — hand/foot/sucker — is at -Y and whose body attachment is at +Y).
function computeJoint(part: PartDef): { position: [number, number, number]; scale: [number, number, number] } {
  const baseScale = toVec3(part.scale)
  if (!part.extend || !EXTENDABLE_SHAPES.has(part.shape)) {
    return { position: part.position, scale: baseScale }
  }
  const [rx, ry, rz] = part.rotation ?? [0, 0, 0]
  const dirSign = part.extend < 0 ? 1 : -1
  const dir = new Vector3(0, dirSign, 0).applyEuler(new Euler(rx, ry, rz))
  const magnitude = Math.abs(part.extend)
  const newScaleY = baseScale[1] * (1 + magnitude)
  const shift = dir.multiplyScalar((newScaleY - baseScale[1]) / 2)
  const [px, py, pz] = part.position
  return {
    position: [px + shift.x, py + shift.y, pz + shift.z],
    scale: [baseScale[0], newScaleY, baseScale[2]],
  }
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
        const { position, scale: partScale } = computeJoint(part)
        return (
          <mesh key={i} position={position} rotation={part.rotation ?? [0, 0, 0]} scale={partScale} castShadow receiveShadow>
            {part.shape === 'sphere' && <sphereGeometry args={[0.5, 24, 18]} />}
            {part.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
            {part.shape === 'cone' && <coneGeometry args={[0.5, 1, 20]} />}
            {part.shape === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 20]} />}
            {part.shape === 'capsule' && <capsuleGeometry args={[0.28, 0.44, 4, 12]} />}
            {part.shape === 'torus' && <torusGeometry args={[0.35, 0.12, 10, 26]} />}
            <meshStandardMaterial
              color={partColor}
              emissive={part.emissive ? partColor : '#000000'}
              emissiveIntensity={part.emissive ? 0.8 : 0}
              roughness={0.4}
              metalness={0.04}
            />
          </mesh>
        )
      })}
    </group>
  )
}
