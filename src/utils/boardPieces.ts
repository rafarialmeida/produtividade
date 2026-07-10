import {
  Anchor,
  Bird,
  Bug,
  Cat,
  Compass,
  Crown,
  Dice5,
  Dog,
  Feather,
  Fish,
  Flame,
  Flower2,
  Gem,
  Ghost,
  Panda,
  Puzzle,
  Rabbit,
  Rocket,
  ShieldHalf,
  Snail,
  Squirrel,
  Swords,
  TreePine,
  Turtle,
  Umbrella,
  type LucideIcon,
} from 'lucide-react'

export interface BoardPiece {
  id: string
  label: string
  icon: LucideIcon
  exclusive: boolean
}

export const BOARD_PIECES: BoardPiece[] = [
  { id: 'cat', label: 'Gato', icon: Cat, exclusive: false },
  { id: 'dog', label: 'Cachorro', icon: Dog, exclusive: false },
  { id: 'bird', label: 'Pássaro', icon: Bird, exclusive: false },
  { id: 'fish', label: 'Peixe', icon: Fish, exclusive: false },
  { id: 'rabbit', label: 'Coelho', icon: Rabbit, exclusive: false },
  { id: 'turtle', label: 'Tartaruga', icon: Turtle, exclusive: false },
  { id: 'bug', label: 'Inseto', icon: Bug, exclusive: false },
  { id: 'squirrel', label: 'Esquilo', icon: Squirrel, exclusive: false },
  { id: 'snail', label: 'Caracol', icon: Snail, exclusive: false },
  { id: 'ghost', label: 'Fantasma', icon: Ghost, exclusive: false },
  { id: 'rocket', label: 'Foguete', icon: Rocket, exclusive: false },
  { id: 'anchor', label: 'Âncora', icon: Anchor, exclusive: false },
  { id: 'compass', label: 'Bússola', icon: Compass, exclusive: false },
  { id: 'dice-5', label: 'Dado', icon: Dice5, exclusive: false },
  { id: 'puzzle', label: 'Quebra-cabeça', icon: Puzzle, exclusive: false },
  { id: 'feather', label: 'Pena', icon: Feather, exclusive: false },
  { id: 'umbrella', label: 'Guarda-chuva', icon: Umbrella, exclusive: false },
  { id: 'panda', label: 'Panda', icon: Panda, exclusive: false },
  { id: 'flower-2', label: 'Flor', icon: Flower2, exclusive: false },
  { id: 'tree-pine', label: 'Pinheiro', icon: TreePine, exclusive: false },
  { id: 'crown', label: 'Coroa', icon: Crown, exclusive: true },
  { id: 'swords', label: 'Espadas', icon: Swords, exclusive: true },
  { id: 'shield-half', label: 'Escudo Lendário', icon: ShieldHalf, exclusive: true },
  { id: 'flame', label: 'Chama Eterna', icon: Flame, exclusive: true },
  { id: 'gem', label: 'Gema Rara', icon: Gem, exclusive: true },
]

export const BOARD_PIECE_MAP: Record<string, BoardPiece> = Object.fromEntries(
  BOARD_PIECES.map((p) => [p.id, p]),
)

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
