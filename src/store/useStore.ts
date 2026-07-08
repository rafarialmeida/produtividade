import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Community, CommunityType, Notification, Severity, SubTask, Task, User } from '../types'
import { URGENCY_POINTS } from '../types'

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

interface State {
  users: User[]
  communities: Community[]
  tasks: Task[]
  notifications: Notification[]
  currentUserId: string | null

  hydrated: boolean

  // auth
  loginAdmin: (email: string, password: string) => User | null
  loginMember: (email: string) => User | null
  joinWithInviteCode: (name: string, email: string, code: string) => User | null
  joinCommunityWithCode: (userId: string, code: string) => Community | null
  logout: () => void

  // community actions
  createCommunity: (name: string, severity: Severity, type: CommunityType) => Community
  addFictionalMember: (communityId: string, name: string) => User
  regenerateInviteCode: (communityId: string) => void
  deleteCommunity: (communityId: string) => void

  // task actions
  createTask: (input: {
    communityId: string
    userId: string
    macroObjective: string
    title: string
    subtasks: string[]
    deadline: string
    urgency: Severity
  }) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  completeTask: (taskId: string) => void
  deleteTask: (taskId: string) => void
  checkExpirations: () => void

  // notifications
  markNotificationRead: (id: string) => void
  clearNotifications: (userId: string) => void

  // selectors helpers
  getUserById: (id: string) => User | undefined
  getCommunityById: (id: string) => Community | undefined
  getLostPoints: (userId: string, communityId: string) => number
}

const now = new Date()
const inDays = (d: number, h = 0) => new Date(now.getTime() + d * 86400000 + h * 3600000).toISOString()
const agoHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()

const seedAdmin: User = {
  id: 'admin-1',
  name: 'Rafael Almeida',
  email: 'admin@failsync.com',
  password: 'senha123',
  role: 'admin',
  communityIds: ['comm-1', 'comm-2'],
  avatarSeed: 'admin',
}

const seedMembers: User[] = [
  { id: 'mem-1', name: 'Ana Souza', email: 'ana@failsync.com', role: 'member', communityIds: ['comm-1', 'comm-2'], avatarSeed: 'ana' },
  { id: 'mem-2', name: 'Bruno Lima', email: 'bruno@failsync.com', role: 'member', communityIds: ['comm-1'], avatarSeed: 'bruno' },
  { id: 'mem-3', name: 'Carla Mendes', email: 'carla@failsync.com', role: 'member', communityIds: ['comm-1'], avatarSeed: 'carla' },
  { id: 'mem-4', name: 'Diego Torres', email: 'diego@failsync.com', role: 'member', communityIds: ['comm-1', 'comm-2'], avatarSeed: 'diego' },
]

const seedCommunity: Community = {
  id: 'comm-1',
  name: 'Squad Alpha — Lançamento Q3',
  type: 'trabalho',
  severity: 'alta',
  inviteCode: inviteCode(),
  memberIds: ['admin-1', 'mem-1', 'mem-2', 'mem-3', 'mem-4'],
  creatorId: 'admin-1',
  createdAt: agoHours(240),
}

const seedCompetitionCommunity: Community = {
  id: 'comm-2',
  name: 'Racha de Produtividade — Amigos',
  type: 'competicao',
  severity: 'media',
  inviteCode: inviteCode(),
  memberIds: ['admin-1', 'mem-1', 'mem-4'],
  creatorId: 'mem-1',
  createdAt: agoHours(120),
}

function seedSubtasks(texts: string[]): SubTask[] {
  return texts.map((t) => ({ id: uid('sub'), text: t, done: false }))
}

