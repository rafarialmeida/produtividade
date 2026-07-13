import { useMemo, useState } from 'react'
import { Dices } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { COMPLEXITY_MULTIPLIER } from '../types'
import { BOARD_COLORS, CHARACTERS, CHARACTER_MAP, type CharacterRecipe } from '../utils/boardPieces'
import { computeCompositeRanking } from '../utils/ranking'
import CommunityBoard3D from './CommunityBoard3D'
import OnlineDot from './OnlineDot'
import PiecePickerModal from './PiecePickerModal'
import RankBadge from './RankBadge'

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function defaultPieceFor(userId: string): CharacterRecipe {
  const regular = CHARACTERS.filter((c) => !c.exclusive)
  return regular[hashString(userId) % regular.length]
}

function defaultColorFor(userId: string): string {
  return BOARD_COLORS[hashString(`${userId}-c`) % BOARD_COLORS.length]
}

function avg(values: number[]): number | undefined {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined
}

export default function CommunityBoard({ communityId }: { communityId: string }) {
  const authUser = useAppStore((s) => s.authUser)
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const users = useAppStore((s) => s.users)
  const allTasks = useAppStore((s) => s.tasks)
  const onlineUserIds = useAppStore((s) => s.onlineUserIds)
  const [showPicker, setShowPicker] = useState(false)

  const members = useMemo(() => {
    if (!community) return []
    const communityTasks = allTasks.filter((t) => t.communityId === communityId)

    // Ranking pondera complexidade (tarefa + subtarefas, creditadas a quem
    // executou) junto com lead time e cycle time — mesma lógica de crédito
    // usada no Dashboard da Equipe, agora alimentando o ranking do tabuleiro.
    const weightedTasksByUser = new Map<string, number>()
    const weightedSubtasksByUser = new Map<string, number>()
    const leadHoursByUser = new Map<string, number[]>()
    const cycleHoursByUser = new Map<string, number[]>()
    for (const t of communityTasks) {
      if (!t.completed) continue
      const mult = COMPLEXITY_MULTIPLIER[t.complexity]
      weightedTasksByUser.set(t.userId, (weightedTasksByUser.get(t.userId) ?? 0) + mult)
      for (const s of t.subtasks) {
        const creditedTo = s.assigneeId ?? t.userId
        weightedSubtasksByUser.set(creditedTo, (weightedSubtasksByUser.get(creditedTo) ?? 0) + mult)
      }
      if (t.completedAt) {
        const leadHours = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
        leadHoursByUser.set(t.userId, [...(leadHoursByUser.get(t.userId) ?? []), leadHours])
        if (t.startedAt) {
          const cycleHours = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 3600000
          cycleHoursByUser.set(t.userId, [...(cycleHoursByUser.get(t.userId) ?? []), cycleHours])
        }
      }
    }

    const raw = community.memberIds.map((id) => {
      const user = users.find((u) => u.id === id)
      const completed = communityTasks.filter((t) => t.userId === id && t.completed).length
      const saved = community.pieces[id]
      const recipe = saved ? (CHARACTER_MAP[saved.pieceId] ?? defaultPieceFor(id)) : defaultPieceFor(id)
      const color = saved?.color ?? defaultColorFor(id)
      return {
        id,
        name: user?.name ?? 'Membro',
        completed,
        recipe,
        color,
        tasksCompleted: weightedTasksByUser.get(id) ?? 0,
        subtasksCompleted: weightedSubtasksByUser.get(id) ?? 0,
        leadTimeHours: avg(leadHoursByUser.get(id) ?? []),
        cycleTimeHours: avg(cycleHoursByUser.get(id) ?? []),
      }
    })

    const rankById = new Map(computeCompositeRanking(raw).map((r) => [r.item.id, r.compositeRank]))
    return raw.map((m) => ({ ...m, compositeRank: rankById.get(m.id) ?? null }))
  }, [community, users, allTasks, communityId])

  if (!community) return null

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
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: myPiece.color }} />
            Escolher meu personagem ({myPiece.recipe.label})
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 -mt-1">
        A cada tarefa concluída na comunidade, seu personagem sobe um degrau na escadaria. Arraste pra girar a câmera e
        veja quem está na frente.
      </p>

      <CommunityBoard3D
        members={members.map((m) => ({ id: m.id, name: m.name, completed: m.completed, pieceId: m.recipe.id, color: m.color }))}
      />

      <p className="text-[11px] text-zinc-500">
        Ranking pondera tarefas, subtarefas e complexidade concluídas, além de lead time e cycle time médios.
      </p>

      <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
        {[...members]
          .sort((a, b) => {
            if (a.compositeRank == null && b.compositeRank == null) return b.completed - a.completed
            if (a.compositeRank == null) return 1
            if (b.compositeRank == null) return -1
            return a.compositeRank - b.compositeRank
          })
          .map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <RankBadge rank={m.compositeRank} size="sm" />
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <OnlineDot online={onlineUserIds.has(m.id)} />
              <span className="text-zinc-200 light:text-zinc-800 flex-1 truncate">{m.name}</span>
              <span className="text-zinc-500 shrink-0">{m.recipe.label}</span>
              <span className="text-zinc-500 tabular-nums shrink-0">{m.completed} tarefa{m.completed !== 1 ? 's' : ''}</span>
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
