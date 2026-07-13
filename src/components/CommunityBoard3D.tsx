import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import type { Group } from 'three'
import Character3D from './Character3D'
import { CHARACTER_MAP } from '../utils/boardPieces'

const STEP_HEIGHT = 0.35
const STEP_DEPTH = 0.9
const STEP_WIDTH = 2.6

export interface BoardMember {
  id: string
  name: string
  completed: number
  pieceId: string
  color: string
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
        <mesh key={i} position={[0, i * STEP_HEIGHT + STEP_HEIGHT / 2, -i * STEP_DEPTH]} receiveShadow castShadow>
          <boxGeometry args={[STEP_WIDTH, STEP_HEIGHT, STEP_DEPTH]} />
          <meshStandardMaterial color={i === 0 ? '#22c55e' : i % 2 === 0 ? '#27272a' : '#3f3f46'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function BoardToken({
  member,
  step,
  lane,
  laneCount,
}: {
  member: BoardMember
  step: number
  lane: number
  laneCount: number
}) {
  const outerRef = useRef<Group>(null)
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

  return (
    <group ref={outerRef} position={targetPos.current}>
      <Character3D recipe={recipe} color={member.color} idle scale={0.55} />
      <Html position={[0, 1.05, 0]} center distanceFactor={9} occlude={false} zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 text-[10px] text-white border border-white/15">
          {member.name}
        </div>
      </Html>
    </group>
  )
}

export default function CommunityBoard3D({ members }: { members: BoardMember[] }) {
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
            <BoardToken key={m.id} member={m} step={step} lane={lane} laneCount={group.length} />
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
