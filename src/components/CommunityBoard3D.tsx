import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, type Group, type Mesh, type PointLight } from 'three'
import Character3D from './Character3D'
import { CHARACTER_MAP, PET_MAP } from '../utils/boardPieces'

const STEP_HEIGHT = 0.35
const STEP_DEPTH = 0.9
const STEP_WIDTH = 2.6

export interface BoardMember {
  id: string
  name: string
  completed: number
  pieceId: string
  color: string
  level?: number
  nameFrameColors?: [string, string?]
  groundAuraColors?: [string, string?]
  petId?: string
  petColor?: string
  petLevel?: number
}

// Estágio de evolução do bichinho: só sobe com tarefas de complexidade
// crítica concluídas (nível calculado fora daqui), não com XP normal.
function petStage(level: number): 1 | 2 | 3 {
  if (level >= 10) return 3
  if (level >= 5) return 2
  return 1
}

function PetCompanion({
  petId,
  color,
  level,
  onSelect,
}: {
  petId: string
  color: string
  level: number
  onSelect?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const recipe = PET_MAP[petId]
  if (!recipe) return null

  const stage = petStage(level)
  const baseScale = stage === 3 ? 0.85 : stage === 2 ? 0.7 : 0.55

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onSelect?.()
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  function handlePointerOut() {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  return (
    <group position={[0.55, 0, 0.15]} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
      {stage >= 3 && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.34, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
      <Character3D recipe={recipe} color={color} idle scale={hovered ? baseScale * 1.15 : baseScale} />
    </group>
  )
}

// Efeito de luz saindo do chão: feixe vertical translúcido (blending aditivo,
// então "brilha" contra o fundo escuro em vez de só pintar um anel plano),
// uma luz pontual colorida pulsante que ilumina de fato o personagem, e os
// anéis do chão girando devagar por baixo.
function GroundAura({ colors }: { colors: [string, string?] }) {
  const ringRef = useRef<Group>(null)
  const beamRef = useRef<Mesh>(null)
  const lightRef = useRef<PointLight>(null)

  useFrame(({ clock }, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.5
    const pulse = 0.75 + Math.sin(clock.elapsedTime * 2.4) * 0.25
    const beamMat = beamRef.current?.material
    if (beamMat && 'opacity' in beamMat) beamMat.opacity = 0.22 * pulse
    if (lightRef.current) lightRef.current.intensity = 1.3 * pulse
  })

  return (
    <group>
      <pointLight ref={lightRef} color={colors[0]} intensity={1.3} distance={1.7} position={[0, 0.15, 0]} />
      <mesh ref={beamRef} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.05, 0.32, 1.5, 24, 1, true]} />
        <meshBasicMaterial
          color={colors[0]}
          transparent
          opacity={0.22}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <group ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[0.28, 0.46, 48]} />
          <meshBasicMaterial color={colors[0]} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
        {colors[1] && (
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <ringGeometry args={[0.48, 0.58, 48]} />
            <meshBasicMaterial
              color={colors[1]}
              transparent
              opacity={0.7}
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  )
}

function stepPosition(step: number, lane: number, laneCount: number): [number, number, number] {
  const spacing = Math.min(0.55, 1.8 / laneCount)
  const x = (lane - (laneCount - 1) / 2) * spacing
  const y = (step + 1) * STEP_HEIGHT
  const z = -step * STEP_DEPTH
  return [x, y, z]
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3)
}

function Staircase({ boardSize }: { boardSize: number }) {
  const steps = useMemo(() => Array.from({ length: boardSize }, (_, i) => i), [boardSize])
  return (
    <group>
      {steps.map((i) => (
        <group key={i}>
          <mesh position={[0, i * STEP_HEIGHT + STEP_HEIGHT / 2, -i * STEP_DEPTH]} receiveShadow castShadow>
            <boxGeometry args={[STEP_WIDTH, STEP_HEIGHT, STEP_DEPTH]} />
            <meshStandardMaterial color={i === 0 ? '#22c55e' : i % 2 === 0 ? '#8b5cf6' : '#6d28d9'} roughness={0.55} metalness={0.1} />
          </mesh>
          <mesh position={[0, i * STEP_HEIGHT + STEP_HEIGHT + 0.008, -i * STEP_DEPTH + STEP_DEPTH / 2 - 0.03]}>
            <boxGeometry args={[STEP_WIDTH, 0.016, 0.06]} />
            <meshStandardMaterial color={i === 0 ? '#bbf7d0' : '#e9d5ff'} emissive={i === 0 ? '#4ade80' : '#c4b5fd'} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BoardToken({
  member,
  step,
  lane,
  laneCount,
  onSelect,
  onSelectPet,
}: {
  member: BoardMember
  step: number
  lane: number
  laneCount: number
  onSelect?: (id: string) => void
  onSelectPet?: (id: string) => void
}) {
  const outerRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const lastStep = useRef(step)
  const startPos = useRef(stepPosition(step, lane, laneCount))
  const targetPos = useRef(stepPosition(step, lane, laneCount))
  const progress = useRef(1)

  useFrame((_, delta) => {
    const g = outerRef.current
    if (!g) return

    if (lastStep.current !== step) {
      startPos.current = [g.position.x, g.position.y, g.position.z]
      targetPos.current = stepPosition(step, lane, laneCount)
      progress.current = 0
      lastStep.current = step
    } else {
      targetPos.current = stepPosition(step, lane, laneCount)
    }

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / 0.7)
      const p = easeOutCubic(progress.current)
      const [sx, sy, sz] = startPos.current
      const [tx, ty, tz] = targetPos.current
      const hop = Math.sin(progress.current * Math.PI) * 0.32
      g.position.set(sx + (tx - sx) * p, sy + (ty - sy) * p + hop, sz + (tz - sz) * p)
      g.rotation.y = Math.sin(progress.current * Math.PI) * 0.6
    } else {
      g.position.set(...targetPos.current)
      g.rotation.y = 0
    }
  })

  const recipe = CHARACTER_MAP[member.pieceId]
  if (!recipe) return null

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onSelect?.(member.id)
  }

  function handlePointerOver(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  function handlePointerOut() {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  const frameColors = member.nameFrameColors
  const frameStyle = frameColors
    ? {
        borderColor: frameColors[0],
        boxShadow: `0 0 8px ${frameColors[0]}`,
        color: frameColors[1] ?? '#fff',
      }
    : undefined

  return (
    <group
      ref={outerRef}
      position={targetPos.current}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {member.groundAuraColors && <GroundAura colors={member.groundAuraColors} />}
      <Character3D recipe={recipe} color={member.color} idle scale={hovered ? 0.6 : 0.55} />
      {member.petId && member.petColor && (
        <PetCompanion
          petId={member.petId}
          color={member.petColor}
          level={member.petLevel ?? 1}
          onSelect={() => onSelectPet?.(member.id)}
        />
      )}
      <Html position={[0, 1.55, 0]} center distanceFactor={9} occlude={false} zIndexRange={[10, 0]}>
        <div
          style={frameStyle}
          className="pointer-events-none select-none whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[10px] text-white border border-white/15"
        >
          {member.level != null && <span className="opacity-75 mr-1">Nv {member.level}</span>}
          {member.name}
        </div>
      </Html>
    </group>
  )
}

export default function CommunityBoard3D({
  members,
  onSelectMember,
  onSelectPet,
}: {
  members: BoardMember[]
  onSelectMember?: (id: string) => void
  onSelectPet?: (id: string) => void
}) {
  const boardSize = Math.max(20, Math.min(40, Math.max(0, ...members.map((m) => m.completed)) + 5))

  const bySteps = useMemo(() => {
    const map = new Map<number, BoardMember[]>()
    for (const m of members) {
      const step = Math.min(m.completed, boardSize - 1)
      const list = map.get(step) ?? []
      list.push(m)
      map.set(step, list)
    }
    return map
  }, [members, boardSize])

  const maxStep = members.length ? Math.min(Math.max(...members.map((m) => m.completed)), boardSize - 1) : 0
  const minStep = members.length ? Math.min(Math.min(...members.map((m) => m.completed)), boardSize - 1) : 0
  const midStep = (minStep + maxStep) / 2
  const spread = maxStep - minStep
  const targetY = (midStep + 1) * STEP_HEIGHT
  const targetZ = -midStep * STEP_DEPTH
  const camDist = 5.5 + spread * 0.55

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/10 light:border-black/10 h-[280px] sm:h-[380px]"
      style={{ touchAction: 'none' }}
    >
      <Canvas shadows camera={{ position: [4.2, targetY + 2.6 + spread * 0.12, targetZ + camDist], fov: 42 }}>
        <color attach="background" args={['#0b0c12']} />
        <fog attach="fog" args={['#0b0c12', 6, 24]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#8888ff', '#2a1a08', 0.35]} />
        <directionalLight position={[5, 8, 4]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
        <Staircase boardSize={boardSize} />
        {Array.from(bySteps.entries()).map(([step, group]) =>
          group.map((m, lane) => (
            <BoardToken
              key={m.id}
              member={m}
              step={step}
              lane={lane}
              laneCount={group.length}
              onSelect={onSelectMember}
              onSelectPet={onSelectPet}
            />
          )),
        )}
        <OrbitControls
          target={[0, targetY, targetZ]}
          enablePan
          minDistance={3}
          maxDistance={26}
          minPolarAngle={0.5}
          maxPolarAngle={1.35}
        />
      </Canvas>
    </div>
  )
}
