// Edge Function agendada semanalmente via pg_cron: monta e envia o resumo
// semanal de cada usuário ativo (tarefas concluídas essa semana vs semana
// passada, pontos ganhos e posição no ranking individual do Muro Global) —
// grava uma notificação in-app para todo mundo e dispara Web Push só para
// quem tem a preferência notify_weekly_digest ativada.
//
// Deploy: supabase functions deploy weekly-digest
// Usa os mesmos secrets já configurados para o push-sweep (VAPID_*),
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey)

interface DigestRow {
  user_id: string
  tasks_this_week: number
  tasks_last_week: number
  points_this_week: number
  points_last_week: number
  global_rank: number | null
  total_ranked: number | null
}

function mondayTag(): string {
  const now = new Date()
  const daysSinceMonday = (now.getUTCDay() + 6) % 7
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday)
  return monday.toISOString().slice(0, 10)
}

function buildMessage(row: DigestRow): string {
  const { tasks_this_week, tasks_last_week, points_this_week, global_rank, total_ranked } = row
  const trend = tasks_this_week > tasks_last_week ? '📈' : tasks_this_week < tasks_last_week ? '📉' : '➡️'
  let msg = `${trend} Essa semana você concluiu ${tasks_this_week} tarefa${tasks_this_week !== 1 ? 's' : ''} (${tasks_last_week} na semana passada), ganhando ${points_this_week} pt${points_this_week !== 1 ? 's' : ''}.`
  if (global_rank && total_ranked) {
    msg += ` Você está em ${global_rank}º lugar de ${total_ranked} no Muro Global.`
  }
  return msg
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
  const { data: rows } = await supabase.rpc('weekly_digest_stats')
  const digestRows = (rows ?? []) as DigestRow[]
  const active = digestRows.filter((r) => r.tasks_this_week > 0 || r.tasks_last_week > 0)

  if (active.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, notify_weekly_digest')
    .in('id', active.map((r) => r.user_id))
  const digestEnabledById = new Map((profiles ?? []).map((p) => [p.id, p.notify_weekly_digest]))

  await supabase.from('notifications').insert(
    active.map((row) => ({ user_id: row.user_id, type: 'info', message: buildMessage(row) })),
  )

  const weekTag = mondayTag()
  const toPush = active.filter((row) => digestEnabledById.get(row.user_id) !== false)

  await Promise.all(
    toPush.map((row) =>
      sendPushToUser(row.user_id, {
        title: 'Resumo da semana 📊',
        body: buildMessage(row),
        url: '/global-wall',
        tag: `weekly-digest-${weekTag}`,
      }),
    ),
  )

  return new Response(
    JSON.stringify({ sent: toPush.length, total: active.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
