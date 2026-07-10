import type { Recurrence } from '../types'

function addInterval(date: Date, recurrence: Recurrence): Date {
  const next = new Date(date)
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'every_other_day':
      next.setDate(next.getDate() + 2)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
  }
  return next
}

/**
 * Próximo prazo a partir do prazo original, preservando o dia/hora do ciclo
 * (ex.: sempre segunda às 9h). Se a tarefa ficou muito tempo sem ser resolvida,
 * pula os ciclos já vencidos até achar a próxima ocorrência no futuro.
 */
export function nextRecurrenceDate(originalDeadline: Date, recurrence: Recurrence, from = new Date()): Date {
  let next = addInterval(originalDeadline, recurrence)
  while (next.getTime() <= from.getTime()) {
    next = addInterval(next, recurrence)
  }
  return next
}
