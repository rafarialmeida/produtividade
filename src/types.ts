export type Role = 'admin' | 'member'

export type Severity = 'baixa' | 'media' | 'alta' | 'critica'

export type Complexity = 'baixa' | 'media' | 'alta' | 'critica'

export type CommunityType = 'trabalho' | 'competicao'

export type Recurrence = 'daily' | 'every_other_day' | 'weekly' | 'biweekly' | 'monthly'

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: 'Diariamente',
  every_other_day: 'Dia sim, dia não',
  weekly: 'Semanalmente',
  biweekly: 'A cada 2 semanas',
  monthly: 'Mensalmente',
}

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

export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
}

// Multiplica os pontos (positivos e perdidos) de uma tarefa: poucas tarefas
// complexas devem valer mais que muitas tarefas fáceis.
export const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  baixa: 1,
  media: 1.5,
  alta: 2,
  critica: 3,
}

export interface NotificationPreferences {
  notifyReminder: boolean
  notifyExpired: boolean
  notifyCompleted: boolean
  notifyOnlyUrgent: boolean
  notifyWeeklyDigest: boolean
}

export interface User {
  id: string
  name: string
  role: Role
  communityIds: string[]
  avatarSeed: string
  avatarUrl?: string
}

export interface AuthUser extends NotificationPreferences {
  id: string
  email: string
  name: string
  role: Role
  avatarSeed: string
  avatarUrl?: string
  onboardingCompletedAt?: string
}

export interface PublicProfile {
  userId: string
  name: string
  avatarSeed: string
  avatarUrl?: string
  role: Role
  lostPoints: number
  tasksExpired: number
  subtasksMissed: number
  positivePoints: number
  personalPositivePoints: number
  personalLostPoints: number
  personalTasksCompleted: number
  personalTasksExpired: number
  workXp: number
  personalXp: number
  tasksCompleted: number
  subtasksCompleted: number
  communityCount: number
  leadTimeHours?: number
  cycleTimeHours?: number
}

export interface CommunityPiece {
  pieceId: string
  color: string
}

export interface Community {
  id: string
  name: string
  type: CommunityType
  severity: Severity
  inviteCode: string
  memberIds: string[]
  adminIds: string[]
  pieces: Record<string, CommunityPiece>
  creatorId: string
  boardEnabled: boolean
  createdAt: string
}

export interface SubTask {
  id: string
  text: string
  done: boolean
  dueDate?: string
  assigneeId?: string
  minutesSpent?: number
}

export interface MacroObjective {
  id: string
  communityId?: string
  userId: string
  title: string
  createdAt: string
}

export interface Task {
  id: string
  communityId?: string
  userId: string
  macroObjectiveId: string
  macroObjective: string
  title: string
  category: string
  subtasks: SubTask[]
  deadline: string
  urgency: Severity
  complexity: Complexity
  started: boolean
  startedAt?: string
  completed: boolean
  completedAt?: string
  minutesSpent?: number
  expired: boolean
  scored: boolean
  recurrence?: Recurrence
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  message: string
  type: 'penalty' | 'warning' | 'info' | 'success'
  taskId?: string
  createdAt: string
  read: boolean
}
