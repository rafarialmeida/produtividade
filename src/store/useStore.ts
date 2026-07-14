import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  AuthUser,
  Community,
  CommunityPiece,
  CommunityType,
  Complexity,
  MacroObjective,
  Notification,
  NotificationPreferences,
  PublicProfile,
  Recurrence,
  Severity,
  SubTask,
  Task,
  User,
} from '../types'
import { URGENCY_POINTS } from '../types'
import { nextRecurrenceDate } from '../utils/recurrence'
import { containsOffensiveLanguage } from '../utils/profanity'

export interface GlobalWallEntry {
  userId: string
  name: string
  avatarSeed: string
  avatarUrl?: string
  role: string
  lostPoints: number
  tasksExpired: number
  subtasksMissed: number
  positivePoints: number
  personalPositivePoints: number
  personalLostPoints: number
  personalTasksCompleted: number
  personalTasksExpired: number
  tasksCompleted: number
  subtasksCompleted: number
  communityCount: number
}

export interface CommunityRankingEntry {
  communityId: string
  name: string
  memberCount: number
  tasksCompleted: number
  subtasksCompleted: number
  leadTimeHours?: number
  cycleTimeHours?: number
}

function mapProfileStatsRow(row: Record<string, unknown>): PublicProfile {
  return {
    userId: row.user_id as string,
    name: row.name as string,
    avatarSeed: row.avatar_seed as string,
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    role: row.role as User['role'],
    lostPoints: Number(row.lost_points),
    tasksExpired: Number(row.tasks_expired),
    subtasksMissed: Number(row.subtasks_missed),
    positivePoints: Number(row.positive_points),
    personalPositivePoints: Number(row.personal_positive_points),
    personalLostPoints: Number(row.personal_lost_points),
    personalTasksCompleted: Number(row.personal_tasks_completed),
    personalTasksExpired: Number(row.personal_tasks_expired),
    workXp: Number(row.work_xp),
    personalXp: Number(row.personal_xp),
    tasksCompleted: Number(row.tasks_completed),
    subtasksCompleted: Number(row.subtasks_completed),
    communityCount: Number(row.community_count),
    leadTimeHours: row.lead_time_avg_hours == null ? undefined : Number(row.lead_time_avg_hours),
    cycleTimeHours: row.cycle_time_avg_hours == null ? undefined : Number(row.cycle_time_avg_hours),
  }
}

interface CreateTaskInput {
  communityId?: string
  userId: string
  macroObjectiveId: string
  title: string
  category: string
  subtasks: { text: string; dueDate?: string }[]
  deadline: string
  urgency: Severity
  complexity: Complexity
  scored: boolean
  recurrence?: Recurrence
}

interface UpdateTaskInput {
  communityId?: string
  macroObjectiveId: string
  title: string
  category: string
  subtasks: { id?: string; text: string; dueDate?: string }[]
  deadline: string
  urgency: Severity
  complexity: Complexity
  scored: boolean
  recurrence?: Recurrence
}

interface CompleteTaskMinutes {
  subtasks?: Record<string, number>
  direct?: number
}

interface State {
  authUser: AuthUser | null
  authLoading: boolean
  dataLoading: boolean

  users: User[]
  communities: Community[]
  tasks: Task[]
  macroObjectives: MacroObjective[]
  notifications: Notification[]
  myStats: PublicProfile | null
  onlineUserIds: Set<string>
  trashedTasks: Task[]
  trashedCommunities: Community[]
  levelMode: 'work' | 'personal' | 'all'
  setLevelMode: (mode: 'work' | 'personal' | 'all') => void

  // auth
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<string | null>
  setOnlineUserIds: (ids: Set<string>) => void
  completeOnboarding: () => Promise<void>

  refreshAll: () => Promise<void>

