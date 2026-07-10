import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  AuthUser,
  Community,
  CommunityType,
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
  xp: number
  tasksCompleted: number
  subtasksCompleted: number
  communityCount: number
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
    xp: Number(row.xp),
    tasksCompleted: Number(row.tasks_completed),
    subtasksCompleted: Number(row.subtasks_completed),
    communityCount: Number(row.community_count),
  }
}

interface CreateTaskInput {
  communityId?: string
  userId: string
  macroObjective: string
  title: string
  category: string
  subtasks: { text: string; dueDate?: string }[]
  deadline: string
  urgency: Severity
  recurrence?: Recurrence
}

interface UpdateTaskInput {
  communityId?: string
  macroObjective: string
  title: string
  category: string
  subtasks: { id?: string; text: string; dueDate?: string }[]
  deadline: string
  urgency: Severity
  recurrence?: Recurrence
}

interface State {
  authUser: AuthUser | null
  authLoading: boolean
  dataLoading: boolean

  users: User[]
  communities: Community[]
  tasks: Task[]
  notifications: Notification[]
  myStats: PublicProfile | null

  // auth
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signInWithMicrosoft: () => Promise<void>
  signOut: () => Promise<void>

  refreshAll: () => Promise<void>

  // community actions
  createCommunity: (name: string, severity: Severity, type: CommunityType) => Promise<string | null>
  joinCommunityWithCode: (code: string) => Promise<{ error: string | null; communityName: string | null }>
  regenerateInviteCode: (communityId: string) => Promise<void>
  deleteCommunity: (communityId: string) => Promise<void>
  setCommunityAdmin: (communityId: string, userId: string, isAdmin: boolean) => Promise<string | null>

  // task actions
  createTask: (input: CreateTaskInput) => Promise<string | null>
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<string | null>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  setTaskStarted: (taskId: string, started: boolean) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  reopenTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  rescheduleTask: (taskId: string, deadline: string) => Promise<void>
  checkExpirations: () => Promise<void>

  // notifications
  markNotificationRead: (id: string) => Promise<void>
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>

  // global wall (calculado no servidor, não depende do cache local de tasks)
  fetchGlobalWall: () => Promise<GlobalWallEntry[]>
  fetchPublicProfile: (userId: string) => Promise<PublicProfile | null>

  // perfil
  updatePassword: (newPassword: string) => Promise<string | null>
  uploadAvatar: (file: File) => Promise<string | null>

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
  }
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    communityId: (row.community_id as string | null) ?? undefined,
    userId: row.user_id as string,
    macroObjective: row.macro_objective as string,
    title: row.title as string,
    category: row.category as string,
    subtasks: ((row.subtasks as Record<string, unknown>[] | null) ?? []).map(mapSubtask),
    deadline: row.deadline as string,
    urgency: row.urgency as Severity,
    started: row.started as boolean,
    completed: row.completed as boolean,
    completedAt: (row.completed_at as string | null) ?? undefined,
    expired: row.expired as boolean,
    recurrence: (row.recurrence as Recurrence | null) ?? undefined,
    createdAt: row.created_at as string,
  }
}

function mapCommunity(row: Record<string, unknown>, memberIds: string[], adminIds: string[]): Community {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as CommunityType,
    severity: row.severity as Severity,
    inviteCode: row.invite_code as string,
    memberIds,
    adminIds,
    creatorId: row.creator_id as string,
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
  macroObjective: string
  title: string
  category: string
  deadline: string
  urgency: Severity
  recurrence: Recurrence
  subtasks: SubTask[]
}) {
  const nextDeadline = nextRecurrenceDate(new Date(task.deadline), task.recurrence)
  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      community_id: task.communityId ?? null,
      user_id: task.userId,
      macro_objective: task.macroObjective,
      title: task.title,
      category: task.category,
      deadline: nextDeadline.toISOString(),
      urgency: task.urgency,
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
  notifications: [],
  myStats: null,

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

  refreshAll: async () => {
    const authUser = get().authUser
    if (!authUser) return
    set({ dataLoading: true })

    const [profilesRes, communitiesRes, membersRes, tasksRes, notificationsRes, myStats] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('communities').select('*'),
      supabase.from('community_members').select('*'),
      supabase
        .from('tasks')
        .select('*, subtasks(*)')
        .order('created_at', { ascending: false })
        .order('position', { foreignTable: 'subtasks', ascending: true }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      get().fetchPublicProfile(authUser.id),
    ])

    const members = membersRes.data ?? []
    const memberIdsByCommunity = new Map<string, string[]>()
    const adminIdsByCommunity = new Map<string, string[]>()
    const communityIdsByUser = new Map<string, string[]>()
    for (const m of members) {
      const a = memberIdsByCommunity.get(m.community_id) ?? []
      a.push(m.user_id)
      memberIdsByCommunity.set(m.community_id, a)

      if (m.role === 'admin') {
        const admins = adminIdsByCommunity.get(m.community_id) ?? []
        admins.push(m.user_id)
        adminIdsByCommunity.set(m.community_id, admins)
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
      mapCommunity(c, memberIdsByCommunity.get(c.id) ?? [], adminIdsByCommunity.get(c.id) ?? []),
    )
    const tasks = (tasksRes.data ?? []).map(mapTask)
    const notifications = (notificationsRes.data ?? []).map(mapNotification)

    set({ users, communities, tasks, notifications, myStats, dataLoading: false })
  },

  createCommunity: async (name, severity, type) => {
    const { data, error } = await supabase.rpc('create_community', { _name: name, _type: type, _severity: severity })
    if (error || !data) return null
    await get().refreshAll()
    return (data as { id: string }).id
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
    await supabase.from('communities').delete().eq('id', communityId)
    await get().refreshAll()
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

  createTask: async ({ communityId, userId, macroObjective, title, category, subtasks, deadline, urgency, recurrence }) => {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        community_id: communityId ?? null,
        user_id: userId,
        macro_objective: macroObjective,
        title,
        category,
        deadline,
        urgency,
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

  updateTask: async (taskId, { communityId, macroObjective, title, category, subtasks, deadline, urgency, recurrence }) => {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        community_id: communityId ?? null,
        macro_objective: macroObjective,
        title,
        category,
        deadline,
        urgency,
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
    await supabase.from('tasks').update({ started }).eq('id', taskId)
    await get().refreshAll()
  },

  completeTask: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', taskId)

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
          macroObjective: task.macroObjective,
          title: task.title,
          category: task.category,
          deadline: task.deadline,
          urgency: task.urgency,
          recurrence: task.recurrence,
          subtasks: task.subtasks,
        })
      }
    }

    await get().refreshAll()
  },

  reopenTask: async (taskId) => {
    await supabase.from('tasks').update({ completed: false, completed_at: null, started: true }).eq('id', taskId)
    await get().refreshAll()
  },

  deleteTask: async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    await get().refreshAll()
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
      .select('id, title, urgency, community_id, macro_objective, category, deadline, recurrence, subtasks(*)')
      .eq('user_id', authUser.id)
      .eq('completed', false)
      .eq('expired', false)
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
            macroObjective: t.macro_objective,
            title: t.title,
            category: t.category,
            deadline: t.deadline,
            urgency: t.urgency as Severity,
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
      })
      .eq('id', authUser.id)
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
        xp: stats.xp,
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

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error?.message ?? null
  },

  uploadAvatar: async (file) => {
    const authUser = get().authUser
    if (!authUser) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${authUser.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) return null

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', authUser.id)
    if (updateError) return null

    set({ authUser: { ...authUser, avatarUrl } })
    return avatarUrl
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
      notifications: [],
    })
  }
})
