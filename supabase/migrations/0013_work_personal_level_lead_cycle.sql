-- Separa o nível/XP de "Trabalho" (tarefas em comunidades do tipo Trabalho) do
-- nível/XP "Pessoal" (tarefas sem comunidade + comunidades de Competição), pra
-- não ser injusto comparar quem trabalha com coisas complexas com quem usa o
-- app pra listas do dia a dia. Também adiciona a opção de marcar uma tarefa
-- como "sem pontuação" (ex.: lista de mercado) fora de comunidades de
-- Trabalho, e expõe lead time / cycle time médio no perfil (próprio e de
-- terceiros).

alter table public.tasks add column if not exists scored boolean not null default true;

-- O tipo de retorno mudou bastante (xp -> work_xp/personal_xp, + lead/cycle
-- time), então as funções antigas precisam ser removidas antes de recriar.
drop function if exists public.get_public_profile(uuid);
drop function if exists public.global_wall();

create function public.global_wall()
returns table (
  user_id uuid,
  name text,
  avatar_seed text,
  avatar_url text,
  role text,
  lost_points numeric,
  tasks_expired bigint,
  subtasks_missed bigint,
  positive_points numeric,
  work_xp numeric,
  personal_xp numeric,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint,
  lead_time_avg_hours numeric,
  cycle_time_avg_hours numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with subtask_agg as (
    select
      task_id,
      count(*) as subtask_count,
      count(*) filter (where not done) as not_done_count
    from public.subtasks
    group by task_id
  ),
  task_agg as (
    select
      t.id,
      t.user_id,
      t.urgency,
      t.completed,
      t.expired,
      t.scored,
      t.created_at,
      t.completed_at,
      t.started_at,
      coalesce(sa.subtask_count, 0) as subtask_count,
      coalesce(sa.not_done_count, 0) as not_done_count,
      case t.complexity
        when 'baixa' then 1
        when 'media' then 1.5
        when 'alta' then 2
        when 'critica' then 3
        else 1
      end as complexity_mult,
      (t.community_id is not null and c.type = 'trabalho') as is_work
    from public.tasks t
    left join subtask_agg sa on sa.task_id = t.id
    left join public.communities c on c.id = t.community_id
  )
  select
    p.id as user_id,
    p.name,
    p.avatar_seed,
    p.avatar_url,
    p.role,
    coalesce(round(sum(case when ta.expired and not ta.completed and ta.scored then
      (case ta.urgency
        when 'baixa' then 1
        when 'media' then 3
        when 'alta' then 5
        when 'critica' then 10
        else 0
      end) * ta.complexity_mult
    else 0 end)::numeric, 1), 0) as lost_points,
    count(*) filter (where ta.expired and not ta.completed) as tasks_expired,
    coalesce(sum(case when ta.expired and not ta.completed then ta.not_done_count else 0 end), 0) as subtasks_missed,
    coalesce(round(sum(case when ta.completed and ta.scored then (1 + ta.subtask_count) * ta.complexity_mult else 0 end)::numeric, 1), 0) as positive_points,
    coalesce(round(sum(case
      when ta.completed and ta.scored and ta.is_work then (1 + ta.subtask_count) * ta.complexity_mult
      when ta.expired and not ta.completed and ta.scored and ta.is_work then -(1 + ta.not_done_count) * ta.complexity_mult
      else 0
    end)::numeric, 1), 0) as work_xp,
    coalesce(round(sum(case
      when ta.completed and ta.scored and not ta.is_work then (1 + ta.subtask_count) * ta.complexity_mult
      when ta.expired and not ta.completed and ta.scored and not ta.is_work then -(1 + ta.not_done_count) * ta.complexity_mult
      else 0
    end)::numeric, 1), 0) as personal_xp,
    count(*) filter (where ta.completed) as tasks_completed,
    coalesce(sum(case when ta.completed then ta.subtask_count else 0 end), 0) as subtasks_completed,
    (select count(*) from public.community_members cm where cm.user_id = p.id) as community_count,
    round((avg(extract(epoch from (ta.completed_at - ta.created_at)) / 3600.0)
      filter (where ta.completed and ta.completed_at is not null))::numeric, 1) as lead_time_avg_hours,
    round((avg(extract(epoch from (ta.completed_at - ta.started_at)) / 3600.0)
      filter (where ta.completed and ta.completed_at is not null and ta.started_at is not null))::numeric, 1) as cycle_time_avg_hours
  from public.profiles p
  left join task_agg ta on ta.user_id = p.id
  group by p.id, p.name, p.avatar_seed, p.avatar_url, p.role;
$$;

-- Perfil público de um único usuário (visível a partir do Muro Global ou das
-- comunidades) — mesmas estatísticas do ranking, nunca e-mail nem senha.
create or replace function public.get_public_profile(_user_id uuid)
returns table (
  user_id uuid,
  name text,
  avatar_seed text,
  avatar_url text,
  role text,
  lost_points numeric,
  tasks_expired bigint,
  subtasks_missed bigint,
  positive_points numeric,
  work_xp numeric,
  personal_xp numeric,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint,
  lead_time_avg_hours numeric,
  cycle_time_avg_hours numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select * from public.global_wall() where user_id = _user_id;
$$;

grant execute on function public.global_wall() to authenticated;
grant execute on function public.get_public_profile(uuid) to authenticated;
