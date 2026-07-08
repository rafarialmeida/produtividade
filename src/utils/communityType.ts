import { Briefcase, Swords } from 'lucide-react'
import type { CommunityType } from '../types'

export const COMMUNITY_TYPE_CONFIG: Record<
  CommunityType,
  { label: string; description: string; icon: typeof Briefcase; color: string; bg: string; border: string }
> = {
  trabalho: {
    label: 'Trabalho',
    description: 'Projetos e tarefas em conjunto com colegas',
    icon: Briefcase,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
  },
  competicao: {
    label: 'Competição',
    description: 'Só ranking entre amigos — cada um com suas próprias metas',
    icon: Swords,
    color: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
  },
}