const seedTasks: Task[] = [
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-1',
    macroObjective: 'Lançamento Q3 do produto',
    title: 'Finalizar landing page de vendas',
    subtasks: seedSubtasks(['Escrever copy', 'Ajustar layout mobile', 'Revisar SEO']),
    deadline: agoHours(30),
    urgency: 'alta',
    completed: false,
    expired: true,
    createdAt: agoHours(96),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-2',
    macroObjective: 'Lançamento Q3 do produto',
    title: 'Configurar pipeline de CI/CD',
    subtasks: seedSubtasks(['Criar workflow', 'Testar deploy staging']),
    deadline: agoHours(80),
    urgency: 'critica',
    completed: false,
    expired: true,
    createdAt: agoHours(150),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-2',
    macroObjective: 'Retenção de clientes',
    title: 'Responder tickets pendentes',
    subtasks: seedSubtasks(['Triar fila', 'Responder top 10']),
    deadline: agoHours(10),
    urgency: 'media',
    completed: false,
    expired: true,
    createdAt: agoHours(60),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-3',
    macroObjective: 'Retenção de clientes',
    title: 'Atualizar documentação da API',
    subtasks: seedSubtasks(['Revisar endpoints', 'Publicar changelog']),
    deadline: agoHours(5),
    urgency: 'baixa',
    completed: false,
    expired: true,
    createdAt: agoHours(48),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'admin-1',
    macroObjective: 'Lançamento Q3 do produto',
    title: 'Preparar apresentação para investidores',
    subtasks: seedSubtasks(['Montar slides', 'Revisar métricas', 'Ensaiar pitch']),
    deadline: inDays(2),
    urgency: 'critica',
    completed: false,
    expired: false,
    createdAt: agoHours(20),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-1',
    macroObjective: 'Lançamento Q3 do produto',
    title: 'Revisar contrato com fornecedor',
    subtasks: seedSubtasks(['Ler cláusulas', 'Marcar reunião']),
    deadline: inDays(0, 3),
    urgency: 'media',
    completed: false,
    expired: false,
    createdAt: agoHours(10),
  },
  {
    id: uid('task'),
    communityId: 'comm-1',
    userId: 'mem-4',
    macroObjective: 'Retenção de clientes',
    title: 'Criar pesquisa de satisfação',
    subtasks: seedSubtasks(['Definir perguntas', 'Configurar formulário']).map((s) => ({ ...s, done: true })),
    deadline: inDays(5),
    urgency: 'baixa',
    completed: true,
    completedAt: agoHours(2),
    expired: false,
    createdAt: agoHours(72),
  },
  {
    id: uid('task'),
    communityId: 'comm-2',
    userId: 'mem-4',
    macroObjective: 'Meta pessoal: rotina de estudos',
    title: 'Terminar curso de inglês — módulo 3',
    subtasks: seedSubtasks(['Assistir aulas', 'Fazer exercícios', 'Fazer prova do módulo']),
    deadline: agoHours(20),
    urgency: 'critica',
    completed: false,
    expired: true,
    createdAt: agoHours(90),
  },
  {
    id: uid('task'),
    communityId: 'comm-2',
    userId: 'mem-1',
    macroObjective: 'Meta pessoal: saúde',
    title: 'Treinar 4x nesta semana',
    subtasks: seedSubtasks(['Treino de pernas', 'Treino de costas', 'Corrida 5km']),
    deadline: agoHours(6),
    urgency: 'media',
    completed: false,
    expired: true,
    createdAt: agoHours(50),
  },
  {
    id: uid('task'),
    communityId: 'comm-2',
    userId: 'admin-1',
    macroObjective: 'Meta pessoal: leitura',
    title: 'Ler 2 capítulos do livro da vez',
    subtasks: seedSubtasks(['Capítulo 5', 'Capítulo 6']),
    deadline: inDays(1),
    urgency: 'baixa',
    completed: false,
    expired: false,
    createdAt: agoHours(15),
  },
]

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      users: [seedAdmin, ...seedMembers],
      communities: [seedCommunity, seedCompetitionCommunity],
      tasks: seedTasks,
      notifications: [],
      currentUserId: null,
      hydrated: false,

      loginAdmin: (email, password) => {
        const user = get().users.find(
          (u) => u.role === 'admin' && u.email.toLowerCase() === email.toLowerCase() && u.password === password,
        )
        if (user) set({ currentUserId: user.id })
        return user ?? null
      },

      loginMember: (email) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (user) set({ currentUserId: user.id })
        return user ?? null
      },

      joinWithInviteCode: (name, email, code) => {
        const community = get().communities.find((c) => c.inviteCode.toUpperCase() === code.toUpperCase())
        if (!community) return null
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (existing) {
          if (!existing.communityIds.includes(community.id)) {
            set((s) => ({
              users: s.users.map((u) => (u.id === existing.id ? { ...u, communityIds: [...u.communityIds, community.id] } : u)),
              communities: s.communities.map((c) => (c.id === community.id ? { ...c, memberIds: [...c.memberIds, existing.id] } : c)),
            }))
          }
          set({ currentUserId: existing.id })
          return existing
        }
        const newUser: User = {
          id: uid('mem'),
          name,
          email,
          role: 'member',
          communityIds: [community.id],
          avatarSeed: name,
        }
        set((s) => ({
          users: [...s.users, newUser],
          communities: s.communities.map((c) => (c.id === community.id ? { ...c, memberIds: [...c.memberIds, newUser.id] } : c)),
          currentUserId: newUser.id,
        }))
        return newUser
      },

      joinCommunityWithCode: (userId, code) => {
        const community = get().communities.find((c) => c.inviteCode.toUpperCase() === code.toUpperCase())
        if (!community) return null
        if (!community.memberIds.includes(userId)) {
          set((s) => ({
            users: s.users.map((u) => (u.id === userId ? { ...u, communityIds: [...u.communityIds, community.id] } : u)),
            communities: s.communities.map((c) =>
              c.id === community.id ? { ...c, memberIds: [...c.memberIds, userId] } : c,
            ),
          }))
        }
        return community
      },

      logout: () => set({ currentUserId: null }),

      createCommunity: (name, severity, type) => {
        const creatorId = get().currentUserId ?? seedAdmin.id
        const community: Community = {
          id: uid('comm'),
          name,
          type,
          severity,
          inviteCode: inviteCode(),
          memberIds: [creatorId],
          creatorId,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          communities: [...s.communities, community],
          users: s.users.map((u) => (u.id === creatorId ? { ...u, communityIds: [...u.communityIds, community.id] } : u)),
        }))
        return community
      },

      addFictionalMember: (communityId, name) => {
        const newUser: User = {
          id: uid('mem'),
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@failsync.com`,
          role: 'member',
          communityIds: [communityId],
          avatarSeed: name,
        }
        set((s) => ({
          users: [...s.users, newUser],
          communities: s.communities.map((c) =>
            c.id === communityId ? { ...c, memberIds: [...c.memberIds, newUser.id] } : c,
          ),
        }))
        return newUser
      },

      regenerateInviteCode: (communityId) => {
        set((s) => ({
          communities: s.communities.map((c) => (c.id === communityId ? { ...c, inviteCode: inviteCode() } : c)),
        }))
      },

      deleteCommunity: (communityId) => {
        set((s) => ({
          communities: s.communities.filter((c) => c.id !== communityId),
          tasks: s.tasks.filter((t) => t.communityId !== communityId),
          users: s.users.map((u) => ({ ...u, communityIds: u.communityIds.filter((id) => id !== communityId) })),
        }))
      },

      createTask: ({ communityId, userId, macroObjective, title, subtasks, deadline, urgency }) => {
        const task: Task = {
          id: uid('task'),
          communityId,
          userId,
          macroObjective,
          title,
          subtasks: seedSubtasks(subtasks),
          deadline,
          urgency,
          completed: false,
          expired: false,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
      },

      toggleSubtask: (taskId, subtaskId) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st)) }
              : t,
          ),
        }))
      },

      completeTask: (taskId) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t,
          ),
        }))
      },

      deleteTask: (taskId) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }))
      },

      checkExpirations: () => {
        const nowTs = Date.now()
        const toPenalize: Task[] = []
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (!t.completed && !t.expired && new Date(t.deadline).getTime() < nowTs) {
              toPenalize.push(t)
              return { ...t, expired: true }
            }
            return t
          }),
        }))
        if (toPenalize.length === 0) return
        const newNotifications: Notification[] = toPenalize.map((t) => ({
          id: uid('notif'),
          userId: t.userId,
          message: `Tarefa "${t.title}" expirou! Você perdeu ${URGENCY_POINTS[t.urgency]} pt${URGENCY_POINTS[t.urgency] > 1 ? 's' : ''} de negligência.`,
          type: 'penalty',
          createdAt: new Date().toISOString(),
          read: false,
        }))
        set((s) => ({ notifications: [...newNotifications, ...s.notifications] }))
      },

      markNotificationRead: (id) => {
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
      },

      clearNotifications: (userId) => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.userId !== userId) }))
      },

      getUserById: (id) => get().users.find((u) => u.id === id),
      getCommunityById: (id) => get().communities.find((c) => c.id === id),
      getLostPoints: (userId, communityId) => {
        return get()
          .tasks.filter((t) => t.userId === userId && t.communityId === communityId && t.expired && !t.completed)
          .reduce((sum, t) => sum + URGENCY_POINTS[t.urgency], 0)
      },
    }),
    {
      name: 'failsync-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as { communities?: Community[] } | undefined
        if (state?.communities) {
          state.communities = state.communities.map((c) => ({
            ...c,
            type: c.type ?? 'trabalho',
            creatorId: c.creatorId ?? c.memberIds?.[0] ?? seedAdmin.id,
          }))
        }
        return state
      },
    },
  ),
)

function finishHydration() {
  useAppStore.getState().checkExpirations()
  useAppStore.setState({ hydrated: true })
}

if (useAppStore.persist.hasHydrated()) {
  finishHydration()
} else {
  useAppStore.persist.onFinishHydration(finishHydration)
}
