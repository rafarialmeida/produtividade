export type ColorSlot = 'primary' | 'accentA' | 'accentB' | 'white' | 'black'

export interface PartDef {
  shape: 'sphere' | 'box' | 'cone' | 'cylinder' | 'capsule' | 'torus'
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: number | [number, number, number]
  slot: ColorSlot
  emissive?: boolean
  /** Stretches this part toward its parent along its own local -Y axis (keeping the
   * outer tip fixed) so the joint overlaps instead of leaving a visible gap. Only
   * applies to cone/cylinder/capsule/box shapes. Value is a fraction, e.g. 0.4 = 40% longer. */
  extend?: number
}

export interface CharacterRecipe {
  id: string
  label: string
  exclusive: boolean
  accentA?: string
  accentB?: string
  parts: PartDef[]
}

function eyes(y: number, z: number, spacing = 0.1, size = 0.05, slot: ColorSlot = 'black', emissive = false): PartDef[] {
  return [
    { shape: 'sphere', position: [-spacing, y, z], scale: size, slot, emissive },
    { shape: 'sphere', position: [spacing, y, z], scale: size, slot, emissive },
  ]
}

function mirror(part: PartDef): PartDef[] {
  const [x, y, z] = part.position
  const [rx, ry, rz] = part.rotation ?? [0, 0, 0]
  const ax = Math.abs(x)
  return [
    { ...part, position: [-ax, y, z], rotation: [rx, ry, -rz] },
    { ...part, position: [ax, y, z], rotation: [rx, ry, rz] },
  ]
}