  // community actions
  createCommunity: (name: string, severity: Severity, type: CommunityType, boardEnabled?: boolean) => Promise<string | null>
  setCommunityBoardEnabled: (communityId: string, enabled: boolean) => Promise<string | null>
  renameCommunity: (communityId: string, name: string) => Promise<string | null>
  joinCommunityWithCode: (code: string) => Promise<{ error: string | null; communityName: string | null }>
  regenerateInviteCode: (communityId: string) => Promise<void>
  deleteCommunity: (communityId: string) => Promise<void>
  restoreCommunity: (communityId: string) => Promise<void>
  permanentlyDeleteCommunity: (communityId: string) => Promise<void>
  setCommunityAdmin: (communityId: string, userId: string, isAdmin: boolean) => Promise<string | null>
  setCommunityPiece: (communityId: string, pieceId: string, color: string) => Promise<string | null>

  // objetivo macro
  createMacroObjective: (title: string, communityId?: string) => Promise<string | null>

  // task actions
  createTask: (input: CreateTaskInput) => Promise<string | null>
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<string | null>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  setTaskStarted: (taskId: string, started: boolean) => Promise<void>
  completeTask: (taskId: string, minutes?: CompleteTaskMinutes) => Promise<void>
  reopenTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  restoreTask: (taskId: string) => Promise<void>
  permanentlyDeleteTask: (taskId: string) => Promise<void>
  fetchTrash: () => Promise<void>
  rescheduleTask: (taskId: string, deadline: string) => Promise<void>
  checkExpirations: () => Promise<void>
  assignTask: (taskId: string, assigneeId: string) => Promise<string | null>
  assignSubtask: (subtaskId: string, assigneeId: string | null) => Promise<string | null>
  setTaskBlocked: (taskId: string, blocked: boolean, reason?: string) => Promise<string | null>

  // notifications
  markNotificationRead: (id: string) => Promise<void>
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>

  // global wall (calculado no servidor, não depende do cache local de tasks)
  fetchGlobalWall: () => Promise<GlobalWallEntry[]>
  fetchPublicProfile: (userId: string) => Promise<PublicProfile | null>
  fetchCompetitionCommunityRankings: () => Promise<CommunityRankingEntry[]>
  fetchWorkCommunityRankings: () => Promise<CommunityRankingEntry[]>

  // perfil
  updatePassword: (newPassword: string) => Promise<string | null>
  updateName: (name: string) => Promise<string | null>
  uploadAvatar: (file: Blob) => Promise<{ url: string | null; error: string | null }>
  removeAvatar: () => Promise<string | null>

  // selectors
  getUserById: (id: string) => User | undefined
  getCommunityById: (id: string | undefined) => Community | undefined
}

function mapSubtask(row: Record<string, unknown>): SubTask {
  return {
    id: row.id as string,
    text: row.text as string,
    done: row.done as boolean,
    dueDate: (row.due_date as string | null) ?? undefined,
    assigneeId: (row.assignee_id as string | null) ?? undefined,
    minutesSpent: (row.minutes_spent as number | null) ?? undefined,
  }
}

