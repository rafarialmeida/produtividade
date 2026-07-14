import { Medal } from 'lucide-react'

const MEDAL_STYLE: Record<number, string> = {
  1: 'bg-amber-400/20 text-amber-300 light:text-amber-600 border-amber-400/50',
  2: 'bg-slate-400/20 text-slate-200 border-slate-400/50 light:bg-black/[0.04] light:text-slate-600 light:border-black/15',
  3: 'bg-orange-700/20 text-orange-300 border-orange-700/50',
}

export default function RankBadge({ rank, size = 'md' }: { rank: number | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const iconSize = size === 'sm' ? 12 : 15
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-sm'

  if (rank != null && rank <= 3) {
    return (
      <span
        className={`${dim} shrink-0 rounded-full border flex items-center justify-center ${MEDAL_STYLE[rank]}`}
        title={`${rank}º lugar no ranking`}
      >
        <Medal size={iconSize} />
      </span>
    )
  }
  return (
    <span
      className={`${dim} shrink-0 rounded-full border border-white/10 bg-white/5 text-zinc-500 light:bg-black/[0.03] light:border-black/10 flex items-center justify-center font-semibold tabular-nums ${textSize}`}
      title="Posição no ranking"
    >
      {rank ?? '—'}
    </span>
  )
}
