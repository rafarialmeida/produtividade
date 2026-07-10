import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../types'
import { useAppStore } from '../store/useStore'
import { URGENCY_CONFIG } from '../utils/urgency'
import TaskDetailModal from './TaskDetailModal'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface DayCell {
  date: Date
  inMonth: boolean
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function withNewDate(original: Date, target: Date) {
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
  )
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: DayCell[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
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

export default function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const rescheduleTask = useAppStore((s) => s.rescheduleTask)
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const key = dayKey(new Date(t.deadline))
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return map
  }, [tasks])

  function tasksFor(date: Date) {
    return tasksByDay.get(dayKey(date)) ?? []
  }

  function handleDrop(e: React.DragEvent, targetDate: Date) {
    e.preventDefault()
    setDragOverKey(null)
    const taskId = e.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const newDeadline = withNewDate(new Date(task.deadline), targetDate)
    rescheduleTask(task.id, newDeadline.toISOString())
  }

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 light:border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="text-purple-400" size={20} />
          <div>
            <h2 className="font-bold text-white light:text-zinc-900 text-lg capitalize">{monthLabel}</h2>
            <p className="text-xs text-zinc-500">Clique numa tarefa para ver os detalhes, ou arraste para outro dia</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-black/5"
          >
            Hoje
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-black/5"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-black/5"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/5 light:border-black/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-zinc-500 py-2">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dayTasks = tasksFor(cell.date)
          const visible = dayTasks.slice(0, 3)
          const overflow = dayTasks.length - visible.length
          const isToday = isSameDay(cell.date, today)
          const cellKey = dayKey(cell.date)
          const isDragOver = dragOverKey === cellKey

          return (
            <div
              key={i}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverKey(cellKey)
              }}
              onDragLeave={() => setDragOverKey((k) => (k === cellKey ? null : k))}
              onDrop={(e) => handleDrop(e, cell.date)}
              className={`min-h-[92px] p-1.5 border-b border-r border-white/5 light:border-black/5 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 transition-colors ${
                cell.inMonth ? '' : 'opacity-30'
              } ${isDragOver ? 'bg-purple-500/10' : ''}`}
            >
              <span
                className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-purple-500 text-white font-bold' : 'text-zinc-500'
                }`}
              >
                {cell.date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((t) => {
                  const cfg = URGENCY_CONFIG[t.urgency]
                  const draggable = !t.completed && !t.expired
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.title}
                      draggable={draggable}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border text-left ${cfg.bg} ${cfg.border} ${cfg.color} ${
                        t.completed ? 'opacity-50 line-through' : ''
                      } ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:brightness-125`}
                    >
                      {t.title}
                    </button>
                  )
                })}
                {overflow > 0 && <span className="text-[10px] text-zinc-500 px-1">+{overflow} mais</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  )
}