export const CHARACTERS: CharacterRecipe[] = [
  {
    id: 'fox',
    label: 'Raposa Kit',
    exclusive: false,
    parts: [
      { shape: 'sphere', position: [0, 0.46, 0], scale: [0.4, 0.38, 0.4], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.92, 0.03], scale: [0.27, 0.25, 0.27], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.72, 0.04], scale: [0.2, 0.22, 0.2], slot: 'primary' },
      ...mirror({ shape: 'cone', position: [0.13, 1.17, 0.02], rotation: [0, 0, -0.35], scale: [0.08, 0.2, 0.08], slot: 'primary', extend: 0.5 }),
      { shape: 'sphere', position: [0, 0.86, 0.23], scale: [0.12, 0.1, 0.15], slot: 'white' },
      { shape: 'sphere', position: [0, 0.87, 0.33], scale: 0.035, slot: 'black' },
      ...eyes(0.95, 0.2, 0.09, 0.045),
      { shape: 'cone', position: [0, 0.5, -0.38], rotation: [-1.15, 0, 0], scale: [0.13, 0.4, 0.13], slot: 'primary', extend: 0.4 },
      { shape: 'sphere', position: [0, 0.72, -0.58], scale: 0.1, slot: 'white' },
    ],
  },
  {
    id: 'owl',
    label: 'Coruja Lux',
    exclusive: false,
    accentA: '#f59e0b',
    parts: [
      { shape: 'sphere', position: [0, 0.55, 0], scale: [0.42, 0.48, 0.42], slot: 'primary' },
      { shape: 'sphere', position: [0, 1.02, 0], scale: [0.3, 0.28, 0.3], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.83, 0], scale: [0.32, 0.18, 0.32], slot: 'primary' },
      ...mirror({ shape: 'sphere', position: [0.13, 1.04, 0.24], scale: 0.11, slot: 'white' }),
      ...eyes(1.04, 0.32, 0.13, 0.05),
      { shape: 'cone', position: [0, 0.97, 0.3], rotation: [Math.PI / 2, 0, 0], scale: [0.06, 0.12, 0.06], slot: 'accentA', extend: 0.4 },
      ...mirror({ shape: 'sphere', position: [0.4, 0.55, 0], rotation: [0, 0, 0.5], scale: [0.14, 0.34, 0.2], slot: 'accentB' }),
      ...mirror({ shape: 'cone', position: [0.12, 1.28, -0.02], rotation: [0, 0, -0.2], scale: [0.05, 0.12, 0.05], slot: 'primary', extend: 0.4 }),
    ],
  },
  {
    id: 'astronaut',
    label: 'Astronauta Pip',
    exclusive: false,
    accentA: '#e5e7eb',
    accentB: '#334155',
    parts: [
      { shape: 'box', position: [0, 0.5, 0], scale: [0.4, 0.5, 0.28], slot: 'accentA' },
      { shape: 'sphere', position: [0, 1.05, 0], scale: [0.3, 0.3, 0.3], slot: 'white' },
      { shape: 'cylinder', position: [0, 0.85, 0], scale: [0.16, 0.2, 0.16], slot: 'accentA' },
      { shape: 'sphere', position: [0, 1.05, 0.18], scale: [0.22, 0.2, 0.12], slot: 'primary' },
      { shape: 'box', position: [0, 0.55, -0.22], scale: [0.24, 0.34, 0.14], slot: 'accentB' },
      ...mirror({ shape: 'capsule', position: [0.26, 0.5, 0], rotation: [0, 0, 0.15], scale: [0.11, 0.42, 0.11], slot: 'accentA', extend: -0.4 }),
      ...mirror({ shape: 'capsule', position: [0.12, 0.14, 0], scale: [0.13, 0.32, 0.13], slot: 'accentA', extend: -0.4 }),
      { shape: 'cylinder', position: [0, 1.28, 0], scale: [0.02, 0.14, 0.02], slot: 'accentB', extend: 0.5 },
      { shape: 'sphere', position: [0, 1.36, 0], scale: 0.035, slot: 'primary' },
    ],
  },
  {
    id: 'dino',
    label: 'Dino Rex',
    exclusive: false,
    accentA: '#fbbf24',
    parts: [
      { shape: 'sphere', position: [0, 0.45, 0], scale: [0.38, 0.36, 0.42], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.78, 0.32], scale: [0.22, 0.2, 0.24], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.62, 0.18], scale: [0.18, 0.18, 0.2], slot: 'primary' },
      { shape: 'box', position: [0, 0.72, 0.5], scale: [0.16, 0.12, 0.16], slot: 'primary' },
      ...eyes(0.84, 0.42, 0.11, 0.045),
      { shape: 'cone', position: [0, 0.72, -0.02], scale: [0.06, 0.14, 0.06], slot: 'accentA', extend: 0.5 },
      { shape: 'cone', position: [0, 0.7, -0.18], scale: [0.055, 0.12, 0.055], slot: 'accentA', extend: 0.5 },
      { shape: 'cone', position: [0, 0.66, -0.33], scale: [0.05, 0.1, 0.05], slot: 'accentA', extend: 0.5 },
      { shape: 'cone', position: [0, 0.4, -0.5], rotation: [-1.3, 0, 0], scale: [0.14, 0.5, 0.14], slot: 'primary', extend: 0.4 },
      ...mirror({ shape: 'capsule', position: [0.16, 0.1, 0.05], scale: [0.12, 0.24, 0.12], slot: 'primary', extend: -0.5 }),
    ],
  },
  {
    id: 'fish',
    label: 'Peixe Bolha',
    exclusive: false,
    accentA: '#38bdf8',
    accentB: '#0f172a',
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.32, 0.28, 0.42], slot: 'primary' },
      { shape: 'cone', position: [0, 0.5, -0.42], rotation: [0, 0, Math.PI / 2], scale: [0.22, 0.3, 0.05], slot: 'accentA', extend: 0.4 },
      { shape: 'cone', position: [0, 0.8, 0], scale: [0.05, 0.18, 0.16], slot: 'accentA', extend: 0.4 },
      ...mirror({ shape: 'cone', position: [0.22, 0.48, 0.05], rotation: [0, 0, -0.6], scale: [0.06, 0.16, 0.05], slot: 'accentA', extend: 0.4 }),
      ...eyes(0.56, 0.28, 0.13, 0.06),
      { shape: 'torus', position: [0, 0.46, 0.42], rotation: [Math.PI / 2, 0, 0], scale: [0.06, 0.06, 0.06], slot: 'accentB' },
      { shape: 'sphere', position: [0.22, 0.85, 0.1], scale: 0.05, slot: 'white' },
    ],
  },
  {
    id: 'rabbit',
    label: 'Coelho Salto',
    exclusive: false,
    accentA: '#fda4af',
    parts: [
      { shape: 'sphere', position: [0, 0.42, 0], scale: [0.36, 0.34, 0.36], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.82, 0.04], scale: [0.24, 0.22, 0.24], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.66, 0.02], scale: [0.18, 0.18, 0.18], slot: 'primary' },
      ...mirror({ shape: 'capsule', position: [0.09, 1.15, 0], rotation: [0, 0, 0.15], scale: [0.08, 0.36, 0.08], slot: 'primary', extend: 0.4 }),
      ...mirror({ shape: 'capsule', position: [0.09, 1.13, 0.03], rotation: [0, 0, 0.15], scale: [0.045, 0.3, 0.045], slot: 'white', extend: 0.4 }),
      ...eyes(0.85, 0.22, 0.09, 0.045),
      { shape: 'sphere', position: [0, 0.78, 0.26], scale: 0.035, slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.42, -0.34], scale: 0.11, slot: 'white' },
      ...mirror({ shape: 'sphere', position: [0.13, 0.17, 0.08], scale: [0.12, 0.11, 0.18], slot: 'primary' }),
    ],
  },
  {
    id: 'bear',
    label: 'Urso Nuvem',
    exclusive: false,
    accentA: '#e7c9a3',
    parts: [
      { shape: 'sphere', position: [0, 0.46, 0], scale: [0.4, 0.4, 0.4], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.92, 0.02], scale: [0.28, 0.26, 0.28], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.72, 0.01], scale: [0.22, 0.22, 0.22], slot: 'primary' },
      ...mirror({ shape: 'sphere', position: [0.14, 1.06, 0], scale: 0.11, slot: 'primary' }),
      { shape: 'sphere', position: [0, 0.86, 0.24], scale: [0.13, 0.11, 0.13], slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.88, 0.34], scale: 0.04, slot: 'black' },
      ...eyes(0.95, 0.22, 0.1, 0.045),
      ...mirror({ shape: 'sphere', position: [0.25, 0.5, 0], scale: [0.16, 0.24, 0.16], slot: 'primary' }),
      ...mirror({ shape: 'sphere', position: [0.16, 0.16, 0.05], scale: 0.17, slot: 'primary' }),
    ],
  },
  {
    id: 'cat',
    label: 'Gato Neo',
    exclusive: false,
    accentA: '#fda4af',
    parts: [
      { shape: 'sphere', position: [0, 0.46, 0], scale: [0.36, 0.36, 0.36], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.9, 0.02], scale: [0.25, 0.23, 0.25], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.71, 0.01], scale: [0.19, 0.2, 0.19], slot: 'primary' },
      ...mirror({ shape: 'cone', position: [0.13, 1.14, 0], rotation: [0, 0, -0.3], scale: [0.08, 0.16, 0.08], slot: 'primary', extend: 0.5 }),
      ...eyes(0.92, 0.2, 0.09, 0.045),
      { shape: 'cone', position: [0, 0.85, 0.24], rotation: [Math.PI / 2, 0, 0], scale: [0.03, 0.04, 0.03], slot: 'accentA' },
      ...mirror({ shape: 'cylinder', position: [0.22, 0.86, 0.2], rotation: [0, 0, Math.PI / 2], scale: [0.008, 0.2, 0.008], slot: 'white' }),
      { shape: 'cone', position: [0, 0.5, -0.36], rotation: [-1.2, 0, 0], scale: [0.09, 0.4, 0.09], slot: 'primary', extend: 0.4 },
    ],
  },
  {
    id: 'ghost',
    label: 'Fantasma Boo',
    exclusive: false,
    parts: [
      { shape: 'cone', position: [0, 0.5, 0], rotation: [Math.PI, 0, 0], scale: [0.36, 0.55, 0.36], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.85, 0], scale: [0.34, 0.28, 0.34], slot: 'primary' },
      ...eyes(0.9, 0.28, 0.1, 0.05),
      { shape: 'sphere', position: [0, 0.78, 0.3], scale: [0.05, 0.06, 0.03], slot: 'black' },
      ...mirror({ shape: 'sphere', position: [0.3, 0.45, 0], scale: [0.08, 0.14, 0.08], slot: 'primary' }),
    ],
  },
  {
    id: 'bird',
    label: 'Pássaro Pipo',
    exclusive: false,
    accentA: '#f59e0b',
    accentB: '#1e293b',
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.28, 0.3, 0.3], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.86, 0.08], scale: [0.2, 0.19, 0.2], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.7, 0.04], scale: [0.15, 0.16, 0.15], slot: 'primary' },
      { shape: 'cone', position: [0, 0.85, 0.26], rotation: [Math.PI / 2, 0, 0], scale: [0.07, 0.14, 0.07], slot: 'accentA', extend: 0.4 },
      ...eyes(0.9, 0.24, 0.1, 0.045),
      ...mirror({ shape: 'sphere', position: [0.26, 0.5, 0], rotation: [0, 0, 0.3], scale: [0.1, 0.24, 0.16], slot: 'accentB' }),
      { shape: 'cone', position: [0, 0.52, -0.32], rotation: [-1.5, 0, 0], scale: [0.08, 0.26, 0.03], slot: 'accentB', extend: 0.4 },
      { shape: 'cone', position: [0, 1.05, 0.06], rotation: [0, 0, 0.15], scale: [0.04, 0.12, 0.04], slot: 'accentA', extend: 0.4 },
      ...mirror({ shape: 'cylinder', position: [0.08, 0.14, 0.02], scale: [0.03, 0.24, 0.03], slot: 'accentA', extend: -0.4 }),
    ],
  },
  {
    id: 'turtle',
    label: 'Tartaruga Vagar',
    exclusive: false,
    accentA: '#65a30d',
    accentB: '#365314',
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.4, 0.32, 0.4], slot: 'accentA' },
      { shape: 'torus', position: [0, 0.6, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.25, 0.25, 0.06], slot: 'accentB' },
      { shape: 'sphere', position: [0, 0.46, 0.26], scale: [0.1, 0.1, 0.12], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.44, 0.36], scale: [0.14, 0.13, 0.14], slot: 'primary' },
      ...eyes(0.47, 0.44, 0.06, 0.03),
      ...mirror({ shape: 'capsule', position: [0.22, 0.22, 0.24], rotation: [0, 0, 0.3], scale: [0.09, 0.2, 0.09], slot: 'primary', extend: -0.4 }),
      ...mirror({ shape: 'capsule', position: [0.22, 0.22, -0.24], rotation: [0, 0, -0.3], scale: [0.09, 0.2, 0.09], slot: 'primary', extend: -0.4 }),
      { shape: 'cone', position: [0, 0.24, -0.38], rotation: [-1.3, 0, 0], scale: [0.04, 0.1, 0.04], slot: 'primary', extend: 0.4 },
    ],
  },
  {
    id: 'squirrel',
    label: 'Esquilo Avelã',
    exclusive: false,
    accentA: '#e7c9a3',
    accentB: '#78350f',
    parts: [
      { shape: 'sphere', position: [0, 0.42, 0], scale: [0.3, 0.3, 0.32], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.78, 0.06], scale: [0.2, 0.19, 0.2], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.63, 0.03], scale: [0.15, 0.16, 0.15], slot: 'primary' },
      ...mirror({ shape: 'cone', position: [0.1, 0.96, 0.02], rotation: [0, 0, -0.3], scale: [0.06, 0.14, 0.06], slot: 'primary', extend: 0.5 }),
      ...eyes(0.8, 0.22, 0.08, 0.04),
      ...mirror({ shape: 'sphere', position: [0.16, 0.74, 0.16], scale: 0.08, slot: 'accentA' }),
      { shape: 'cone', position: [0, 0.7, -0.32], rotation: [-0.6, 0, 0], scale: [0.22, 0.55, 0.22], slot: 'accentA', extend: 0.35 },
      { shape: 'sphere', position: [0.2, 0.5, 0.22], scale: 0.06, slot: 'accentB' },
    ],
  },
  {
    id: 'snail',
    label: 'Caracol Molasso',
    exclusive: false,
    accentA: '#a3e635',
    accentB: '#3f6212',
    parts: [
      { shape: 'cylinder', position: [0, 0.16, 0.1], rotation: [Math.PI / 2, 0, 0], scale: [0.14, 0.5, 0.14], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.24, -0.1], scale: [0.16, 0.14, 0.16], slot: 'accentA' },
      { shape: 'torus', position: [0, 0.24, -0.12], rotation: [Math.PI / 2, 0, 0], scale: [0.28, 0.28, 0.16], slot: 'accentA' },
      { shape: 'torus', position: [0, 0.24, -0.12], rotation: [Math.PI / 2, 0, 0], scale: [0.16, 0.16, 0.12], slot: 'accentB' },
      { shape: 'sphere', position: [0, 0.2, 0.34], scale: [0.12, 0.11, 0.12], slot: 'primary' },
      ...mirror({ shape: 'cylinder', position: [0.05, 0.32, 0.38], rotation: [0.3, 0, 0], scale: [0.025, 0.16, 0.025], slot: 'primary', extend: 0.4 }),
      ...mirror({ shape: 'sphere', position: [0.05, 0.4, 0.42], scale: 0.035, slot: 'black' }),
    ],
  },
  {
    id: 'octopus',
    label: 'Polvo Tinta',
    exclusive: false,
    accentA: '#fda4af',
    parts: [
      { shape: 'sphere', position: [0, 0.62, 0], scale: [0.34, 0.32, 0.34], slot: 'primary' },
      ...eyes(0.68, 0.24, 0.13, 0.06),
      ...mirror({ shape: 'capsule', position: [0.16, 0.25, 0.14], rotation: [0.4, 0, 0.3], scale: [0.08, 0.42, 0.08], slot: 'primary', extend: -0.45 }),
      ...mirror({ shape: 'capsule', position: [0.16, 0.25, -0.14], rotation: [-0.4, 0, 0.3], scale: [0.08, 0.42, 0.08], slot: 'primary', extend: -0.45 }),
      ...mirror({ shape: 'sphere', position: [0.2, 0.6, 0.2], scale: 0.04, slot: 'accentA' }),
    ],
  },
  {
    id: 'panda',
    label: 'Panda Bambu',
    exclusive: false,
    parts: [
      { shape: 'sphere', position: [0, 0.46, 0], scale: [0.38, 0.38, 0.38], slot: 'white' },
      { shape: 'sphere', position: [0, 0.9, 0.02], scale: [0.27, 0.25, 0.27], slot: 'white' },
      { shape: 'sphere', position: [0, 0.71, 0.01], scale: [0.2, 0.2, 0.2], slot: 'white' },
      ...mirror({ shape: 'sphere', position: [0.15, 1.04, 0], scale: 0.1, slot: 'black' }),
      ...mirror({ shape: 'sphere', position: [0.1, 0.93, 0.22], scale: [0.09, 0.11, 0.05], slot: 'black' }),
      ...eyes(0.94, 0.25, 0.1, 0.04),
      { shape: 'sphere', position: [0, 0.85, 0.28], scale: 0.035, slot: 'black' },
      ...mirror({ shape: 'sphere', position: [0.23, 0.5, 0], scale: [0.14, 0.22, 0.14], slot: 'black' }),
      ...mirror({ shape: 'sphere', position: [0.16, 0.2, 0.05], scale: 0.15, slot: 'black' }),
      { shape: 'torus', position: [0, 0.76, 0.06], rotation: [Math.PI / 2, 0, 0], scale: [0.2, 0.2, 0.045], slot: 'primary' },
    ],
  },
  {
    id: 'cloud',
    label: 'Nuvem Fofa',
    exclusive: false,
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.3, 0.26, 0.3], slot: 'white' },
      { shape: 'sphere', position: [-0.24, 0.5, 0], scale: [0.22, 0.2, 0.22], slot: 'white' },
      { shape: 'sphere', position: [0.24, 0.5, 0], scale: [0.22, 0.2, 0.22], slot: 'white' },
      { shape: 'sphere', position: [0, 0.62, 0.05], scale: [0.2, 0.18, 0.2], slot: 'white' },
      { shape: 'sphere', position: [0, 0.4, 0.05], scale: [0.26, 0.16, 0.26], slot: 'primary' },
      ...eyes(0.55, 0.24, 0.1, 0.045),
      { shape: 'torus', position: [0, 0.46, 0.26], scale: [0.04, 0.04, 0.02], slot: 'black' },
    ],
  },
  {
    id: 'frog',
    label: 'Sapo Splash',
    exclusive: false,
    accentB: '#166534',
    parts: [
      { shape: 'sphere', position: [0, 0.36, 0], scale: [0.36, 0.3, 0.38], slot: 'primary' },
      ...mirror({ shape: 'sphere', position: [0.14, 0.58, 0.16], scale: 0.15, slot: 'primary' }),
      { shape: 'sphere', position: [-0.14, 0.65, 0.22], scale: 0.05, slot: 'black' },
      { shape: 'sphere', position: [0.14, 0.65, 0.22], scale: 0.05, slot: 'black' },
      { shape: 'torus', position: [0, 0.42, 0.32], scale: [0.14, 0.05, 0.02], slot: 'accentB' },
      ...mirror({ shape: 'sphere', position: [0.26, 0.12, 0.22], scale: [0.13, 0.09, 0.17], slot: 'primary' }),
      ...mirror({ shape: 'sphere', position: [0.28, 0.1, -0.16], scale: [0.17, 0.11, 0.21], slot: 'primary' }),
    ],
  },
  {
    id: 'ninja',
    label: 'Ninja Kobo',
    exclusive: false,
    accentA: '#f2c9a0',
    accentB: '#1c1917',
    parts: [
      { shape: 'cylinder', position: [0, 0.42, 0], scale: [0.22, 0.4, 0.22], slot: 'accentB' },
      { shape: 'sphere', position: [0, 0.86, 0], scale: [0.2, 0.2, 0.2], slot: 'accentA' },
      { shape: 'cylinder', position: [0, 0.69, 0], scale: [0.14, 0.16, 0.14], slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.9, 0], scale: [0.22, 0.14, 0.22], slot: 'primary' },
      { shape: 'sphere', position: [-0.09, 0.88, 0.18], scale: 0.04, slot: 'black' },
      { shape: 'sphere', position: [0.09, 0.88, 0.18], scale: 0.04, slot: 'black' },
      { shape: 'cone', position: [0.05, 0.75, -0.2], rotation: [-1, 0, 0.3], scale: [0.06, 0.3, 0.06], slot: 'primary', extend: 0.4 },
      ...mirror({ shape: 'capsule', position: [0.24, 0.45, 0], rotation: [0, 0, 0.2], scale: [0.09, 0.34, 0.09], slot: 'accentB', extend: -0.4 }),
      ...mirror({ shape: 'capsule', position: [0.1, 0.12, 0], scale: [0.11, 0.28, 0.11], slot: 'accentB', extend: -0.4 }),
    ],
  },
  {
    id: 'robot',
    label: 'Robô Zip',
    exclusive: false,
    accentA: '#cbd5e1',
    accentB: '#475569',
    parts: [
      { shape: 'box', position: [0, 0.42, 0], scale: [0.32, 0.36, 0.24], slot: 'accentA' },
      { shape: 'box', position: [0, 0.42, 0.13], scale: [0.16, 0.2, 0.02], slot: 'primary', emissive: true },
      { shape: 'box', position: [0, 0.64, 0], scale: [0.16, 0.1, 0.16], slot: 'accentB' },
      { shape: 'box', position: [0, 0.78, 0], scale: [0.24, 0.2, 0.22], slot: 'accentA' },
      { shape: 'box', position: [0, 0.78, 0.12], scale: [0.16, 0.04, 0.02], slot: 'primary', emissive: true },
      { shape: 'cylinder', position: [0, 0.94, 0], scale: [0.02, 0.12, 0.02], slot: 'accentB', extend: 0.5 },
      { shape: 'sphere', position: [0, 1.0, 0], scale: 0.03, slot: 'primary', emissive: true },
      ...mirror({ shape: 'capsule', position: [0.22, 0.42, 0], scale: [0.08, 0.32, 0.08], slot: 'accentB', extend: -0.4 }),
      ...mirror({ shape: 'capsule', position: [0.1, 0.12, 0], scale: [0.1, 0.26, 0.1], slot: 'accentB', extend: -0.4 }),
    ],
  },
  {
    id: 'bee',
    label: 'Abelha Zum',
    exclusive: false,
    accentA: '#facc15',
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.26, 0.24, 0.3], slot: 'accentA' },
      { shape: 'torus', position: [0, 0.54, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.22, 0.22, 0.05], slot: 'black' },
      { shape: 'torus', position: [0, 0.44, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.2, 0.2, 0.05], slot: 'black' },
      { shape: 'sphere', position: [0, 0.66, 0.03], scale: [0.13, 0.13, 0.13], slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.78, 0.06], scale: [0.16, 0.15, 0.16], slot: 'accentA' },
      ...eyes(0.8, 0.16, 0.09, 0.045),
      ...mirror({ shape: 'sphere', position: [0.2, 0.6, -0.04], rotation: [0, 0, 0.4], scale: [0.14, 0.04, 0.2], slot: 'primary' }),
      ...mirror({ shape: 'cylinder', position: [0.06, 0.94, 0.04], rotation: [0, 0, -0.3], scale: [0.015, 0.16, 0.015], slot: 'black', extend: 0.4 }),
      { shape: 'cone', position: [0, 0.46, -0.28], rotation: [-1.4, 0, 0], scale: [0.05, 0.14, 0.05], slot: 'black', extend: 0.4 },
    ],
  },
  {
    id: 'dragon-king',
    label: 'Dragão Rei',
    exclusive: true,
    accentA: '#fbbf24',
    accentB: '#312e81',
    parts: [
      { shape: 'sphere', position: [0, 0.5, 0], scale: [0.42, 0.4, 0.48], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.86, 0.3], scale: [0.24, 0.22, 0.26], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.7, 0.16], scale: [0.22, 0.22, 0.26], slot: 'primary' },
      { shape: 'box', position: [0, 0.8, 0.5], scale: [0.14, 0.1, 0.14], slot: 'primary' },
      ...eyes(0.9, 0.42, 0.1, 0.05, 'primary', true),
      ...mirror({ shape: 'cone', position: [0.12, 1.05, 0.22], rotation: [0.3, 0, -0.3], scale: [0.05, 0.2, 0.05], slot: 'accentA', extend: 0.5 }),
      ...mirror({ shape: 'box', position: [0.3, 0.62, -0.08], rotation: [0, 0, 0.5], scale: [0.05, 0.5, 0.34], slot: 'accentB', extend: 0.6 }),
      { shape: 'cone', position: [0, 1.05, 0.1], scale: [0.04, 0.12, 0.04], slot: 'accentA', extend: 0.4 },
      { shape: 'cone', position: [0, 1.06, -0.05], scale: [0.045, 0.13, 0.045], slot: 'accentA', extend: 0.4 },
      { shape: 'torus', position: [0, 1.08, 0.08], rotation: [Math.PI / 2, 0, 0], scale: [0.14, 0.14, 0.03], slot: 'accentA', emissive: true },
      { shape: 'cone', position: [0, 0.4, -0.55], rotation: [-1.2, 0, 0], scale: [0.16, 0.6, 0.16], slot: 'primary', extend: 0.4 },
      { shape: 'cone', position: [0, 0.7, -0.85], rotation: [-1.2, 0, 0], scale: [0.06, 0.14, 0.06], slot: 'accentA', extend: 0.4 },
      ...mirror({ shape: 'capsule', position: [0.2, 0.14, 0.1], scale: [0.14, 0.3, 0.14], slot: 'primary', extend: -0.5 }),
    ],
  },
  {
    id: 'phoenix',
    label: 'Fênix Solar',
    exclusive: true,
    accentA: '#fb923c',
    accentB: '#78350f',
    parts: [
      { shape: 'sphere', position: [0, 0.55, 0], scale: [0.3, 0.34, 0.3], slot: 'primary', emissive: true },
      { shape: 'sphere', position: [0, 0.95, 0.1], scale: [0.18, 0.17, 0.18], slot: 'primary', emissive: true },
      { shape: 'sphere', position: [0, 0.78, 0.05], scale: [0.16, 0.22, 0.16], slot: 'primary', emissive: true },
      { shape: 'cone', position: [0, 0.93, 0.26], rotation: [Math.PI / 2, 0, 0], scale: [0.05, 0.12, 0.05], slot: 'accentA', extend: 0.4 },
      { shape: 'sphere', position: [-0.08, 0.98, 0.2], scale: 0.04, slot: 'black' },
      { shape: 'sphere', position: [0.08, 0.98, 0.2], scale: 0.04, slot: 'black' },
      { shape: 'cone', position: [0, 1.15, 0.02], scale: [0.04, 0.22, 0.04], slot: 'accentA', emissive: true, extend: 0.4 },
      { shape: 'cone', position: [-0.06, 1.13, -0.02], rotation: [0, 0, 0.15], scale: [0.035, 0.18, 0.035], slot: 'accentA', emissive: true, extend: 0.4 },
      { shape: 'cone', position: [0.06, 1.13, -0.02], rotation: [0, 0, -0.15], scale: [0.035, 0.18, 0.035], slot: 'accentA', emissive: true, extend: 0.4 },
      ...mirror({ shape: 'cone', position: [0.24, 0.6, -0.03], rotation: [0, 0, 0.9], scale: [0.1, 0.5, 0.2], slot: 'primary', emissive: true, extend: 0.6 }),
      { shape: 'cone', position: [0, 0.55, -0.42], rotation: [-1.4, 0, 0], scale: [0.05, 0.4, 0.03], slot: 'accentA', emissive: true, extend: 0.4 },
      { shape: 'cone', position: [-0.08, 0.55, -0.4], rotation: [-1.35, 0, 0.15], scale: [0.04, 0.34, 0.03], slot: 'accentA', emissive: true, extend: 0.4 },
      { shape: 'cone', position: [0.08, 0.55, -0.4], rotation: [-1.35, 0, -0.15], scale: [0.04, 0.34, 0.03], slot: 'accentA', emissive: true, extend: 0.4 },
      ...mirror({ shape: 'capsule', position: [0.08, 0.14, 0.04], scale: [0.03, 0.24, 0.03], slot: 'accentB', extend: -0.4 }),
    ],
  },
  {
    id: 'crystal-knight',
    label: 'Cavaleiro Cristal',
    exclusive: true,
    accentA: '#e2e8f0',
    accentB: '#1e293b',
    parts: [
      { shape: 'box', position: [0, 0.5, 0], scale: [0.3, 0.38, 0.22], slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.56, 0.13], scale: 0.07, slot: 'primary', emissive: true },
      { shape: 'sphere', position: [0, 0.9, 0], scale: [0.18, 0.19, 0.18], slot: 'accentA' },
      { shape: 'cylinder', position: [0, 0.75, 0], scale: [0.13, 0.14, 0.13], slot: 'accentA' },
      { shape: 'box', position: [0, 0.9, 0.14], scale: [0.14, 0.03, 0.02], slot: 'primary', emissive: true },
      { shape: 'cone', position: [0, 1.08, 0], scale: [0.04, 0.16, 0.04], slot: 'primary', emissive: true, extend: 0.4 },
      ...mirror({ shape: 'sphere', position: [0.24, 0.68, 0], scale: [0.12, 0.1, 0.12], slot: 'accentA' }),
      ...mirror({ shape: 'capsule', position: [0.24, 0.42, 0], scale: [0.09, 0.32, 0.09], slot: 'accentA', extend: -0.4 }),
      { shape: 'box', position: [0, 0.5, -0.14], rotation: [0.15, 0, 0], scale: [0.26, 0.5, 0.03], slot: 'primary' },
      ...mirror({ shape: 'capsule', position: [0.1, 0.12, 0], scale: [0.11, 0.28, 0.11], slot: 'accentA', extend: -0.4 }),
      { shape: 'box', position: [0.32, 0.6, 0.1], rotation: [0, 0, -0.3], scale: [0.03, 0.4, 0.03], slot: 'white', emissive: true },
      { shape: 'cylinder', position: [0.32, 0.38, 0.1], rotation: [0, 0, -0.3], scale: [0.03, 0.08, 0.03], slot: 'accentB' },
    ],
  },
  {
    id: 'griffin',
    label: 'Grifo Tempestade',
    exclusive: true,
    accentA: '#f8fafc',
    accentB: '#1e293b',
    parts: [
      { shape: 'sphere', position: [0, 0.46, 0], scale: [0.38, 0.32, 0.42], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.8, 0.28], scale: [0.18, 0.17, 0.19], slot: 'accentA' },
      { shape: 'sphere', position: [0, 0.66, 0.15], scale: [0.17, 0.17, 0.2], slot: 'accentA' },
      { shape: 'cone', position: [0, 0.76, 0.44], rotation: [Math.PI / 2, 0, 0], scale: [0.06, 0.16, 0.06], slot: 'accentB', extend: 0.4 },
      ...eyes(0.84, 0.36, 0.08, 0.04),
      ...mirror({ shape: 'cone', position: [0.08, 0.94, 0.24], rotation: [0, 0, -0.2], scale: [0.03, 0.1, 0.03], slot: 'accentA', extend: 0.4 }),
      ...mirror({ shape: 'box', position: [0.28, 0.62, -0.03], rotation: [0, 0, 0.5], scale: [0.05, 0.46, 0.3], slot: 'primary', emissive: true, extend: 0.6 }),
      { shape: 'cone', position: [0, 0.4, -0.5], rotation: [-1.2, 0, 0], scale: [0.1, 0.4, 0.1], slot: 'primary', extend: 0.4 },
      ...mirror({ shape: 'capsule', position: [0.2, 0.1, 0.2], scale: [0.1, 0.22, 0.1], slot: 'accentA', extend: -0.4 }),
      ...mirror({ shape: 'capsule', position: [0.2, 0.1, -0.2], scale: [0.12, 0.24, 0.12], slot: 'primary', extend: -0.4 }),
      { shape: 'cone', position: [0.3, 0.95, 0.1], rotation: [0, 0, 0.6], scale: [0.03, 0.14, 0.03], slot: 'primary', emissive: true },
    ],
  },
  {
    id: 'rune-golem',
    label: 'Golem Rúnico',
    exclusive: true,
    accentA: '#78716c',
    parts: [
      { shape: 'box', position: [0, 0.5, 0], scale: [0.38, 0.42, 0.3], slot: 'accentA' },
      { shape: 'box', position: [0, 0.76, 0], scale: [0.18, 0.1, 0.18], slot: 'accentA' },
      { shape: 'box', position: [0, 0.92, 0], scale: [0.2, 0.2, 0.2], slot: 'accentA' },
      ...mirror({ shape: 'sphere', position: [0.06, 0.93, 0.11], scale: 0.04, slot: 'primary', emissive: true }),
      { shape: 'box', position: [0, 0.55, 0.16], scale: [0.1, 0.1, 0.02], slot: 'primary', emissive: true },
      ...mirror({ shape: 'box', position: [0.28, 0.68, 0], scale: [0.14, 0.14, 0.14], slot: 'accentA' }),
      ...mirror({ shape: 'box', position: [0.28, 0.4, 0], scale: [0.14, 0.34, 0.14], slot: 'accentA', extend: -0.4 }),
      ...mirror({ shape: 'box', position: [0.12, 0.12, 0], scale: [0.18, 0.26, 0.18], slot: 'accentA', extend: -0.4 }),
      ...mirror({ shape: 'box', position: [0.16, 0.75, 0.14], rotation: [0, 0, 0.3], scale: [0.02, 0.14, 0.02], slot: 'primary', emissive: true }),
    ],
  },
]

