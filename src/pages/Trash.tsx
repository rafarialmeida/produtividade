import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarClock, ChevronDown, CheckCircle2, Circle, ListChecks, RotateCcw, StickyNote, Tag, Target, Trash2, Users, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import { formatDeadline, formatRelative } from '../utils/date'
import { COMMUNITY_TYPE_CONFIG } from '../utils/communityType'
import { COMPLEXITY_LABEL } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'

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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

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
                {trashedTasks.map((t) => {
                  const expanded = expandedTaskId === t.id
                  const urgencyCfg = URGENCY_CONFIG[t.urgency]
                  return (
                    <div key={t.id}>
                      <div className="flex items-center gap-3 px-4 py-3 text-sm">
                        <button
                          onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <ChevronDown size={14} className={`shrink-0 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          <span className="min-w-0">
                            <p className="text-zinc-200 light:text-zinc-800 truncate">{t.title}</p>
                            <p className="text-[11px] text-zinc-500">Excluída {t.deletedAt ? formatRelative(t.deletedAt) : ''}</p>
                          </span>
                        </button>
                        <button
                          onClick={() => handleRestoreTask(t.id)}
                          disabled={busyId === t.id}
                          title="Restaurar"
                          className="p-2 rounded-lg text-zinc-500 hover:text-emerald-300 light:hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteTaskForever(t.id, t.title)}
                          disabled={busyId === t.id}
                          title="Excluir definitivamente"
                          className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {expanded && (
                        <div className="px-4 pb-4 pl-9 flex flex-col gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-zinc-400 light:text-zinc-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 light:bg-black/[0.03] light:border-black/10">
                              <Tag size={9} /> {t.category}
                            </span>
                            <span className={`inline-flex items-center gap-1 font-medium rounded px-1.5 py-0.5 border ${urgencyCfg.bg} ${urgencyCfg.border} ${urgencyCfg.color}`}>
                              {urgencyCfg.label}
                            </span>
                            <span className="inline-flex items-center gap-1 text-zinc-400 light:text-zinc-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 light:bg-black/[0.03] light:border-black/10">
                              Complexidade {COMPLEXITY_LABEL[t.complexity]}
                            </span>
                          </div>
                          {t.macroObjective && (
                            <p className="flex items-center gap-1.5 text-purple-300/80 light:text-purple-600/80">
                              <Target size={11} /> {t.macroObjective}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-zinc-400 light:text-zinc-600">
                            <CalendarClock size={11} /> Prazo: {formatDeadline(t.deadline)}
                          </p>
                          {t.subtasks.length > 0 && (
                            <div>
                              <p className="flex items-center gap-1.5 text-zinc-400 light:text-zinc-600 mb-1.5">
                                <ListChecks size={11} /> Plano de Execução
                              </p>
                              <div className="flex flex-col gap-1.5 pl-1">
                                {t.subtasks.map((s) => (
                                  <div key={s.id} className="flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 text-zinc-300 light:text-zinc-700">
                                      {s.done ? (
                                        <CheckCircle2 size={12} className="text-emerald-400 light:text-emerald-600 shrink-0" />
                                      ) : (
                                        <Circle size={12} className="text-zinc-600 shrink-0" />
                                      )}
                                      <span className={s.done ? 'line-through text-zinc-500' : ''}>{s.text}</span>
                                      {s.dueDate && (
                                        <span className="text-zinc-500">— {formatDeadline(s.dueDate)}</span>
                                      )}
                                    </span>
                                    {s.note && (
                                      <span className="flex items-start gap-1.5 text-zinc-500 pl-[18px]">
                                        <StickyNote size={11} className="shrink-0 mt-0.5" /> {s.note}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
                        className="p-2 rounded-lg text-zinc-500 hover:text-emerald-300 light:hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteCommunityForever(c.id, c.name)}
                        disabled={busyId === c.id}
                        title="Excluir definitivamente"
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
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