function mapTask(row: Record<string, unknown>): Task {
  const macroObjective = row.macro_objectives as Record<string, unknown> | null
  return {
    id: row.id as string,
    communityId: (row.community_id as string | null) ?? undefined,
    userId: row.user_id as string,
    macroObjectiveId: row.macro_objective_id as string,
    macroObjective: (macroObjective?.title as string | undefined) ?? '',
    title: row.title as string,
    category: row.category as string,
    subtasks: ((row.subtasks as Record<string, unknown>[] | null) ?? []).map(mapSubtask),
    deadline: row.deadline as string,
    urgency: row.urgency as Severity,
    complexity: (row.complexity as Complexity | null) ?? 'media',
    started: row.started as boolean,
    startedAt: (row.started_at as string | null) ?? undefined,
    completed: row.completed as boolean,
    completedAt: (row.completed_at as string | null) ?? undefined,
    minutesSpent: (row.minutes_spent as number | null) ?? undefined,
    expired: row.expired as boolean,
    scored: (row.scored as boolean | null) ?? true,
    recurrence: (row.recurrence as Recurrence | null) ?? undefined,
    blocked: (row.blocked as boolean | null) ?? false,
    blockedReason: (row.blocked_reason as string | null) ?? undefined,
    blockedAt: (row.blocked_at as string | null) ?? undefined,
    blockedBy: (row.blocked_by as string | null) ?? undefined,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

function mapMacroObjective(row: Record<string, unknown>): MacroObjective {
  return {
    id: row.id as string,
    communityId: (row.community_id as string | null) ?? undefined,
    userId: row.user_id as string,
    title: row.title as string,
    createdAt: row.created_at as string,
  }
}

function mapCommunity(
  row: Record<string, unknown>,
  memberIds: string[],
  adminIds: string[],
  pieces: Record<string, CommunityPiece>,
): Community {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as CommunityType,
    severity: row.severity as Severity,
    inviteCode: row.invite_code as string,
    memberIds,
    adminIds,
    pieces,
    creatorId: row.creator_id as string,
    boardEnabled: row.board_enabled as boolean,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    message: row.message as string,
    type: row.type as Notification['type'],
    taskId: (row.task_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
    read: row.read as boolean,
  }
}

async function spawnNextOccurrence(task: {
  communityId?: string
  userId: string
  macroObjectiveId: string
  title: string
  category: string
  deadline: string
  urgency: Severity
  complexity: Complexity
  scored: boolean
  recurrence: Recurrence
  subtasks: SubTask[]
}) {
  const nextDeadline = nextRecurrenceDate(new Date(task.deadline), task.recurrence)
  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      community_id: task.communityId ?? null,
      user_id: task.userId,
      macro_objective_id: task.macroObjectiveId,
      title: task.title,
      category: task.category,
      deadline: nextDeadline.toISOString(),
      urgency: task.urgency,
      complexity: task.complexity,
      scored: task.scored,
      recurrence: task.recurrence,
    })
    .select()
    .single()
  if (error || !newTask) return

  if (task.subtasks.length > 0) {
    await supabase.from('subtasks').insert(
      task.subtasks.map((s, i) => ({
        task_id: newTask.id,
        text: s.text,
        position: i,
      })),
    )
  }
}