export const CHARACTER_MAP: Record<string, CharacterRecipe> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]))

// Bichinhos de estimação — item mais caro da loja. Bem menores que os
// personagens principais (renderizados numa escala pequena ao lado do
// personagem no tabuleiro), então cada um usa só uns poucos formatos.
export const PETS: CharacterRecipe[] = [
  {
    id: 'pet_slime',
    label: 'Gosminha',
    exclusive: false,
    parts: [
      { shape: 'sphere', position: [0, 0.2, 0], scale: [0.32, 0.24, 0.32], slot: 'primary' },
      ...eyes(0.24, 0.27, 0.09, 0.045, 'black'),
    ],
  },
  {
    id: 'pet_owl',
    label: 'Corujinha',
    exclusive: false,
    accentA: '#f59e0b',
    parts: [
      { shape: 'sphere', position: [0, 0.28, 0], scale: [0.26, 0.3, 0.26], slot: 'primary' },
      ...mirror({ shape: 'sphere', position: [0.22, 0.22, 0], scale: [0.11, 0.16, 0.08], slot: 'primary' }),
      ...mirror({ shape: 'cone', position: [0.13, 0.5, 0], rotation: [0, 0, -0.35], scale: [0.07, 0.13, 0.07], slot: 'primary' }),
      ...eyes(0.3, 0.22, 0.09, 0.06, 'white'),
      { shape: 'cone', position: [0, 0.24, 0.24], rotation: [Math.PI / 2, 0, 0], scale: [0.05, 0.08, 0.05], slot: 'accentA' },
    ],
  },
  {
    id: 'pet_ghost',
    label: 'Fantasminha',
    exclusive: false,
    parts: [
      { shape: 'sphere', position: [0, 0.26, 0], scale: [0.26, 0.32, 0.26], slot: 'white', emissive: true },
      { shape: 'sphere', position: [0, 0.02, 0], scale: [0.24, 0.1, 0.24], slot: 'white', emissive: true },
      ...eyes(0.28, 0.22, 0.08, 0.045, 'black'),
    ],
  },
  {
    id: 'pet_dragon',
    label: 'Dragãozinho',
    exclusive: false,
    accentA: '#facc15',
    parts: [
      { shape: 'sphere', position: [0, 0.22, 0], scale: [0.24, 0.2, 0.3], slot: 'primary' },
      { shape: 'sphere', position: [0, 0.24, 0.22], scale: [0.14, 0.13, 0.16], slot: 'primary' },
      ...eyes(0.28, 0.32, 0.07, 0.04, 'black'),
      ...mirror({ shape: 'cone', position: [0.08, 0.36, 0.18], rotation: [0.3, 0, -0.2], scale: [0.03, 0.09, 0.03], slot: 'accentA' }),
      ...mirror({ shape: 'cone', position: [0.22, 0.22, -0.05], rotation: [0, 0, -1.1], scale: [0.03, 0.16, 0.12], slot: 'primary' }),
      { shape: 'cone', position: [0, 0.16, -0.3], rotation: [1.3, 0, 0], scale: [0.05, 0.2, 0.05], slot: 'primary' },
    ],
  },
]

export const PET_MAP: Record<string, CharacterRecipe> = Object.fromEntries(PETS.map((p) => [p.id, p]))

export const BOARD_COLORS: string[] = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#78716c',
  '#1e293b',
  '#e2e8f0',
]
