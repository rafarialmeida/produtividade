import { Crown } from 'lucide-react'
import { formatDisplayName } from '../utils/name'

export interface PodiumEntry {
  id: string
  name: string
  avatarUrl?: string | null
  points: number
  onClick: () => void
}

const STEP_ORDER = [1, 0, 2] as const
const STEP_HEIGHT: Record<number, number> = { 0: 96, 1: 68, 2: 48 }
const STEP_STYLE: Record<number, { bg: string; border: string; text: string; medal: string }> = {
  0: { bg: 'bg-amber-500/15', border: 'border-amber-400/50', text: 'text-amber-300 light:text-amber-700', medal: 'bg-amber-400 text-amber-950' },
  1: { bg: 'bg-slate-400/15', border: 'border-slate-300/40', text: 'text-slate-200 light:text-slate-600', medal: 'bg-slate-300 text-slate-900' },
  2: { bg: 'bg-orange-700/15', border: 'border-orange-600/40', text: 'text-orange-300 light:text-orange-700', medal: 'bg-orange-600 text-orange-50' },
}

export default function PodiumTop3({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5 px-4 sm:px-6 pt-6 pb-2">
      {STEP_ORDER.map((rank) => {
        const entry = entries[rank]
        if (!entry) return <div key={rank} className="flex-1 max-w-[120px]" />
        const style = STEP_STYLE[rank]
        return (
          <div key={entry.id} className="flex flex-col items-center flex-1 max-w-[120px]">
            <button onClick={entry.onClick} className="flex flex-col items-center gap-1.5 group">
              <div className="relative">
                {entry.avatarUrl ? (
                  <img
                    src={entry.avatarUrl}
                    alt={entry.name}
                    className={`rounded-full object-cover border-2 ${style.border} ${rank === 0 ? 'w-14 h-14' : 'w-11 h-11'} transition-transform group-hover:scale-105`}
                  />
                ) : (
                  <div
                    className={`rounded-full bg-gradient-to-br from-purple-600/40 to-emerald-500/40 border-2 ${style.border} flex items-center justify-center font-semibold text-white transition-transform group-hover:scale-105 ${
                      rank === 0 ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm'
                    }`}
                  >
                    {entry.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {rank === 0 && (
                  <Crown size={16} className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-amber-400 fill-amber-400" />
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${style.medal}`}
                >
                  {rank + 1}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white light:text-zinc-900 text-center truncate max-w-[100px]">
                {formatDisplayName(entry.name)}
              </p>
              <p className={`text-xs font-bold tabular-nums ${style.text}`}>+{entry.points}</p>
            </button>
            <div
              className={`w-full mt-2 rounded-t-lg border-t border-x ${style.bg} ${style.border}`}
              style={{ height: STEP_HEIGHT[rank] }}
            />
          </div>
        )
      })}
    </div>
  )
}
