import { useMemo, useState } from 'react'
import { CheckCircle2, ListChecks, Plus, Target, Trash2, X } from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { Severity } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { toDatetimeLocalValue } from '../utils/date'

export default function TaskForm({
  communityId,
  userId,
  onClose,
}: {
  communityId: string
  userId: string
  onClose: () => void
}) {
  const createTask = useAppStore((s) => s.createTask)
  const community = useAppStore((s) => s.getCommunityById(communityId))
  const allTasks = useAppStore((s) => s.tasks)
  const communityTasks = useMemo(() => allTasks.filter((t) => t.communityId === communityId), [allTasks, communityId])

  const macroSuggestions = Array.from(new Set(communityTasks.map((t) => t.macroObjective))).filter(Boolean)

  const [macroObjective, setMacroObjective] = useState('')
  const [title, setTitle] = useState('')
  const [subtasks, setSubtasks] = useState<string[]>([''])
  const [deadline, setDeadline] = useState('')
  const [urgency, setUrgency] = useState<Severity>('media')

  const minDeadline = toDatetimeLocalValue(new Date(Date.now() + 5 * 60000))
  const cleanSubtasks = subtasks.map((s) => s.trim()).filter(Boolean)

  const isValid =
    macroObjective.trim().length >= 3 &&
    title.trim().length >= 3 &&
    cleanSubtasks.length >= 1 &&
    deadline.length > 0 &&
    new Date(deadline).getTime() > Date.now()

  function updateSubtask(index: number, value: string) {
    setSubtasks((s) => s.map((item, i) => (i === index ? value : item)))
  }

  function addSubtaskField() {
    setSubtasks((s) => [...s, ''])
  }

  function removeSubtaskField(index: number) {
    setSubtasks((s) => (s.length === 1 ? s : s.filter((_, i) => i !== index)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    createTask({
      communityId,
      userId,
      macroObjective: macroObjective.trim(),
      title: title.trim(),
      subtasks: cleanSubtasks,
      deadline: new Date(deadline).toISOString(),
      urgency,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">Nova Tarefa</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {community?.name} · nenhuma tarefa solta é permitida
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
              <Target size={13} className="text-purple-400" /> Objetivo Macro — o "porquê"
            </label>
            <input
              value={macroObjective}
              onChange={(e) => setMacroObjective(e.target.value)}
              placeholder="Ex.: Lançamento Q3 do produto"
              list="macro-suggestions"
              className="input"
            />
            <datalist id="macro-suggestions">
              {macroSuggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">A Tarefa — o "o quê"</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Finalizar landing page de vendas"
              className="input"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
              <ListChecks size={13} className="text-emerald-400" /> Plano de Execução — o "como" (checklist obrigatório)
            </label>
            <div className="flex flex-col gap-2">
              {subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 w-4">{i + 1}.</span>
                  <input
                    value={s}
                    onChange={(e) => updateSubtask(i, e.target.value)}
                    placeholder="Subtarefa"
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtaskField(i)}
                    disabled={subtasks.length === 1}
                    className="p-2 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSubtaskField}
              className="mt-2 flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
            >
              <Plus size={13} /> Adicionar subtarefa
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Prazo — data e hora limite</label>
            <input
              type="datetime-local"
              value={deadline}
              min={minDeadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-2 block">Nível de Urgência</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(URGENCY_CONFIG) as Severity[]).map((key) => {
                const cfg = URGENCY_CONFIG[key]
                const active = urgency === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setUrgency(key)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      active ? `${cfg.bg} ${cfg.border}` : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? cfg.color : 'text-zinc-300'}`}>{cfg.label}</p>
                    <p className="text-[11px] text-zinc-500">perde {cfg.points} pt{cfg.points > 1 ? 's' : ''} se expirar</p>
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" disabled={!isValid} className="btn-secondary mt-1">
            <CheckCircle2 size={16} /> Salvar Tarefa
          </button>
          {!isValid && (
            <p className="text-[11px] text-center text-zinc-600 -mt-3">
              Preencha objetivo, título, ao menos uma subtarefa e um prazo futuro para liberar o salvamento.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
