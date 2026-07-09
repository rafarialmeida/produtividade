import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Task } from '../types'
import { URGENCY_CONFIG } from '../utils/urgency'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface DayCell {
  date: Date
  inMonth: boolean
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
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
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const d = new Date(t.deadline)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return map
  }, [tasks])

  function tasksFor(date: Date) {
    return tasksByDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? []
  }

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="text-purple-400" size={20} />
          <div>
            <h2 className="font-bold text-white text-lg capitalize">{monthLabel}</h2>
            <p className="text-xs text-zinc-500">Prazos das suas tarefas no mês</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/5">
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

          return (
            <div
              key={i}
              className={`min-h-[92px] p-1.5 border-b border-r border-white/5 [&:nth-child(7n)]:border-r-0 flex flex-col gap-1 ${
                cell.inMonth ? '' : 'opacity-30'
              }`}
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
                  return (
                    <span
                      key={t.id}
                      title={t.title}
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate border ${cfg.bg} ${cfg.border} ${cfg.color} ${
                        t.completed ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      {t.title}
                    </span>
                  )
                })}
                {overflow > 0 && <span className="text-[10px] text-zinc-500 px-1">+{overflow} mais</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
