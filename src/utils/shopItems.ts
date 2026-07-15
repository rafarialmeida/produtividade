export type ShopCategory = 'frame' | 'aura' | 'palette'

export interface ShopItem {
  id: string
  category: ShopCategory
  label: string
  price: number
  /** Cor(es) usadas pra renderizar o item — moldura/aura usam 1 cor (ou 2 pro efeito arco-íris), paleta é a cor do personagem. */
  colors: [string, string?]
}

export const SHOP_ITEMS: ShopItem[] = [
  // Molduras de nome — aplicadas na etiqueta acima do personagem no tabuleiro.
  { id: 'frame_silver', category: 'frame', label: 'Moldura Prata', price: 50, colors: ['#cbd5e1'] },
  { id: 'frame_emerald', category: 'frame', label: 'Moldura Esmeralda', price: 120, colors: ['#34d399'] },
  { id: 'frame_neon_purple', category: 'frame', label: 'Moldura Roxa Neon', price: 220, colors: ['#c084fc'] },
  { id: 'frame_gold', category: 'frame', label: 'Moldura Dourada Lendária', price: 400, colors: ['#fbbf24', '#fde68a'] },

  // Auras — anel de luz no chão, embaixo do personagem.
  { id: 'aura_blue', category: 'aura', label: 'Aura Azul', price: 60, colors: ['#3b82f6'] },
  { id: 'aura_green', category: 'aura', label: 'Aura Verde', price: 140, colors: ['#22c55e'] },
  { id: 'aura_flames', category: 'aura', label: 'Aura Chamas', price: 250, colors: ['#f97316'] },
  { id: 'aura_rainbow', category: 'aura', label: 'Aura Arco-íris', price: 450, colors: ['#f472b6', '#60a5fa'] },

  // Paletas de cor exclusivas — fora da roda de cores padrão do personagem.
  { id: 'palette_silver', category: 'palette', label: 'Prata Metálico', price: 70, colors: ['#94a3b8'] },
  { id: 'palette_toxic_green', category: 'palette', label: 'Verde Tóxico', price: 150, colors: ['#a3e635'] },
  { id: 'palette_blood_red', category: 'palette', label: 'Vermelho Sangue', price: 260, colors: ['#7f1d1d'] },
  { id: 'palette_royal_gold', category: 'palette', label: 'Dourado Real', price: 420, colors: ['#eab308'] },
]

export const SHOP_ITEM_MAP: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]))

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  frame: 'Molduras de nome',
  aura: 'Auras',
  palette: 'Paletas exclusivas',
}
