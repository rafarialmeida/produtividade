import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { AuthUser, Community, CommunityType, Notification, Severity, SubTask, Task, User } from '../types'
import { URGENCY_POINTS } from '../types'

export interface GlobalWallEntry {
  userId: string
  name: string
  avatarSeed: string
  role: string
  lostPoints: number
  expiredCount: number
  communityCount: number
}

interface CreateTaskInput {
  communityId?: string
  userId: string
  macroObjective: string
  title: string
  category: string
  subtasks: string[]
  deadline: string
  urgency: Severity
}

interface State {
  authUser: AuthUser | null
  authLoading: boolean
  dataLoading: boolean

  users: User[]
  communities: Community[]
  tasks: Task[]
  notifications: Notification[]

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

  // task actions
  createTask: (input: CreateTaskInput) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  setTaskStarted: (taskId: string, started: boolean) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  rescheduleTask: (taskId: string, deadline: string) => Promise<void>
  checkExpirations: () => Promise<void>

  // notifications
  markNotificationRead: (id: string) => Promise<void>

  // global wall (calculado no servidor, não depende do cache local de tasks)
  fetchGlobalWall: () => Promise<GlobalWallEntry[]>

  // selectors
  getUserById: (id: string) => User | undefined
  getCommunityById: (id: string | undefined) => Community | undefined
}

function mapSubtask(row: Record<string, unknown>): SubTask {
  return { id: row.id as string, text: row.text as string, done: row.done as boolean }
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
    createdAt: row.created_at as string,
  }
}

function mapCommunity(row: Record<string, unknown>, memberIds: string[]): Community {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as CommunityType,
    severity: row.severity as Severity,
    inviteCode: row.invite_code as string,
    memberIds,
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
    createdAt: row.created_at as string,
    read: row.read as boolean,
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
    if (!get().authUser) return
    set({ dataLoading: true })

    const [profilesRes, communitiesRes, membersRes, tasksRes, notificationsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('communities').select('*'),
      supabase.from('community_members').select('*'),
      supabase.from('tasks').select('*, subtasks(*)').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ])

    const members = membersRes.data ?? []
    const memberIdsByCommunity = new Map<string, string[]>()
    const communityIdsByUser = new Map<string, string[]>()
    for (const m of members) {
      const a = memberIdsByCommunity.get(m.community_id) ?? []
      a.push(m.user_id)
      memberIdsByCommunity.set(m.community_id, a)

      const b = communityIdsByUser.get(m.user_id) ?? []
      b.push(m.community_id)
      communityIdsByUser.set(m.user_id, b)
    }

    const users: User[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      avatarSeed: p.avatar_seed,
      communityIds: communityIdsByUser.get(p.id) ?? [],
    }))

    const communities = (communitiesRes.data ?? []).map((c) => mapCommunity(c, memberIdsByCommunity.get(c.id) ?? []))
    const tasks = (tasksRes.data ?? []).map(mapTask)
    const notifications = (notificationsRes.data ?? []).map(mapNotification)

    set({ users, communities, tasks, notifications, dataLoading: false })
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

  createTask: async ({ communityId, userId, macroObjective, title, category, subtasks, deadline, urgency }) => {
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
      })
      .select()
      .single()
    if (error || !task) return

    const cleanSubtasks = subtasks.filter(Boolean)
    if (cleanSubtasks.length > 0) {
      await supabase.from('subtasks').insert(cleanSubtasks.map((text, i) => ({ task_id: task.id, text, position: i })))
    }
    await get().refreshAll()
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
    await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', taskId)
    await get().refreshAll()
  },

  deleteTask: async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    await get().refreshAll()
  },

  rescheduleTask: async (taskId, deadline) => {
    await supabase.from('tasks').update({ deadline }).eq('id', taskId)
    await get().refreshAll()
  },

  checkExpirations: async () => {
    const authUser = get().authUser
    if (!authUser) return
    const nowIso = new Date().toISOString()
    const { data: toExpire } = await supabase
      .from('tasks')
      .select('id, title, urgency')
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
        }
      }),
    )

    await get().refreshAll()
  },

  markNotificationRead: async (id) => {
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  },

  fetchGlobalWall: async () => {
    const { data, error } = await supabase.rpc('global_wall')
    if (error || !data) return []
    return (data as Record<string, unknown>[]).map((row) => ({
      userId: row.user_id as string,
      name: row.name as string,
      avatarSeed: row.avatar_seed as string,
      role: row.role as string,
      lostPoints: Number(row.lost_points),
      expiredCount: Number(row.expired_count),
      communityCount: Number(row.community_count),
    }))
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
    authUser: { id: profile.id, email, name: profile.name, role: profile.role, avatarSeed: profile.avatar_seed },
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
