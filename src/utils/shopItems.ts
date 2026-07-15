export type ShopCategory = 'frame' | 'aura' | 'palette' | 'pet'

export interface ShopItem {
  id: string
  category: ShopCategory
  label: string
  price: number
  /** Cor(es) usadas pra renderizar o item — moldura/aura usam 1 cor (ou 2 pro efeito arco-íris),
   * paleta é a cor do personagem, pet é a cor principal do bichinho (recipe em boardPieces.ts,
   * mesmo id do item). */
  colors: [string, string?]
}

export const SHOP_ITEMS: ShopItem[] = [
  // Molduras de nome — aplicadas na etiqueta acima do personagem no tabuleiro.
  { id: 'frame_silver', category: 'frame', label: 'Moldura Prata', price: 50, colors: ['#cbd5e1'] },
  { id: 'frame_emerald', category: 'frame', label: 'Moldura Esmeralda', price: 120, colors: ['#34d399'] },
  { id: 'frame_neon_purple', category: 'frame', label: 'Moldura Roxa Neon', price: 220, colors: ['#c084fc'] },
  { id: 'frame_gold', category: 'frame', label: 'Moldura Dourada Lendária', price: 400, colors: ['#fbbf24', '#fde68a'] },

  // Círculos de luz — anel de luz no chão, embaixo do personagem.
  { id: 'aura_blue', category: 'aura', label: 'Círculo de Luz Azul', price: 60, colors: ['#3b82f6'] },
  { id: 'aura_green', category: 'aura', label: 'Círculo de Luz Verde', price: 140, colors: ['#22c55e'] },
  { id: 'aura_flames', category: 'aura', label: 'Círculo de Luz Chamas', price: 250, colors: ['#f97316'] },
  { id: 'aura_rainbow', category: 'aura', label: 'Círculo de Luz Arco-íris', price: 450, colors: ['#f472b6', '#60a5fa'] },

  // Paletas de cor exclusivas — fora da roda de cores padrão do personagem.
  { id: 'palette_silver', category: 'palette', label: 'Prata Metálico', price: 70, colors: ['#94a3b8'] },
  { id: 'palette_toxic_green', category: 'palette', label: 'Verde Tóxico', price: 150, colors: ['#a3e635'] },
  { id: 'palette_blood_red', category: 'palette', label: 'Vermelho Sangue', price: 260, colors: ['#7f1d1d'] },
  { id: 'palette_royal_gold', category: 'palette', label: 'Dourado Real', price: 420, colors: ['#eab308'] },

  // Bichinhos de estimação — os itens mais caros da loja. Recipe 3D com o
  // mesmo id em utils/boardPieces.ts (PET_MAP).
  { id: 'pet_slime', category: 'pet', label: 'Gosminha', price: 600, colors: ['#34d399'] },
  { id: 'pet_owl', category: 'pet', label: 'Corujinha', price: 800, colors: ['#92400e'] },
  { id: 'pet_ghost', category: 'pet', label: 'Fantasminha', price: 1000, colors: ['#c7d2fe'] },
  { id: 'pet_dragon', category: 'pet', label: 'Dragãozinho', price: 1400, colors: ['#dc2626'] },
]

export const SHOP_ITEM_MAP: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]))

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  frame: 'Molduras de nome',
  aura: 'Círculos de Luz',
  palette: 'Paletas exclusivas',
  pet: 'Bichinhos de estimação',
}