export const useAppStore = create<State>()((set, get) => ({
  authUser: null,
  authLoading: true,
  dataLoading: false,

  users: [],
  communities: [],
  tasks: [],
  macroObjectives: [],
  notifications: [],
  myStats: null,
  onlineUserIds: new Set(),
  trashedTasks: [],
  trashedCommunities: [],
  levelMode: 'work',

  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
  setLevelMode: (mode) => set({ levelMode: mode }),

  signUp: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) return { error: error.message, needsConfirmation: false }
    return { error: null, needsConfirmation: !data.session }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/day` },
    })
  },

  signInWithMicrosoft: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: `${window.location.origin}/day`, scopes: 'email' },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },

  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error?.message ?? null
  },

  refreshAll: async () => {
    const authUser = get().authUser
    if (!authUser) return
    set({ dataLoading: true })

    const [profilesRes, communitiesRes, membersRes, tasksRes, macroObjectivesRes, notificationsRes, myStats] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('communities').select('*').is('deleted_at', null),
      supabase.from('community_members').select('*'),
      supabase
        .from('tasks')
        .select('*, subtasks(*), macro_objectives(title)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('position', { foreignTable: 'subtasks', ascending: true }),
      supabase.from('macro_objectives').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      get().fetchPublicProfile(authUser.id),
    ])

    const members = membersRes.data ?? []
    const memberIdsByCommunity = new Map<string, string[]>()
    const adminIdsByCommunity = new Map<string, string[]>()
    const communityIdsByUser = new Map<string, string[]>()
    const piecesByCommunity = new Map<string, Record<string, CommunityPiece>>()
    for (const m of members) {
      const a = memberIdsByCommunity.get(m.community_id) ?? []
      a.push(m.user_id)
      memberIdsByCommunity.set(m.community_id, a)

      if (m.role === 'admin') {
        const admins = adminIdsByCommunity.get(m.community_id) ?? []
        admins.push(m.user_id)
        adminIdsByCommunity.set(m.community_id, admins)
      }

      if (m.piece_id && m.piece_color) {
        const pieces = piecesByCommunity.get(m.community_id) ?? {}
        pieces[m.user_id] = { pieceId: m.piece_id, color: m.piece_color }
        piecesByCommunity.set(m.community_id, pieces)
      }

      const b = communityIdsByUser.get(m.user_id) ?? []
      b.push(m.community_id)
      communityIdsByUser.set(m.user_id, b)
    }

    const users: User[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      avatarSeed: p.avatar_seed,
      avatarUrl: p.avatar_url ?? undefined,
      communityIds: communityIdsByUser.get(p.id) ?? [],
    }))

    const communities = (communitiesRes.data ?? []).map((c) =>
      mapCommunity(
        c,
        memberIdsByCommunity.get(c.id) ?? [],
        adminIdsByCommunity.get(c.id) ?? [],
        piecesByCommunity.get(c.id) ?? {},
      ),
    )
    const tasks = (tasksRes.data ?? []).map(mapTask)
    const macroObjectives = (macroObjectivesRes.data ?? []).map(mapMacroObjective)
    const notifications = (notificationsRes.data ?? []).map(mapNotification)

    set({ users, communities, tasks, macroObjectives, notifications, myStats, dataLoading: false })
  },

  createCommunity: async (name, severity, type, boardEnabled = true) => {
    const { data, error } = await supabase.rpc('create_community', {
      _name: name,
      _type: type,
      _severity: severity,
      _board_enabled: boardEnabled,
    })
    if (error || !data) return null
    await get().refreshAll()
    return (data as { id: string }).id
  },

  setCommunityBoardEnabled: async (communityId, enabled) => {
    const { error } = await supabase.rpc('set_community_board_enabled', {
      _community_id: communityId,
      _enabled: enabled,
    })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  renameCommunity: async (communityId, name) => {
    const { error } = await supabase.rpc('rename_community', { _community_id: communityId, _name: name })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  joinCommunityWithCode: async (code) => {
    const { data, error } = await supabase.rpc('join_community_with_code', { _code: code })
    if (error || !data) return { error: 'Código de convite inválido.', communityName: null }
    await get().refreshAll()
    return { error: null, communityName: (data as { name: string }).name }
  },

  regenerateInviteCode: async (communityId) => {
    await supabase.rpc('regenerate_invite_code', { _community_id: communityId })
    await get().refreshAll()
  },

  deleteCommunity: async (communityId) => {
    await supabase.rpc('soft_delete_community', { _community_id: communityId })
    await get().refreshAll()
  },

  restoreCommunity: async (communityId) => {
    await supabase.rpc('restore_community', { _community_id: communityId })
    await get().refreshAll()
    await get().fetchTrash()
  },

  permanentlyDeleteCommunity: async (communityId) => {
    await supabase.from('communities').delete().eq('id', communityId)
    await get().fetchTrash()
  },

  setCommunityAdmin: async (communityId, userId, isAdmin) => {
    const { error } = await supabase.rpc('set_community_admin', {
      _community_id: communityId,
      _user_id: userId,
      _is_admin: isAdmin,
    })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  setCommunityPiece: async (communityId, pieceId, color) => {
    const { error } = await supabase.rpc('set_community_piece', {
      _community_id: communityId,
      _piece_id: pieceId,
      _color: color,
    })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  createMacroObjective: async (title, communityId) => {
    const authUser = get().authUser
    if (!authUser) return null
    const { data, error } = await supabase
      .from('macro_objectives')
      .insert({ title: title.trim(), community_id: communityId ?? null, user_id: authUser.id })
      .select()
      .single()
    if (error || !data) return null
    await get().refreshAll()
    return data.id as string
  },

  createTask: async ({ communityId, userId, macroObjectiveId, title, category, subtasks, deadline, urgency, complexity, scored, recurrence }) => {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        community_id: communityId ?? null,
        user_id: userId,
        macro_objective_id: macroObjectiveId,
        title,
        category,
        deadline,
        urgency,
        complexity,
        scored,
        recurrence: recurrence ?? null,
      })
      .select()
      .single()
    if (error) return error.message
    if (!task) return 'Não foi possível criar a tarefa.'

    const cleanSubtasks = subtasks.filter((s) => s.text.trim().length > 0)
    if (cleanSubtasks.length > 0) {
      const { error: subtaskError } = await supabase.from('subtasks').insert(
        cleanSubtasks.map((s, i) => ({
          task_id: task.id,
          text: s.text.trim(),
          position: i,
          due_date: s.dueDate ?? null,
        })),
      )
      if (subtaskError) return subtaskError.message
    }
    await get().refreshAll()
    return null
  },

  updateTask: async (taskId, { communityId, macroObjectiveId, title, category, subtasks, deadline, urgency, complexity, scored, recurrence }) => {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        community_id: communityId ?? null,
        macro_objective_id: macroObjectiveId,
        title,
        category,
        deadline,
        urgency,
        complexity,
        scored,
        recurrence: recurrence ?? null,
        expired: false,
        reminder_sent_at: null,
      })
      .eq('id', taskId)
    if (taskError) return taskError.message

    const cleanSubtasks = subtasks.filter((s) => s.text.trim().length > 0)
    const keepIds = cleanSubtasks.filter((s) => s.id).map((s) => s.id!)

    const { data: existing } = await supabase.from('subtasks').select('id').eq('task_id', taskId)
    const toDelete = (existing ?? []).map((s) => s.id).filter((id) => !keepIds.includes(id))
    if (toDelete.length > 0) {
      await supabase.from('subtasks').delete().in('id', toDelete)
    }

    const results = await Promise.all(
      cleanSubtasks.map((s, i) => {
        const text = s.text.trim()
        const dueDate = s.dueDate ?? null
        if (s.id) {
          return supabase.from('subtasks').update({ text, due_date: dueDate, position: i }).eq('id', s.id)
        }
        return supabase.from('subtasks').insert({ task_id: taskId, text, due_date: dueDate, position: i })
      }),
    )
    const subtaskError = results.find((r) => r.error)?.error
    if (subtaskError) return subtaskError.message

    await get().refreshAll()
    return null
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    const subtask = task?.subtasks.find((s) => s.id === subtaskId)
    if (!subtask) return
    await supabase.from('subtasks').update({ done: !subtask.done }).eq('id', subtaskId)
    await get().refreshAll()
  },

  setTaskStarted: async (taskId, started) => {
    const task = get().tasks.find((t) => t.id === taskId)
    await supabase
      .from('tasks')
      .update({ started, ...(started && !task?.startedAt && { started_at: new Date().toISOString() }) })
      .eq('id', taskId)
    await get().refreshAll()
  },

  completeTask: async (taskId, minutes) => {
    const task = get().tasks.find((t) => t.id === taskId)

    if (minutes?.subtasks) {
      await Promise.all(
        Object.entries(minutes.subtasks).map(([subtaskId, mins]) =>
          supabase.from('subtasks').update({ minutes_spent: mins }).eq('id', subtaskId),
        ),
      )
    }
    const totalMinutes = minutes?.subtasks
      ? Object.values(minutes.subtasks).reduce((sum, m) => sum + m, 0)
      : minutes?.direct

    await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        ...(totalMinutes !== undefined && { minutes_spent: totalMinutes }),
      })
      .eq('id', taskId)

    const authUser = get().authUser
    if (authUser && task) {
      await supabase.from('notifications').insert({
        user_id: authUser.id,
        task_id: taskId,
        type: 'success',
        message: `Parabéns! Você concluiu "${task.title}".`,
      })
      const fnName = import.meta.env.VITE_PUSH_FUNCTION_NAME || 'push-sweep'
      supabase.functions.invoke(fnName, { body: { type: 'completed', taskId } }).catch(() => {})

      if (task.recurrence) {
        await spawnNextOccurrence({
          communityId: task.communityId,
          userId: task.userId,
          macroObjectiveId: task.macroObjectiveId,
          title: task.title,
          category: task.category,
          deadline: task.deadline,
          urgency: task.urgency,
          complexity: task.complexity,
          scored: task.scored,
          recurrence: task.recurrence,
          subtasks: task.subtasks,
        })
      }
    }

    await get().refreshAll()
  },

  reopenTask: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    await supabase
      .from('tasks')
      .update({
        completed: false,
        completed_at: null,
        started: true,
        ...(!task?.startedAt && { started_at: new Date().toISOString() }),
      })
      .eq('id', taskId)
    await get().refreshAll()
  },

  deleteTask: async (taskId) => {
    await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId)
    await get().refreshAll()
  },

  restoreTask: async (taskId) => {
    await supabase.from('tasks').update({ deleted_at: null }).eq('id', taskId)
    await get().refreshAll()
    await get().fetchTrash()
  },

  permanentlyDeleteTask: async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    await get().fetchTrash()
  },

  fetchTrash: async () => {
    const authUser = get().authUser
    if (!authUser) return
    const [tasksRes, communitiesRes, membersRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, subtasks(*), macro_objectives(title)')
        .eq('user_id', authUser.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase.from('communities').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      supabase.from('community_members').select('*'),
    ])

    const members = membersRes.data ?? []
    const memberIdsByCommunity = new Map<string, string[]>()
    const adminIdsByCommunity = new Map<string, string[]>()
    for (const m of members) {
      const a = memberIdsByCommunity.get(m.community_id) ?? []
      a.push(m.user_id)
      memberIdsByCommunity.set(m.community_id, a)
      if (m.role === 'admin') {
        const admins = adminIdsByCommunity.get(m.community_id) ?? []
        admins.push(m.user_id)
        adminIdsByCommunity.set(m.community_id, admins)
      }
    }

    const trashedTasks = (tasksRes.data ?? []).map(mapTask)
    const trashedCommunities = (communitiesRes.data ?? [])
      .filter((c) => c.creator_id === authUser.id || authUser.role === 'admin')
      .map((c) => mapCommunity(c, memberIdsByCommunity.get(c.id) ?? [], adminIdsByCommunity.get(c.id) ?? [], {}))

    set({ trashedTasks, trashedCommunities })
  },

  assignTask: async (taskId, assigneeId) => {
    const { error } = await supabase.rpc('assign_task', { _task_id: taskId, _assignee_id: assigneeId })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  assignSubtask: async (subtaskId, assigneeId) => {
    const { error } = await supabase.rpc('assign_subtask', { _subtask_id: subtaskId, _assignee_id: assigneeId })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  setTaskBlocked: async (taskId, blocked, reason) => {
    const { error } = await supabase.rpc('set_task_blocked', { _task_id: taskId, _blocked: blocked, _reason: reason ?? null })
    if (error) return error.message
    await get().refreshAll()
    return null
  },

  rescheduleTask: async (taskId, deadline) => {
    await supabase.from('tasks').update({ deadline, reminder_sent_at: null, expired: false }).eq('id', taskId)
    await get().refreshAll()
  },

  checkExpirations: async () => {
    const authUser = get().authUser
    if (!authUser) return
    const nowIso = new Date().toISOString()
    const { data: toExpire } = await supabase
      .from('tasks')
      .select('id, title, urgency, complexity, scored, community_id, macro_objective_id, category, deadline, recurrence, subtasks(*)')
      .eq('user_id', authUser.id)
      .eq('completed', false)
      .eq('expired', false)
      .eq('blocked', false)
      .lt('deadline', nowIso)

    if (!toExpire || toExpire.length === 0) return

    await supabase
      .from('tasks')
      .update({ expired: true })
      .in(
        'id',
        toExpire.map((t) => t.id),
      )

    await supabase.from('notifications').insert(
      toExpire.map((t) => {
        const pts = URGENCY_POINTS[t.urgency as Severity]
        return {
          user_id: authUser.id,
          message: `Tarefa "${t.title}" expirou! Você perdeu ${pts} pt${pts > 1 ? 's' : ''} de negligência.`,
          type: 'penalty',
          task_id: t.id,
        }
      }),
    )

    await Promise.all(
      toExpire
        .filter((t) => t.recurrence)
        .map((t) =>
          spawnNextOccurrence({
            communityId: t.community_id ?? undefined,
            userId: authUser.id,
            macroObjectiveId: t.macro_objective_id,
            title: t.title,
            category: t.category,
            deadline: t.deadline,
            urgency: t.urgency as Severity,
            complexity: (t.complexity as Complexity) ?? 'media',
            scored: (t.scored as boolean | null) ?? true,
            recurrence: t.recurrence as Recurrence,
            subtasks: (t.subtasks ?? []).map(mapSubtask),
          }),
        ),
    )

    await get().refreshAll()
  },

  markNotificationRead: async (id) => {
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  },

  updateNotificationPreferences: async (prefs) => {
    const authUser = get().authUser
    if (!authUser) return
    set({ authUser: { ...authUser, ...prefs } })
    await supabase
      .from('profiles')
      .update({
        ...(prefs.notifyReminder !== undefined && { notify_reminder: prefs.notifyReminder }),
        ...(prefs.notifyExpired !== undefined && { notify_expired: prefs.notifyExpired }),
        ...(prefs.notifyCompleted !== undefined && { notify_completed: prefs.notifyCompleted }),
        ...(prefs.notifyOnlyUrgent !== undefined && { notify_only_urgent: prefs.notifyOnlyUrgent }),
        ...(prefs.notifyWeeklyDigest !== undefined && { notify_weekly_digest: prefs.notifyWeeklyDigest }),
      })
      .eq('id', authUser.id)
  },

  completeOnboarding: async () => {
    const authUser = get().authUser
    if (!authUser) return
    const now = new Date().toISOString()
    set({ authUser: { ...authUser, onboardingCompletedAt: now } })
    await supabase.from('profiles').update({ onboarding_completed_at: now }).eq('id', authUser.id)
  },

  fetchGlobalWall: async () => {
    const { data, error } = await supabase.rpc('global_wall')
    if (error || !data) return []
    return (data as Record<string, unknown>[]).map((row) => {
      const stats = mapProfileStatsRow(row)
      return {
        userId: stats.userId,
        name: stats.name,
        avatarSeed: stats.avatarSeed,
        avatarUrl: stats.avatarUrl,
        role: stats.role,
        lostPoints: stats.lostPoints,
        tasksExpired: stats.tasksExpired,
        subtasksMissed: stats.subtasksMissed,
        positivePoints: stats.positivePoints,
        personalPositivePoints: stats.personalPositivePoints,
        personalLostPoints: stats.personalLostPoints,
        personalTasksCompleted: stats.personalTasksCompleted,
        personalTasksExpired: stats.personalTasksExpired,
        tasksCompleted: stats.tasksCompleted,
        subtasksCompleted: stats.subtasksCompleted,
        communityCount: stats.communityCount,
      }
    })
  },

  fetchPublicProfile: async (userId) => {
    const { data, error } = await supabase.rpc('get_public_profile', { _user_id: userId })
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null
    const row = Array.isArray(data) ? data[0] : data
    return mapProfileStatsRow(row as Record<string, unknown>)
  },

  fetchCompetitionCommunityRankings: async () => {
    const { data, error } = await supabase.rpc('competition_community_rankings')
    if (error || !data) return []
    return (data as Record<string, unknown>[]).map((row) => ({
      communityId: row.community_id as string,
      name: row.name as string,
      memberCount: Number(row.member_count),
      tasksCompleted: Number(row.tasks_completed),
      subtasksCompleted: Number(row.subtasks_completed),
      leadTimeHours: row.lead_time_avg_hours == null ? undefined : Number(row.lead_time_avg_hours),
      cycleTimeHours: row.cycle_time_avg_hours == null ? undefined : Number(row.cycle_time_avg_hours),
    }))
  },

  fetchWorkCommunityRankings: async () => {
    const { data, error } = await supabase.rpc('work_community_rankings')
    if (error || !data) return []
    return (data as Record<string, unknown>[]).map((row) => ({
      communityId: row.community_id as string,
      name: row.name as string,
      memberCount: Number(row.member_count),
      tasksCompleted: Number(row.tasks_completed),
      subtasksCompleted: Number(row.subtasks_completed),
      leadTimeHours: row.lead_time_avg_hours == null ? undefined : Number(row.lead_time_avg_hours),
      cycleTimeHours: row.cycle_time_avg_hours == null ? undefined : Number(row.cycle_time_avg_hours),
    }))
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error?.message ?? null
  },

  updateName: async (name) => {
    const authUser = get().authUser
    if (!authUser) return 'Não autenticado.'
    const trimmed = name.trim()
    if (!trimmed) return 'Nome não pode ser vazio.'
    if (trimmed.length > 60) return 'Nome muito longo (máx. 60 caracteres).'
    if (containsOffensiveLanguage(trimmed)) return 'Esse nome contém uma palavra não permitida.'
    const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', authUser.id)
    if (error) return error.message.includes('OFFENSIVE_NAME') ? 'Esse nome contém uma palavra não permitida.' : error.message
    set({
      authUser: { ...authUser, name: trimmed },
      users: get().users.map((u) => (u.id === authUser.id ? { ...u, name: trimmed } : u)),
    })
    return null
  },

  uploadAvatar: async (file) => {
    const authUser = get().authUser
    if (!authUser) return { url: null, error: 'Não autenticado.' }
    const ext = file instanceof File ? (file.name.split('.').pop() ?? 'jpg') : 'jpg'
    const path = `${authUser.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError.message }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { error: updateError, data: updated } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', authUser.id)
      .select('id')
    if (updateError) return { url: null, error: updateError.message }
    if (!updated || updated.length === 0) {
      return { url: null, error: 'Perfil não encontrado — o upload da imagem funcionou, mas a atualização do perfil não afetou nenhuma linha.' }
    }

    set({
      authUser: { ...authUser, avatarUrl },
      users: get().users.map((u) => (u.id === authUser.id ? { ...u, avatarUrl } : u)),
    })
    return { url: avatarUrl, error: null }
  },

  removeAvatar: async () => {
    const authUser = get().authUser
    if (!authUser) return 'Não autenticado.'
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', authUser.id)
    if (error) return error.message

    set({
      authUser: { ...authUser, avatarUrl: undefined },
      users: get().users.map((u) => (u.id === authUser.id ? { ...u, avatarUrl: undefined } : u)),
    })
    return null
  },

  getUserById: (id) => get().users.find((u) => u.id === id),
  getCommunityById: (id) => get().communities.find((c) => c.id === id),
}))

async function loadAuthUser(userId: string, email: string) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (!profile) {
    useAppStore.setState({ authUser: null, authLoading: false })
    return
  }
  useAppStore.setState({
    authUser: {
      id: profile.id,
      email,
      name: profile.name,
      role: profile.role,
      avatarSeed: profile.avatar_seed,
      avatarUrl: profile.avatar_url ?? undefined,
      notifyReminder: profile.notify_reminder,
      notifyExpired: profile.notify_expired,
      notifyCompleted: profile.notify_completed,
      notifyOnlyUrgent: profile.notify_only_urgent,
      notifyWeeklyDigest: profile.notify_weekly_digest,
      onboardingCompletedAt: profile.onboarding_completed_at ?? undefined,
    },
    authLoading: false,
  })
  await useAppStore.getState().refreshAll()
  await useAppStore.getState().checkExpirations()
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    loadAuthUser(session.user.id, session.user.email ?? '')
  } else {
    useAppStore.setState({
      authUser: null,
      authLoading: false,
      users: [],
      communities: [],
      tasks: [],
      macroObjectives: [],
      notifications: [],
      onlineUserIds: new Set(),
      trashedTasks: [],
      trashedCommunities: [],
      levelMode: 'work',
    })
  }
})
