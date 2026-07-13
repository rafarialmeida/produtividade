-- Resumo semanal (push + notificação in-app) e tutorial de boas-vindas para
-- novos usuários. Rode isso no SQL Editor do seu projeto Supabase.

-- Preferência de receber o resumo semanal por push (a notificação in-app é
-- sempre criada, igual ao padrão já usado para prazo/expiração).
alter table public.profiles add column if not exists notify_weekly_digest boolean not null default true;

-- Marca quando a pessoa terminou (ou pulou) o tutorial de boas-vindas. Perfis
-- existentes são marcados como já tendo visto — só contas novas (criadas
-- depois desta migration) começam com essa coluna nula e veem o tutorial.
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
update public.profiles set onboarding_completed_at = now() where onboarding_completed_at is null;

revoke update on public.profiles from authenticated;
grant update (
  name, avatar_seed, avatar_url,
  notify_reminder, notify_expired, notify_completed, notify_only_urgent, notify_weekly_digest,
  onboarding_completed_at
) on public.profiles to authenticated;

-- Estatísticas semanais por usuário: tarefas concluídas e pontos ganhos essa
-- semana vs a semana passada (tarefa + subtarefas, creditadas a quem
-- executou, ponderadas por complexidade, só entregas pontuadas), mais a
-- posição atual no ranking individual do Muro Global (mesmo critério de
-- personal_positive_points usado lá, só entre quem já está em pelo menos 1
-- comunidade). Usada pela Edge Function "weekly-digest".
create or replace function public.weekly_digest_stats()
returns table (
  user_id uuid,
  tasks_this_week bigint,
  tasks_last_week bigint,
  points_this_week numeric,
  points_last_week numeric,
  global_rank bigint,
  total_ranked bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with task_info as (
    select
      t.id,
      t.user_id,
      t.completed_at,
      t.scored,
      case t.complexity
        when 'baixa' then 1
        when 'media' then 1.5
        when 'alta' then 2
        when 'critica' then 3
        else 1
      end as complexity_mult
    from public.tasks t
    where t.completed and t.completed_at is not null
  ),
  task_weekly as (
    select
      user_id,
      count(*) filter (where completed_at >= date_trunc('week', now())) as tasks_this_week,
      count(*) filter (where completed_at >= date_trunc('week', now()) - interval '7 days'
                          and completed_at < date_trunc('week', now())) as tasks_last_week,
      coalesce(sum(complexity_mult) filter (where scored and completed_at >= date_trunc('week', now())), 0) as points_this_week,
      coalesce(sum(complexity_mult) filter (where scored and completed_at >= date_trunc('week', now()) - interval '7 days'
                          and completed_at < date_trunc('week', now())), 0) as points_last_week
    from task_info
    group by user_id
  ),
  subtask_weekly as (
    select
      coalesce(s.assignee_id, ti.user_id) as user_id,
      count(*) filter (where ti.completed_at >= date_trunc('week', now())) as tasks_this_week,
      count(*) filter (where ti.completed_at >= date_trunc('week', now()) - interval '7 days'
                          and ti.completed_at < date_trunc('week', now())) as tasks_last_week,
      coalesce(sum(ti.complexity_mult) filter (where ti.scored and ti.completed_at >= date_trunc('week', now())), 0) as points_this_week,
      coalesce(sum(ti.complexity_mult) filter (where ti.scored and ti.completed_at >= date_trunc('week', now()) - interval '7 days'
                          and ti.completed_at < date_trunc('week', now())), 0) as points_last_week
    from public.subtasks s
    join task_info ti on ti.id = s.task_id
    group by coalesce(s.assignee_id, ti.user_id)
  ),
  combined as (
    select
      user_id,
      sum(tasks_this_week) as tasks_this_week,
      sum(tasks_last_week) as tasks_last_week,
      sum(points_this_week) as points_this_week,
      sum(points_last_week) as points_last_week
    from (
      select * from task_weekly
      union all
      select * from subtask_weekly
    ) u
    group by user_id
  ),
  ranked as (
    select
      gw.user_id,
      row_number() over (order by gw.personal_positive_points desc) as global_rank,
      count(*) over () as total_ranked
    from public.global_wall() gw
    where gw.community_count > 0
  )
  select
    p.id as user_id,
    coalesce(c.tasks_this_week, 0) as tasks_this_week,
    coalesce(c.tasks_last_week, 0) as tasks_last_week,
    coalesce(round(c.points_this_week::numeric, 1), 0) as points_this_week,
    coalesce(round(c.points_last_week::numeric, 1), 0) as points_last_week,
    r.global_rank,
    r.total_ranked
  from public.profiles p
  left join combined c on c.user_id = p.id
  left join ranked r on r.user_id = p.id;
$$;

-- Chamada só pela Edge Function (via service role), que já ignora RLS/grants;
-- não precisa de grant para "authenticated".

-- Agenda a Edge Function "weekly-digest" para rodar toda segunda-feira às 12h UTC.
-- Antes de rodar:
--   1. Faça o deploy: supabase functions deploy weekly-digest
--   2. Troque SUA_SERVICE_ROLE_KEY abaixo (Project Settings -> API -> service_role key)
select cron.schedule(
  'weekly-digest-monday',
  '0 12 * * 1',
  $$
  select net.http_post(
    url := 'https://ngjndfayebihezksblyv.functions.supabase.co/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para remover o agendamento no futuro, se precisar:
-- select cron.unschedule('weekly-digest-monday');
