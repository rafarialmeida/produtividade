// Edge Function agendada via pg_cron: varre tarefas de TODOS os usuários (não só
// quem está com o app aberto) para (1) expirar tarefas vencidas e (2) avisar sobre
// prazos próximos, gravando notificações e disparando Web Push para cada inscrição.
//
// Deploy: supabase functions deploy push-sweep
// Secrets necessários (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente no ambiente da função.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const REMINDER_WINDOW_HOURS = 6

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey)

const URGENCY_POINTS: Record<string, number> = { baixa: 1, media: 3, alta: 5, critica: 10 }

interface TaskRow {
  id: string
  title: string
  urgency: string
  user_id: string
  deadline: string
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

Deno.serve(async () => {
  const now = new Date()
  const nowIso = now.toISOString()

  // 1) Expira tarefas vencidas (de todo mundo, não só de quem está online).
  const { data: toExpire } = await supabase
    .from('tasks')
    .select('id, title, urgency, user_id, deadline')
    .eq('completed', false)
    .eq('expired', false)
    .lt('deadline', nowIso)

  const expired = (toExpire ?? []) as TaskRow[]

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
      expired.map((t) => {
        const pts = URGENCY_POINTS[t.urgency] ?? 0
        return sendPushToUser(t.user_id, {
          title: 'Prazo perdido ⚠️',
          body: `"${t.title}" expirou. -${pts} pt${pts > 1 ? 's' : ''} no Muro da Procrastinação.`,
          url: '/day',
          tag: `expired-${t.id}`,
        })
      }),
    )
  }

  // 2) Avisa sobre prazos próximos (uma vez só por tarefa, controlado por reminder_sent_at).
  const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3600_000).toISOString()
  const { data: toRemind } = await supabase
    .from('tasks')
    .select('id, title, urgency, user_id, deadline')
    .eq('completed', false)
    .eq('expired', false)
    .is('reminder_sent_at', null)
    .lte('deadline', reminderThreshold)
    .gt('deadline', nowIso)

  const reminders = (toRemind ?? []) as TaskRow[]

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
      reminders.map((t) =>
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
})
