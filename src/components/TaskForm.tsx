import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Repeat,
  StickyNote,
  Tag,
  Target,
  Trash2,
  UserCog,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/useStore'
import type { BoardStatus, Complexity, Recurrence, Severity, Task } from '../types'
import { COMPLEXITY_LABEL, COMPLEXITY_MULTIPLIER } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'
import { CATEGORY_PRESETS } from '../utils/category'
import { toDatetimeLocalValue } from '../utils/date'
import { useTheme } from '../hooks/useTheme'
import NoteViewerModal from './NoteViewerModal'

const RECURRENCE_KEYS: Recurrence[] = ['daily', 'every_other_day', 'weekly', 'biweekly', 'monthly']

const WEEKDAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function weekdayPhrase(date: Date): string {
  const day = date.getDay()
  const article = day === 0 || day === 6 ? 'todo' : 'toda'
  return `${article} ${WEEKDAY_NAMES[day]}`
}

function recurrenceLabel(key: Recurrence, deadlineValue: string): string {
  const date = deadlineValue ? new Date(deadlineValue) : null
  switch (key) {
    case 'daily':
      return 'Diariamente'
    case 'every_other_day':
      return 'Dia sim, dia não'
    case 'weekly':
      return date ? `Semanalmente (${weekdayPhrase(date)})` : 'Semanalmente'
    case 'biweekly':
      return date ? `A cada 2 semanas (${weekdayPhrase(date)})` : 'A cada 2 semanas'
    case 'monthly':
      return date ? `Mensalmente (todo dia ${date.getDate()})` : 'Mensalmente'
  }
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: new Date(year, month, i - startWeekday + 1), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }
  return cells
}

function MacroEditForm({
  title,
  description,
  showDesc,
  saving,
  placeholder,
  onTitleChange,
  onDescriptionChange,
  onToggleDesc,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  showDesc: boolean
  saving: boolean
  placeholder?: string
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onToggleDesc: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-purple-500/40 bg-white/5 w-full sm:w-64 light:bg-black/5">
      <input
        autoFocus
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !showDesc) {
            e.preventDefault()
            onConfirm()
          }
          if (e.key === 'Escape') onCancel()
        }}
        disabled={saving}
        placeholder={placeholder ?? 'Título da frente'}
        className="text-xs px-2 py-1.5 rounded-lg border border-white/10 bg-transparent text-white outline-none light:text-zinc-900 disabled:opacity-50"
      />
      {showDesc ? (
        <textarea
          autoFocus={!description}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Descrição (opcional) — links, pessoas, contexto..."
          rows={3}
          disabled={saving}
          className="text-xs px-2 py-1.5 rounded-lg border border-white/10 bg-transparent text-white outline-none resize-none light:text-zinc-900 disabled:opacity-50"
        />
      ) : (
        <button
          type="button"
          onClick={onToggleDesc}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-300 light:hover:text-emerald-600 self-start"
        >
          <StickyNote size={11} /> Adicionar descrição
        </button>
      )}
      <div className="flex gap-1.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-[11px] px-2 py-1 rounded text-zinc-500 hover:bg-white/5 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || !title.trim()}
          className="text-[11px] px-2 py-1 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}

