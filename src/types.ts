export type Role = 'admin' | 'member'

export type Severity = 'baixa' | 'media' | 'alta' | 'critica'

export type CommunityType = 'trabalho' | 'competicao'

export const SEVERITY_LABEL: Record<Severity, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

export const COMMUNITY_TYPE_LABEL: Record<CommunityType, string> = {
  trabalho: 'Trabalho',
  competicao: 'Competição',
}

export const URGENCY_POINTS: Record<Severity, number> = {
  baixa: 1,
  media: 3,
  alta: 5,
  critica: 10,
}

export interface User {
  id: string
  name: string
  email: string
  password?: string
  role: Role
  communityIds: string[]
  avatarSeed: string
}

export interface Community {
  id: string
  name: string
  type: CommunityType
  severity: Severity
  inviteCode: string
  memberIds: string[]
  creatorId: string
  createdAt: string
}

export interface SubTask {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  communityId?: string
  userId: string
  macroObjective: string
  title: string
  category: string
  subtasks: SubTask[]
  deadline: string
  urgency: Severity
  started: boolean
  completed: boolean
  completedAt?: string
  expired: boolean
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  message: string
  type: 'penalty' | 'warning' | 'info'
  createdAt: string
  read: boolean
}

export interface PointsRecord {
  userId: string
  communityId: string
  lostPoints: number
}
