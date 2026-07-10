import { useMemo, useState } from 'react'
import { Dices, Flag } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { BOARD_COLORS, BOARD_PIECES, BOARD_PIECE_MAP, type BoardPiece } from '../utils/boardPieces'
import PiecePickerModal from './PiecePickerModal'

const COLS = 8

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function defaultPieceFor(userId: string): BoardPiece {
  const regular = BOARD_PIECES.filter((p) => !p.exclusive)
  return regular[hashString(userId) % regular.length]
}

function defaultColorFor(userId: string): string {
  return BOARD_COLORS[hashString(`${userId}-c`) % BOARD_COLORS.length]
}

function buildBoardOrder(size: number, cols: number): number[] {
  const rows = Math.ceil(size / cols)
  const order: number[] = []
  for (let r = 0; r < rows; r++) {
    const rowNums: number[] = []
    for (let c = 0; c < cols; c++) {
      const n = r * cols + c + 1
      if (n <= size) rowNums.push(n)
    }
    if (r % 2 === 1) rowNums.reverse()
    order.push(...rowNums)
  }
  return order
}

export default function CommunityBoard({ communityId }: { communityId: string }) {
  const authUser = useAppStore((s) => s.authUser)
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const allTasks = useAppStore((s) => s.tasks)
  const [showPicker, setShowPicker] = useState(false)

  const members = useMemo(() => {
    if (!community) return []
    return community.memberIds.map((id) => {
      const user = users.find((u) => u.id === id)
      const completed = allTasks.filter((t) => t.communityId === communityId && t.userId === id && t.completed).length
      const saved = community.pieces[id]
      const piece = saved ? (BOARD_PIECE_MAP[saved.pieceId] ?? defaultPieceFor(id)) : defaultPieceFor(id)
      const color = saved?.color ?? defaultColorFor(id)
      return { id, name: user?.name ?? 'Membro', completed, piece, color, square: completed + 1 }
    })
  }, [community, users, allTasks, communityId])

  if (!community) return null

  const maxCompleted = members.reduce((max, m) => Math.max(max, m.completed), 0)
  const boardSize = Math.max(24, Math.ceil((maxCompleted + 5) / COLS) * COLS)
  const order = buildBoardOrder(boardSize, COLS)

  const membersBySquare = new Map<number, typeof members>()
  for (const m of members) {
    const list = membersBySquare.get(m.square) ?? []
    list.push(m)
    membersBySquare.set(m.square, list)
  }

  const myPiece = authUser ? members.find((m) => m.id === authUser.id) : undefined
  const isCommunityAdmin = Boolean(authUser && (authUser.role === 'admin' || community.adminIds.includes(authUser.id)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Dices size={16} className="text-emerald-300" />
          <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">Tabuleiro da Equipe</h2>
        </div>
        {myPiece && (
          <button onClick={() => setShowPicker(true)} className="btn-ghost !w-auto px-3 flex items-center gap-2">
            <myPiece.piece.icon size={15} style={{ color: myPiece.color }} />
            Escolher minha peça
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 -mt-1">A cada tarefa concluída na comunidade, sua peça avança um degrau no tabuleiro.</p>

      <div className="glass-panel rounded-xl p-3 overflow-auto max-h-[420px]">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(38px, 1fr))` }}>
          {order.map((n) => {
            const here = membersBySquare.get(n) ?? []
            const isStart = n === 1
            return (
              <div
                key={n}
                title={here.map((m) => `${m.name} (${m.completed})`).join(', ')}
                className={`relative aspect-square rounded-lg border flex flex-wrap items-center justify-center gap-0.5 p-0.5 ${
                  isStart
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/[0.03] light:border-black/10 light:bg-black/[0.02]'
                }`}
              >
                {isStart ? (
                  <Flag size={12} className="text-emerald-400" />
                ) : (
                  <span className="absolute top-0.5 left-1 text-[8px] text-zinc-600 leading-none">{n}</span>
                )}
                {here.slice(0, 4).map((m) => (
                  <m.piece.icon key={m.id} size={14} style={{ color: m.color }} />
                ))}
                {here.length > 4 && <span className="text-[8px] text-zinc-400">+{here.length - 4}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
        {[...members]
          .sort((a, b) => b.completed - a.completed)
          .map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <m.piece.icon size={16} style={{ color: m.color }} />
              <span className="text-zinc-200 light:text-zinc-800 flex-1 truncate">{m.name}</span>
              <span className="text-zinc-500 tabular-nums">{m.completed} tarefa{m.completed !== 1 ? 's' : ''}</span>
            </div>
          ))}
      </div>

      {showPicker && myPiece && (
        <PiecePickerModal
          communityId={communityId}
          isCommunityAdmin={isCommunityAdmin}
          currentPieceId={community.pieces[myPiece.id]?.pieceId}
          currentColor={community.pieces[myPiece.id]?.color}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
