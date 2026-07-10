// Edge Function agendada via pg_cron: varre tarefas de TODOS os usuários (não só
// quem está com o app aberto) para (1) expirar tarefas vencidas e (2) avisar sobre
// prazos próximos, gravando notificações e disparando Web Push para cada inscrição
// — respeitando as preferências de notificação de cada pessoa. Também atende
// chamadas diretas do cliente (POST { type: "completed", taskId }) para parabenizar
// a conclusão de uma tarefa.
//
// Deploy: supabase functions deploy push-sweep
// Secrets necessários (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente
// no ambiente da função.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const REMINDER_WINDOW_HOURS = 6
const URGENT_LEVELS = ['alta', 'critica']

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey)

const URGENCY_POINTS: Record<string, number> = { baixa: 1, media: 3, alta: 5, critica: 10 }

interface NotifyPrefs {
  notify_reminder: boolean
  notify_expired: boolean
  notify_completed: boolean
  notify_only_urgent: boolean
}

interface SubtaskRow {
  text: string
}

interface TaskRow {
  id: string
  title: string
  urgency: string
  user_id: string
  deadline: string
  community_id: string | null
  macro_objective: string
  category: string
  recurrence: string | null
  subtasks: SubtaskRow[] | null
  profiles: NotifyPrefs | null
}

function addInterval(date: Date, recurrence: string): Date {
  const next = new Date(date)
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1)
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

function nextRecurrenceDate(originalDeadline: Date, recurrence: string, from = new Date()): Date {
  let next = addInterval(originalDeadline, recurrence)
  while (next.getTime() <= from.getTime()) {
    next = addInterval(next, recurrence)
  }
  return next
}

async function spawnNextOccurrence(task: TaskRow) {
  if (!task.recurrence) return
  const nextDeadline = nextRecurrenceDate(new Date(task.deadline), task.recurrence)
  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert({
      community_id: task.community_id,
      user_id: task.user_id,
      macro_objective: task.macro_objective,
      title: task.title,
      category: task.category,
      deadline: nextDeadline.toISOString(),
      urgency: task.urgency,
      recurrence: task.recurrence,
    })
    .select()
    .single()
  if (error || !newTask) return

  const subtasks = task.subtasks ?? []
  if (subtasks.length > 0) {
    await supabase.from('subtasks').insert(
      subtasks.map((s, i) => ({ task_id: newTask.id, text: s.text, position: i })),
    )
  }
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  if (!subs || subs.length === 0) return

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )
}

async function handleCompletion(req: Request, taskId: string): Promise<Response> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await callerClient.auth.getUser()
  if (!userData?.user) return new Response('unauthorized', { status: 401 })

  const { data: task } = await supabase.from('tasks').select('id, title, user_id').eq('id', taskId).maybeSingle()
  if (!task || task.user_id !== userData.user.id) return new Response('forbidden', { status: 403 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_completed')
    .eq('id', task.user_id)
    .maybeSingle()
  if (profile?.notify_completed === false) return new Response('ok', { status: 200 })

  await sendPushToUser(task.user_id, {
    title: 'Tarefa concluída! 🎉',
    body: `Parabéns por concluir "${task.title}"!`,
    url: '/day',
    tag: `completed-${task.id}`,
  })
  return new Response('ok', { status: 200 })
}

async function handleSweep(): Promise<Response> {
  const now = new Date()
  const nowIso = now.toISOString()

  // 1) Expira tarefas vencidas (de todo mundo, não só de quem está online).
  const { data: toExpire } = await supabase
    .from('tasks')
    .select(
      'id, title, urgency, user_id, deadline, community_id, macro_objective, category, recurrence, subtasks(text), profiles(notify_expired)',
    )
    .eq('completed', false)
    .eq('expired', false)
    .lt('deadline', nowIso)

  const expired = (toExpire ?? []) as unknown as TaskRow[]

  if (expired.length > 0) {
    await supabase
      .from('tasks')
      .update({ expired: true })
      .in('id', expired.map((t) => t.id))

    await supabase.from('notifications').insert(
      expired.map((t) => {
        const pts = URGENCY_POINTS[t.urgency] ?? 0
        return {
          user_id: t.user_id,
          task_id: t.id,
          type: 'penalty',
          message: `Tarefa "${t.title}" expirou! Você perdeu ${pts} pt${pts > 1 ? 's' : ''} de negligência.`,
        }
      }),
    )

    await Promise.all(
      expired
        .filter((t) => t.profiles?.notify_expired !== false)
        .map((t) => {
          const pts = URGENCY_POINTS[t.urgency] ?? 0
          return sendPushToUser(t.user_id, {
            title: 'Prazo perdido ⚠️',
            body: `"${t.title}" expirou. -${pts} pt${pts > 1 ? 's' : ''} no Muro da Procrastinação.`,
            url: '/day',
            tag: `expired-${t.id}`,
          })
        }),
    )

    await Promise.all(expired.filter((t) => t.recurrence).map((t) => spawnNextOccurrence(t)))
  }

  // 2) Avisa sobre prazos próximos (uma vez só por tarefa, controlado por reminder_sent_at).
  const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3600_000).toISOString()
  const { data: toRemind } = await supabase
    .from('tasks')
    .select('id, title, urgency, user_id, deadline, profiles(notify_reminder, notify_only_urgent)')
    .eq('completed', false)
    .eq('expired', false)
    .is('reminder_sent_at', null)
    .lte('deadline', reminderThreshold)
    .gt('deadline', nowIso)

  const reminders = (toRemind ?? []) as unknown as TaskRow[]

  if (reminders.length > 0) {
    await supabase
      .from('tasks')
      .update({ reminder_sent_at: nowIso })
      .in('id', reminders.map((t) => t.id))

    await supabase.from('notifications').insert(
      reminders.map((t) => ({
        user_id: t.user_id,
        task_id: t.id,
        type: 'warning',
        message: `Prazo de "${t.title}" está chegando perto!`,
      })),
    )

    await Promise.all(
      reminders
        .filter((t) => {
          const prefs = t.profiles
          if (!prefs || prefs.notify_reminder === false) return false
          if (prefs.notify_only_urgent && !URGENT_LEVELS.includes(t.urgency)) return false
          return true
        })
        .map((t) =>
          sendPushToUser(t.user_id, {
            title: 'Prazo chegando ⏰',
            body: `"${t.title}" vence em breve.`,
            url: '/day',
            tag: `reminder-${t.id}`,
          }),
        ),
    )
  }

  return new Response(
    JSON.stringify({ expired: expired.length, reminders: reminders.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'POST') {
    let body: { type?: string; taskId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // corpo vazio (ex: chamada do pg_cron) -> segue para a varredura normal
    }
    if (body.type === 'completed' && body.taskId) {
      return handleCompletion(req, body.taskId)
    }
  }
  return handleSweep()
})
