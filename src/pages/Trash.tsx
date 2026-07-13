import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trash2, Users, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { formatRelative } from '../utils/date'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'

export default function Trash() {
  const trashedTasks = useAppStore((s) => s.trashedTasks)
  const trashedCommunities = useAppStore((s) => s.trashedCommunities)
  const fetchTrash = useAppStore((s) => s.fetchTrash)
  const restoreTask = useAppStore((s) => s.restoreTask)
  const permanentlyDeleteTask = useAppStore((s) => s.permanentlyDeleteTask)
  const restoreCommunity = useAppStore((s) => s.restoreCommunity)
  const permanentlyDeleteCommunity = useAppStore((s) => s.permanentlyDeleteCommunity)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetchTrash().finally(() => setLoading(false))
  }, [fetchTrash])

  async function handleRestoreTask(id: string) {
    setBusyId(id)
    try {
      await restoreTask(id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteTaskForever(id: string, title: string) {
    if (!window.confirm(`Excluir definitivamente a tarefa "${title}"? Essa ação não pode ser desfeita.`)) return
    setBusyId(id)
    try {
      await permanentlyDeleteTask(id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRestoreCommunity(id: string) {
    setBusyId(id)
    try {
      await restoreCommunity(id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteCommunityForever(id: string, name: string) {
    if (
      !window.confirm(
        `Excluir definitivamente a comunidade "${name}"? Todas as tarefas dela também serão perdidas para sempre. Essa ação não pode ser desfeita.`,
      )
    )
      return
    setBusyId(id)
    try {
      await permanentlyDeleteCommunity(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/day" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700 mb-3">
          <ArrowLeft size={13} /> Voltar
        </Link>
        <div className="flex items-center gap-2.5">
          <Trash2 size={20} className="text-zinc-400" />
          <h1 className="text-xl font-bold text-white light:text-zinc-900">Lixeira</h1>
        </div>
        <p className="text-zinc-500 text-sm mt-1">
          Itens excluídos ficam aqui por 30 dias antes de serem apagados de vez — dá pra restaurar quando quiser.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700 mb-3">
              Tarefas excluídas ({trashedTasks.length})
            </h2>
            {trashedTasks.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma tarefa na lixeira.</p>
            ) : (
              <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
                {trashedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-zinc-500">Excluída {t.deletedAt ? formatRelative(t.deletedAt) : ''}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreTask(t.id)}
                      disabled={busyId === t.id}
                      title="Restaurar"
                      className="p-2 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteTaskForever(t.id, t.title)}
                      disabled={busyId === t.id}
                      title="Excluir definitivamente"
                      className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700 mb-3">
              Comunidades excluídas ({trashedCommunities.length})
            </h2>
            {trashedCommunities.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma comunidade na lixeira.</p>
            ) : (
              <div className="glass-panel rounded-xl divide-y divide-white/5 overflow-hidden">
                {trashedCommunities.map((c) => {
                  const typeCfg = COMMUNITY_TYPE_CONFIG[c.type]
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className={`w-8 h-8 shrink-0 rounded-lg ${typeCfg.bg} border ${typeCfg.border} flex items-center justify-center`}>
                        <typeCfg.icon size={14} className={typeCfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 light:text-zinc-800 truncate">{c.name}</p>
                        <p className="text-[11px] text-zinc-500 flex items-center gap-2">
                          <span>Excluída {c.deletedAt ? formatRelative(c.deletedAt) : ''}</span>
                          <span className="flex items-center gap-1">
                            <Users size={10} /> {c.memberIds.length} membro{c.memberIds.length !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreCommunity(c.id)}
                        disabled={busyId === c.id}
                        title="Restaurar"
                        className="p-2 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteCommunityForever(c.id, c.name)}
                        disabled={busyId === c.id}
                        title="Excluir definitivamente"
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