export default function TaskForm({
  communityId: fixedCommunityId,
  userId,
  task,
  initialBoardStatus,
  onClose,
}: {
  communityId?: string
  userId: string
  task?: Task
  initialBoardStatus?: BoardStatus
  onClose: () => void
}) {
  const isEditing = Boolean(task)
  const { theme } = useTheme()
  const optionStyle = theme === 'light' ? { backgroundColor: '#fff', color: '#18181b' } : { backgroundColor: '#0d0e14', color: '#fff' }
  const createTask = useAppStore((s) => s.createTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const assignTask = useAppStore((s) => s.assignTask)
  const setTaskBoardStatus = useAppStore((s) => s.setTaskBoardStatus)
  const createMacroObjective = useAppStore((s) => s.createMacroObjective)
  const updateMacroObjective = useAppStore((s) => s.updateMacroObjective)
  const deleteMacroObjective = useAppStore((s) => s.deleteMacroObjective)
  const allCommunities = useAppStore((s) => s.communities)
  const allMacroObjectives = useAppStore((s) => s.macroObjectives)
  const allUsers = useAppStore((s) => s.users)
  const authUser = useAppStore((s) => s.authUser)
  const user = useAppStore((s) => s.getUserById(userId))
  const myCommunities = useMemo(
    () => allCommunities.filter((c) => user?.communityIds.includes(c.id)),
    [allCommunities, user],
  )

  const [selectedCommunityId, setSelectedCommunityId] = useState(fixedCommunityId ?? task?.communityId ?? '')
  const communityId = fixedCommunityId ?? selectedCommunityId
  const community = useAppStore((s) => (communityId ? s.getCommunityById(communityId) : undefined))

  const allTasks = useAppStore((s) => s.tasks)

  const usedCategories = Array.from(new Set(allTasks.map((t) => t.category))).filter(Boolean)
  const availableCategories = Array.from(new Set([...CATEGORY_PRESETS, ...usedCategories, ...(task ? [task.category] : [])]))

  const scopedMacroObjectives = useMemo(
    () => allMacroObjectives.filter((m) => (communityId ? m.communityId === communityId : !m.communityId && m.userId === userId)),
    [allMacroObjectives, communityId, userId],
  )

  const isWorkCommunity = community?.type === 'trabalho'
  const isCommunityAdmin = Boolean(
    authUser && community && (authUser.role === 'admin' || community.adminIds.includes(authUser.id)),
  )
  const canAssignAtCreation = !isEditing && isWorkCommunity && isCommunityAdmin
  const communityMembers = useMemo(
    () =>
      (community?.memberIds ?? [])
        .map((id) => allUsers.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [community, allUsers],
  )

  const [macroObjectiveId, setMacroObjectiveId] = useState(task?.macroObjectiveId ?? '')
  const [showMacroList, setShowMacroList] = useState(false)
  const [addingMacro, setAddingMacro] = useState(false)
  const [newMacro, setNewMacro] = useState('')
  const [newMacroDescription, setNewMacroDescription] = useState('')
  const [newMacroShowDesc, setNewMacroShowDesc] = useState(false)
  const [creatingMacro, setCreatingMacro] = useState(false)
  const [deletingMacroId, setDeletingMacroId] = useState<string | null>(null)
  const [macroDeleteError, setMacroDeleteError] = useState('')
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null)
  const [editMacroTitle, setEditMacroTitle] = useState('')
  const [editMacroDescription, setEditMacroDescription] = useState('')
  const [editMacroShowDesc, setEditMacroShowDesc] = useState(false)
  const [savingMacroEdit, setSavingMacroEdit] = useState(false)
  const [viewingMacroDescription, setViewingMacroDescription] = useState<{ title: string; text: string } | null>(null)
  const [complexity, setComplexity] = useState<Complexity>(task?.complexity ?? 'media')
  const [notScored, setNotScored] = useState(task ? !task.scored : false)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState(task?.category ?? CATEGORY_PRESETS[0])
  const [categories, setCategories] = useState(availableCategories)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [subtasks, setSubtasks] = useState<{ id?: string; text: string; dueDate: string; note: string; showNote: boolean }[]>(
    task && task.subtasks.length > 0
      ? task.subtasks.map((s) => ({
          id: s.id,
          text: s.text,
          dueDate: s.dueDate ? toDatetimeLocalValue(new Date(s.dueDate)) : '',
          note: s.note ?? '',
          showNote: Boolean(s.note),
        }))
      : [{ text: '', dueDate: '', note: '', showNote: false }],
  )
  const [deadline, setDeadline] = useState(task ? toDatetimeLocalValue(new Date(task.deadline)) : '')
  const [urgency, setUrgency] = useState<Severity>(task?.urgency ?? 'media')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(task?.recurrence ?? null)
  const [showRecurrenceMenu, setShowRecurrenceMenu] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customDates, setCustomDates] = useState<Set<string>>(new Set())
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())
  const [assigneeId, setAssigneeId] = useState(userId)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [dragSubtaskIndex, setDragSubtaskIndex] = useState<number | null>(null)
  const [dragOverSubtaskIndex, setDragOverSubtaskIndex] = useState<number | null>(null)

  const monthGrid = useMemo(
    () => buildMonthGrid(calendarCursor.getFullYear(), calendarCursor.getMonth()),
    [calendarCursor],
  )
  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  function toggleCustomDate(key: string) {
    setCustomDates((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectRecurrence(value: Recurrence | null) {
    setRecurrence(value)
    setCustomMode(false)
    setCustomDates(new Set())
    setShowRecurrenceMenu(false)
  }

  function selectCustomMode() {
    setRecurrence(null)
    setCustomMode(true)
    setShowRecurrenceMenu(false)
  }

  const minDeadline = toDatetimeLocalValue(new Date(Date.now() + 5 * 60000))
  const cleanSubtasks = subtasks.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.text.length > 0)

  const isValid =
    macroObjectiveId.length > 0 &&
    title.trim().length >= 3 &&
    category.trim().length > 0 &&
    cleanSubtasks.length >= 1 &&
    deadline.length > 0 &&
    new Date(deadline).getTime() > Date.now()

  useEffect(() => {
    if (macroObjectiveId && !scopedMacroObjectives.some((m) => m.id === macroObjectiveId)) {
      setMacroObjectiveId('')
    }
  }, [communityId, scopedMacroObjectives, macroObjectiveId])

  useEffect(() => {
    if (!canAssignAtCreation) setAssigneeId(userId)
  }, [canAssignAtCreation, userId])

  useEffect(() => {
    if (isWorkCommunity && notScored) setNotScored(false)
  }, [isWorkCommunity, notScored])

  function updateSubtaskText(index: number, value: string) {
    setSubtasks((s) => s.map((item, i) => (i === index ? { ...item, text: value } : item)))
  }

  function updateSubtaskDate(index: number, value: string) {
    setSubtasks((s) => s.map((item, i) => (i === index ? { ...item, dueDate: value } : item)))
  }

  function updateSubtaskNote(index: number, value: string) {
    setSubtasks((s) => s.map((item, i) => (i === index ? { ...item, note: value } : item)))
  }

  function toggleSubtaskNote(index: number) {
    setSubtasks((s) => s.map((item, i) => (i === index ? { ...item, showNote: !item.showNote, note: item.showNote ? '' : item.note } : item)))
  }

  function addSubtaskField() {
    setSubtasks((s) => [...s, { text: '', dueDate: '', note: '', showNote: false }])
  }

  function removeSubtaskField(index: number) {
    setSubtasks((s) => (s.length === 1 ? s : s.filter((_, i) => i !== index)))
  }

  function reorderSubtask(from: number, to: number) {
    setSubtasks((s) => {
      const next = [...s]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function confirmNewCategory() {
    const trimmed = newCategory.trim()
    if (!trimmed) {
      setAddingCategory(false)
      return
    }
    if (!categories.includes(trimmed)) {
      setCategories((c) => [...c, trimmed])
    }
    setCategory(trimmed)
    setNewCategory('')
    setAddingCategory(false)
  }

  function cancelNewMacro() {
    setAddingMacro(false)
    setNewMacro('')
    setNewMacroDescription('')
    setNewMacroShowDesc(false)
  }

  async function confirmNewMacro() {
    if (creatingMacro) return
    const trimmed = newMacro.trim()
    if (!trimmed) {
      cancelNewMacro()
      return
    }
    setCreatingMacro(true)
    const id = await createMacroObjective(trimmed, communityId || undefined, newMacroDescription)
    setCreatingMacro(false)
    if (id) setMacroObjectiveId(id)
    cancelNewMacro()
  }

  async function handleDeleteMacro(id: string, title: string) {
    if (deletingMacroId) return
    if (!window.confirm(`Excluir a frente "${title}"? Essa ação não pode ser desfeita.`)) return
    setDeletingMacroId(id)
    const error = await deleteMacroObjective(id)
    setDeletingMacroId(null)
    if (error) {
      setMacroDeleteError(error)
      return
    }
    setMacroDeleteError('')
  }

  function startEditMacro(id: string, title: string, description?: string) {
    setEditingMacroId(id)
    setEditMacroTitle(title)
    setEditMacroDescription(description ?? '')
    setEditMacroShowDesc(Boolean(description))
    setMacroDeleteError('')
  }

  function cancelEditMacro() {
    setEditingMacroId(null)
    setEditMacroTitle('')
    setEditMacroDescription('')
    setEditMacroShowDesc(false)
  }

  async function confirmEditMacro() {
    if (!editingMacroId || savingMacroEdit) return
    const trimmed = editMacroTitle.trim()
    if (!trimmed) {
      cancelEditMacro()
      return
    }
    setSavingMacroEdit(true)
    const error = await updateMacroObjective(editingMacroId, trimmed, editMacroDescription)
    setSavingMacroEdit(false)
    if (error) {
      setMacroDeleteError(error)
      return
    }
    setMacroDeleteError('')
    cancelEditMacro()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const baseFields = {
        communityId: communityId || undefined,
        macroObjectiveId,
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        category: category.trim(),
        subtasks: cleanSubtasks.map((s) => ({
          id: s.id,
          text: s.text,
          dueDate: s.dueDate ? new Date(s.dueDate).toISOString() : undefined,
          note: s.note.trim() ? s.note.trim() : undefined,
        })),
        urgency,
        complexity,
        scored: isWorkCommunity ? true : !notScored,
      }

      if (task) {
        const error = await updateTask(task.id, {
          ...baseFields,
          deadline: new Date(deadline).toISOString(),
          recurrence: recurrence ?? undefined,
        })
        if (error) {
          setSubmitError(error)
          return
        }
        onClose()
        return
      }

      const baseDeadline = new Date(deadline)
      const deadlines = [baseDeadline]
      if (customMode && customDates.size > 0) {
        for (const key of customDates) {
          const [y, m, d] = key.split('-').map(Number)
          const extra = new Date(y, m - 1, d, baseDeadline.getHours(), baseDeadline.getMinutes())
          if (extra.getTime() !== baseDeadline.getTime()) deadlines.push(extra)
        }
      }
      deadlines.sort((a, b) => a.getTime() - b.getTime())

      const createdIds: string[] = []
      for (const dt of deadlines) {
        const { error, taskId } = await createTask({
          ...baseFields,
          userId,
          deadline: dt.toISOString(),
          recurrence: customMode ? undefined : (recurrence ?? undefined),
        })
        if (error) {
          setSubmitError(error)
          return
        }
        if (taskId) createdIds.push(taskId)
      }

      if (canAssignAtCreation && assigneeId !== userId) {
        await Promise.all(createdIds.map((id) => assignTask(id, assigneeId)))
      }

      if (initialBoardStatus && initialBoardStatus !== 'todo') {
        await Promise.all(createdIds.map((id) => setTaskBoardStatus(id, initialBoardStatus)))
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel neon-border-purple rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white light:text-zinc-900">{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {fixedCommunityId ? community?.name : 'em grupo ou só sua — o planejamento continua obrigatório'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 light:hover:text-zinc-900 light:hover:bg-black/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4 overflow-y-auto">
          {!fixedCommunityId && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                <Layers size={13} className="text-purple-400 light:text-purple-600" /> Comunidade (opcional)
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                className="input"
              >
                <option value="" style={optionStyle}>
                  Nenhuma — tarefa só minha
                </option>
                {myCommunities.map((c) => (
                  <option key={c.id} value={c.id} style={optionStyle}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
              <Target size={13} className="text-purple-400 light:text-purple-600" /> Frente de Trabalho
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {!showMacroList &&
                scopedMacroObjectives
                  .filter((m) => m.id === macroObjectiveId)
                  .map((m) =>
                    editingMacroId === m.id ? (
                      <MacroEditForm
                        key={m.id}
                        title={editMacroTitle}
                        description={editMacroDescription}
                        showDesc={editMacroShowDesc}
                        saving={savingMacroEdit}
                        onTitleChange={setEditMacroTitle}
                        onDescriptionChange={setEditMacroDescription}
                        onToggleDesc={() => setEditMacroShowDesc((v) => !v)}
                        onConfirm={confirmEditMacro}
                        onCancel={cancelEditMacro}
                      />
                    ) : (
                      <div key={m.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowMacroList(true)}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-purple-500/15 border-purple-500/40 text-purple-200 transition-colors light:bg-purple-500/10 light:text-purple-700"
                        >
                          {m.title}
                        </button>
                        {m.description && (
                          <button
                            type="button"
                            onClick={() => setViewingMacroDescription({ title: m.title, text: m.description! })}
                            title="Ver descrição da frente"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-300 light:hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <StickyNote size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditMacro(m.id, m.title, m.description)}
                          title="Editar frente"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMacro(m.id, m.title)}
                          disabled={deletingMacroId === m.id}
                          title="Excluir frente"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ),
                  )}
              {addingMacro ? (
                <MacroEditForm
                  title={newMacro}
                  description={newMacroDescription}
                  showDesc={newMacroShowDesc}
                  saving={creatingMacro}
                  placeholder={community?.type === 'competicao' ? 'Ex.: Meta pessoal de saúde' : 'Ex.: Lançamento Q3 do produto'}
                  onTitleChange={setNewMacro}
                  onDescriptionChange={setNewMacroDescription}
                  onToggleDesc={() => setNewMacroShowDesc((v) => !v)}
                  onConfirm={confirmNewMacro}
                  onCancel={cancelNewMacro}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingMacro(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 hover:border-purple-500/40 transition-colors light:border-black/15"
                >
                  <Plus size={12} /> Nova frente
                </button>
              )}
              {scopedMacroObjectives.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMacroList((v) => !v)}
                  title={showMacroList ? 'Ocultar frentes já criadas' : 'Ver todas as frentes já criadas'}
                  className="p-1.5 rounded-lg border border-white/10 text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 hover:border-purple-500/40 transition-colors light:border-black/15"
                >
                  <ChevronDown size={14} className={`transition-transform ${showMacroList ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            {showMacroList && scopedMacroObjectives.length > 0 && (
              <div className="mt-1.5 rounded-lg border border-white/10 light:border-black/15 divide-y divide-white/5 light:divide-black/5 overflow-hidden">
                {scopedMacroObjectives.map((m) =>
                  editingMacroId === m.id ? (
                    <div key={m.id} className="px-2 py-1.5">
                      <MacroEditForm
                        title={editMacroTitle}
                        description={editMacroDescription}
                        showDesc={editMacroShowDesc}
                        saving={savingMacroEdit}
                        onTitleChange={setEditMacroTitle}
                        onDescriptionChange={setEditMacroDescription}
                        onToggleDesc={() => setEditMacroShowDesc((v) => !v)}
                        onConfirm={confirmEditMacro}
                        onCancel={cancelEditMacro}
                      />
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMacroObjectiveId(m.id)
                          setShowMacroList(false)
                        }}
                        className={`flex-1 text-left text-xs px-3 py-2 transition-colors ${
                          m.id === macroObjectiveId
                            ? 'bg-purple-500/15 text-purple-200 light:bg-purple-500/10 light:text-purple-700'
                            : 'text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5'
                        }`}
                      >
                        {m.title}
                      </button>
                      {m.description && (
                        <button
                          type="button"
                          onClick={() => setViewingMacroDescription({ title: m.title, text: m.description! })}
                          title="Ver descrição da frente"
                          className="p-2 text-zinc-500 hover:text-amber-300 light:hover:text-amber-600 transition-colors"
                        >
                          <StickyNote size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditMacro(m.id, m.title, m.description)}
                        title="Editar frente"
                        className="p-2 text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMacro(m.id, m.title)}
                        disabled={deletingMacroId === m.id}
                        title="Excluir frente"
                        className="p-2 text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
            {macroDeleteError && <p className="text-[11px] text-rose-400 light:text-rose-600 mt-1.5">{macroDeleteError}</p>}
            {scopedMacroObjectives.length === 0 && !addingMacro && (
              <p className="text-[11px] text-zinc-500 mt-1.5">Nenhuma frente ainda — crie uma pra vincular essa tarefa.</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">A Tarefa</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Finalizar landing page de vendas"
              className="input"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
              <StickyNote size={13} className="text-emerald-400 light:text-emerald-600" /> Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes, links, pessoas envolvidas, contexto..."
              rows={4}
              className="input !text-sm resize-none"
            />
          </div>

          {canAssignAtCreation && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
                <UserCog size={13} className="text-sky-400 light:text-sky-600" /> Responsável
              </label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input">
                {communityMembers.map((m) => (
                  <option key={m.id} value={m.id} style={optionStyle}>
                    {m.id === userId ? `${m.name} (você)` : m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
              <Tag size={13} className="text-purple-400 light:text-purple-600" /> Categoria
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const active = category === c
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                      active
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-200 light:bg-purple-500/10 light:text-purple-700'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:text-zinc-600 light:hover:bg-black/5'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
              {addingCategory ? (
                <input
                  autoFocus
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmNewCategory()
                    }
                    if (e.key === 'Escape') {
                      setAddingCategory(false)
                      setNewCategory('')
                    }
                  }}
                  onBlur={confirmNewCategory}
                  placeholder="Nova categoria"
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-purple-500/40 bg-white/5 text-white outline-none w-32 light:bg-black/5 light:text-zinc-900"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCategory(true)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 text-zinc-500 hover:text-purple-300 light:hover:text-purple-600 hover:border-purple-500/40 transition-colors light:border-black/15"
                >
                  <Plus size={12} /> Nova
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
              <ListChecks size={13} className="text-emerald-400 light:text-emerald-600" /> Plano de Execução — o "como" (checklist obrigatório, prazo por item é opcional)
            </label>
            <div className="flex flex-col gap-2">
              {subtasks.map((s, i) => (
                <div
                  key={i}
                  onDragOver={(e) => {
                    if (dragSubtaskIndex === null) return
                    e.preventDefault()
                    setDragOverSubtaskIndex(i)
                  }}
                  onDragLeave={() => setDragOverSubtaskIndex((c) => (c === i ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverSubtaskIndex(null)
                    if (dragSubtaskIndex === null || dragSubtaskIndex === i) return
                    reorderSubtask(dragSubtaskIndex, i)
                    setDragSubtaskIndex(null)
                  }}
                  className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-colors ${
                    dragOverSubtaskIndex === i
                      ? 'border-purple-500/50 bg-purple-500/[0.06]'
                      : 'border-white/5 bg-white/[0.02] light:border-black/5 light:bg-black/[0.015]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      draggable={subtasks.length > 1}
                      onDragStart={() => setDragSubtaskIndex(i)}
                      onDragEnd={() => {
                        setDragSubtaskIndex(null)
                        setDragOverSubtaskIndex(null)
                      }}
                      title={subtasks.length > 1 ? 'Arraste para reordenar' : undefined}
                      className={`shrink-0 text-zinc-600 ${subtasks.length > 1 ? 'cursor-grab active:cursor-grabbing hover:text-zinc-400' : 'opacity-30'}`}
                    >
                      <GripVertical size={14} />
                    </span>
                    <input
                      value={s.text}
                      onChange={(e) => updateSubtaskText(i, e.target.value)}
                      placeholder="Subtarefa"
                      className="input"
                    />
                    <button
                      type="button"
                      onClick={() => removeSubtaskField(i)}
                      disabled={subtasks.length === 1}
                      className="p-2 rounded-lg text-zinc-600 hover:text-rose-400 light:hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <CalendarClock size={12} className="text-zinc-600 shrink-0" />
                    <input
                      type="datetime-local"
                      value={s.dueDate}
                      onChange={(e) => updateSubtaskDate(i, e.target.value)}
                      min={minDeadline}
                      max={deadline || undefined}
                      className="input !py-1 !text-xs !w-auto flex-1"
                    />
                    {s.dueDate && (
                      <button
                        type="button"
                        onClick={() => updateSubtaskDate(i, '')}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 shrink-0"
                      >
                        Remover prazo
                      </button>
                    )}
                  </div>
                  {s.showNote ? (
                    <div className="flex items-start gap-2 pl-6">
                      <StickyNote size={12} className="text-zinc-600 shrink-0 mt-1.5" />
                      <textarea
                        autoFocus={!s.note}
                        value={s.note}
                        onChange={(e) => updateSubtaskNote(i, e.target.value)}
                        placeholder="Observação (opcional)"
                        rows={2}
                        className="input !text-xs flex-1 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSubtaskNote(i)}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 shrink-0 mt-1.5"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSubtaskNote(i)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-300 light:hover:text-emerald-600 pl-6 self-start"
                    >
                      <StickyNote size={12} /> Adicionar observação
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSubtaskField}
              className="mt-2 flex items-center gap-1 text-xs text-purple-300 light:text-purple-600 hover:text-purple-200"
            >
              <Plus size={13} /> Adicionar subtarefa
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5 block">Prazo — data e hora limite</label>
            <input
              type="datetime-local"
              value={deadline}
              min={minDeadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 light:text-zinc-600 mb-1.5">
              <Repeat size={13} className="text-purple-400 light:text-purple-600" /> Recorrência (opcional)
            </label>
            <button
              type="button"
              onClick={() => setShowRecurrenceMenu((v) => !v)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/5 px-3.5 py-2.5 text-sm transition-colors light:border-black/10 light:bg-black/[0.02] light:hover:bg-black/5"
            >
              <span className="flex items-center gap-2 text-zinc-200 light:text-zinc-800">
                <CalendarClock size={15} className="text-purple-400 light:text-purple-600 shrink-0" />
                {customMode
                  ? `Personalizado (${customDates.size} data${customDates.size !== 1 ? 's' : ''} extra${customDates.size !== 1 ? 's' : ''})`
                  : recurrence
                    ? recurrenceLabel(recurrence, deadline)
                    : 'Não repete'}
              </span>
              <ChevronDown size={15} className={`text-zinc-500 shrink-0 transition-transform ${showRecurrenceMenu ? 'rotate-180' : ''}`} />
            </button>
            {showRecurrenceMenu && (
              <div className="mt-1.5 rounded-xl border border-white/10 bg-[#14151f] overflow-hidden light:border-black/10 light:bg-white">
                <button
                  type="button"
                  onClick={() => selectRecurrence(null)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                    recurrence === null && !customMode
                      ? 'bg-purple-500/15 text-purple-200'
                      : 'text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5'
                  }`}
                >
                  Não repete
                </button>
                {RECURRENCE_KEYS.map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => selectRecurrence(key)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm border-t border-white/5 transition-colors light:border-black/5 ${
                      recurrence === key
                        ? 'bg-purple-500/15 text-purple-200'
                        : 'text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5'
                    }`}
                  >
                    {recurrenceLabel(key, deadline)}
                  </button>
                ))}
                {!isEditing && (
                  <button
                    type="button"
                    onClick={selectCustomMode}
                    className={`w-full text-left px-3.5 py-2.5 text-sm border-t border-white/5 transition-colors light:border-black/5 ${
                      customMode
                        ? 'bg-purple-500/15 text-purple-200'
                        : 'text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-black/5'
                    }`}
                  >
                    Personalizado — escolher datas no calendário
                  </button>
                )}
              </div>
            )}
            {recurrence && !customMode && !showRecurrenceMenu && (
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Ao concluir (ou expirar), uma nova ocorrência é criada automaticamente com o próximo prazo.
              </p>
            )}

            {customMode && (
              <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 light:border-black/10 light:bg-black/[0.015]">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setCalendarCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-medium text-zinc-300 light:text-zinc-700 capitalize">
                    {calendarCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 light:hover:text-zinc-900 light:hover:bg-black/5"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {WEEKDAY_SHORT.map((w, i) => (
                    <span key={i} className="text-[10px] text-zinc-600">
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((cell, i) => {
                    const key = dateKey(cell.date)
                    const isPast = cell.date < todayStart
                    const selected = customDates.has(key)
                    return (
                      <button
                        type="button"
                        key={i}
                        disabled={isPast || !cell.inMonth}
                        onClick={() => toggleCustomDate(key)}
                        className={`text-[11px] py-1.5 rounded-lg transition-colors ${!cell.inMonth ? 'opacity-0 pointer-events-none' : ''} ${
                          isPast
                            ? 'text-zinc-700 cursor-not-allowed'
                            : selected
                              ? 'bg-purple-500 text-white font-semibold'
                              : 'text-zinc-300 hover:bg-white/10 light:text-zinc-700 light:hover:bg-black/10'
                        }`}
                      >
                        {cell.date.getDate()}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  {customDates.size === 0
                    ? 'Clique nos dias em que a tarefa também deve acontecer, além do prazo principal.'
                    : `${customDates.size + 1} tarefas serão criadas: o prazo principal + ${customDates.size} data${customDates.size !== 1 ? 's' : ''} escolhida${customDates.size !== 1 ? 's' : ''} (mesmo horário).`}
                </p>
                <button
                  type="button"
                  onClick={() => selectRecurrence(null)}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 light:hover:text-rose-600 mt-2"
                >
                  Cancelar seleção personalizada
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2 block">Nível de Urgência</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(URGENCY_CONFIG) as Severity[]).map((key) => {
                const cfg = URGENCY_CONFIG[key]
                const active = urgency === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setUrgency(key)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.border}`
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:hover:bg-black/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? cfg.color : 'text-zinc-300 light:text-zinc-700'}`}>{cfg.label}</p>
                    <p className="text-[11px] text-zinc-500">perde {cfg.points} pt{cfg.points > 1 ? 's' : ''} se expirar</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 light:text-zinc-600 mb-2 block">Nível de Complexidade</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COMPLEXITY_LABEL) as Complexity[]).map((key) => {
                const active = complexity === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setComplexity(key)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${
                      active
                        ? 'bg-purple-500/10 border-purple-500/40'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/5 light:border-black/10 light:bg-black/[0.02] light:hover:bg-black/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? 'text-purple-300 light:text-purple-700' : 'text-zinc-300 light:text-zinc-700'}`}>
                      {COMPLEXITY_LABEL[key]}
                    </p>
                    <p className="text-[11px] text-zinc-500">pontuação ×{COMPLEXITY_MULTIPLIER[key]}</p>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Multiplica os pontos ganhos (ou perdidos, se expirar) por essa tarefa — assim tarefas complexas valem mais que várias tarefas fáceis.
            </p>
          </div>

          {!isWorkCommunity && (
            <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 cursor-pointer light:border-black/10 light:bg-black/[0.02]">
              <input
                type="checkbox"
                checked={notScored}
                onChange={(e) => setNotScored(e.target.checked)}
                className="mt-0.5 accent-purple-500"
              />
              <span className="flex items-start gap-2.5">
                <Ban size={15} className="shrink-0 mt-0.5 text-zinc-500" />
                <span>
                  <span className="block text-sm font-semibold text-zinc-300 light:text-zinc-700">Não pontuar esta tarefa</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    Ideal pra listas do dia a dia (ex.: compras do mercado) que não devem contar pro seu nível.
                  </span>
                </span>
              </span>
            </label>
          )}

          <button type="submit" disabled={!isValid || submitting} className="btn-secondary mt-1 shrink-0">
            <CheckCircle2 size={16} /> {submitting ? 'Salvando…' : isEditing ? 'Salvar Alterações' : 'Salvar Tarefa'}
          </button>
          {submitError && (
            <p className="text-[11px] text-center text-rose-400 light:text-rose-600 -mt-2">Erro ao salvar: {submitError}</p>
          )}
          {!isValid && (
            <p className="text-[11px] text-center text-zinc-600 -mt-2">
              Preencha comunidade, frente, título, categoria, ao menos uma subtarefa e um prazo futuro para liberar o salvamento.
            </p>
          )}
        </form>
      </div>
      {viewingMacroDescription && (
        <NoteViewerModal
          title={viewingMacroDescription.title}
          note={viewingMacroDescription.text}
          onClose={() => setViewingMacroDescription(null)}
        />
      )}
    </div>,
    document.body,
  )
}
