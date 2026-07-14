import type { Severity } from '../types'

export const URGENCY_CONFIG: Record<Severity, { label: string; points: number; color: string; bg: string; border: string }> = {
  baixa: { label: 'Baixa', points: 1, color: 'text-sky-300 light:text-sky-700', bg: 'bg-sky-500/10', border: 'border-sky-500/40' },
  media: { label: 'Média', points: 3, color: 'text-amber-300 light:text-amber-700', bg: 'bg-amber-500/10', border: 'border-amber-500/40' },
  alta: { label: 'Alta', points: 5, color: 'text-orange-300 light:text-orange-700', bg: 'bg-orange-500/10', border: 'border-orange-500/40' },
  critica: { label: 'Crítica', points: 10, color: 'text-rose-300 light:text-rose-700', bg: 'bg-rose-500/10', border: 'border-rose-500/40' },
}

export const SEVERITY_CONFIG = URGENCY_CONFIG
