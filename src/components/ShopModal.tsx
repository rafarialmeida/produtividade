import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Coins, Loader2, Lock, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { SHOP_ITEMS, SHOP_CATEGORY_LABEL, type ShopCategory } from '../utils/shopItems'

const CATEGORIES: ShopCategory[] = ['frame', 'aura', 'palette', 'pet']

function equippedFieldFor(category: ShopCategory) {
  if (category === 'frame') return 'equippedNameFrame' as const
  if (category === 'aura') return 'equippedGroundAura' as const
  if (category === 'pet') return 'equippedPet' as const
  return 'equippedPalette' as const
}

export default function ShopModal({ onClose }: { onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser)!
  const buyShopItem = useAppStore((s) => s.buyShopItem)
  const equipItem = useAppStore((s) => s.equipItem)
  const [category, setCategory] = useState<ShopCategory>('frame')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const equippedId = authUser[equippedFieldFor(category)]
  const items = SHOP_ITEMS.filter((i) => i.category === category)

  async function handleBuy(itemId: string) {
    setError('')
    setBusyId(itemId)
    try {
      const err = await buyShopItem(itemId)
      if (err) setError(err === 'NOT_ENOUGH_COINS' ? 'Moedas insuficientes.' : err)
    } finally {
      setBusyId(null)
    }
  }

  async function handleEquip(itemId: string, isEquipped: boolean) {
    setError('')
    setBusyId(itemId)
    try {
      const err = await equipItem(category, isEquipped ? null : itemId)
      if (err) setError(err)
    } finally {
      setBusyId(null)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white light:text-zinc-900">Loja do personagem</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-1.5 text-sm font-semibold text-amber-300 light:text-amber-600">
          <Coins size={16} /> {authUser.coins} moedas
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-sm px-3 py-2 -mb-px border-b-2 whitespace-nowrap transition-colors ${
                  category === c
                    ? 'border-purple-400 text-white light:text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700'
                }`}
              >
                {SHOP_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {items.map((item) => {
            const owned = authUser.ownedItems.includes(item.id)
            const isEquipped = equippedId === item.id
            const affordable = authUser.coins >= item.price
            const busy = busyId === item.id

            return (
              <div key={item.id} className="rounded-xl border border-white/10 light:border-black/10 bg-white/[0.02] p-3 flex flex-col gap-2">
                <div
                  className="h-12 rounded-lg"
                  style={{
                    background:
                      item.colors.length > 1
                        ? `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`
                        : item.colors[0],
                  }}
                />
                <p className="text-xs font-semibold text-white light:text-zinc-900 truncate">{item.label}</p>

                {!owned ? (
                  <>
                    <p className="text-[11px] text-amber-300/90 light:text-amber-600 flex items-center gap-1">
                      <Coins size={11} /> {item.price}
                    </p>
                    <button
                      onClick={() => handleBuy(item.id)}
                      disabled={busy || !affordable}
                      className="btn-secondary !py-1.5 !text-xs disabled:opacity-40"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : !affordable ? <Lock size={12} /> : null}
                      {affordable ? 'Comprar' : 'Bloqueado'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEquip(item.id, isEquipped)}
                    disabled={busy}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      isEquipped
                        ? 'bg-emerald-500/15 text-emerald-300 light:text-emerald-700 border border-emerald-500/30'
                        : 'bg-white/5 text-zinc-300 light:text-zinc-700 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : isEquipped ? <Check size={12} /> : null}
                    {isEquipped ? 'Equipado' : 'Equipar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="px-6 pb-4 text-xs text-rose-400 light:text-rose-600">{error}</p>}
      </div>
    </div>,
    document.body,
  )
}
