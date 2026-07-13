-- O Muro Global deve ser sobre tarefas gerais (pessoais), não sobre trabalho —
-- então o ranking individual de lá passa a usar pontos escopados (fora de
-- comunidades de trabalho), em paralelo aos totais combinados já existentes
-- (usados no perfil). Também adiciona um ranking de comunidades de
-- Competição (não de usuários) com base em lead/cycle time médio e
-- tarefas/subtarefas concluídas.

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
  personal_positive_points numeric,
  personal_lost_points numeric,
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
  with task_info as (
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
      case t.complexity
        when 'baixa' then 1
        when 'media' then 1.5
        when 'alta' then 2
        when 'critica' then 3
        else 1
      end as complexity_mult,
      (t.community_id is not null and c.type = 'trabalho') as is_work
    from public.tasks t
    left join public.communities c on c.id = t.community_id
  ),
  task_scored as (
    select
      ti.*,
      case
        when ti.completed and ti.scored then ti.complexity_mult
        when ti.expired and not ti.completed and ti.scored then -ti.complexity_mult
        else 0
      end as base_points
    from task_info ti
  ),
  task_level as (
    select
      user_id,
      count(*) filter (where completed) as tasks_completed,
      count(*) filter (where expired and not completed) as tasks_expired,
      coalesce(sum(case when expired and not completed and scored then
        (case urgency
          when 'baixa' then 1
          when 'media' then 3
          when 'alta' then 5
          when 'critica' then 10
          else 0
        end) * complexity_mult
      else 0 end), 0) as lost_points,
      coalesce(sum(case when expired and not completed and scored and not is_work then
        (case urgency
          when 'baixa' then 1
          when 'media' then 3
          when 'alta' then 5
          when 'critica' then 10
          else 0
        end) * complexity_mult
      else 0 end), 0) as personal_lost_points,
      coalesce(sum(base_points) filter (where is_work), 0) as work_base,
      coalesce(sum(base_points) filter (where not is_work), 0) as personal_base,
      coalesce(sum(case when base_points > 0 then base_points else 0 end), 0) as positive_base,
      coalesce(sum(case when base_points > 0 and not is_work then base_points else 0 end), 0) as personal_positive_base,
      avg(extract(epoch from (completed_at - created_at)) / 3600.0)
        filter (where completed and completed_at is not null) as lead_time_avg_hours,
      avg(extract(epoch from (completed_at - started_at)) / 3600.0)
        filter (where completed and completed_at is not null and started_at is not null) as cycle_time_avg_hours
    from task_scored
    group by user_id
  ),
  subtask_rows as (
    select
      coalesce(s.assignee_id, ti.user_id) as credited_user_id,
      ti.is_work,
      ti.scored,
      case
        when ti.completed then ti.complexity_mult
        when ti.expired and not ti.completed and not s.done then -ti.complexity_mult
        else 0
      end as sub_points,
      ti.completed as counts_completed,
      (ti.expired and not ti.completed and not s.done) as counts_missed
    from public.subtasks s
    join task_info ti on ti.id = s.task_id
    where ti.completed or (ti.expired and not ti.completed)
  ),
  subtask_level as (
    select
      credited_user_id as user_id,
      count(*) filter (where counts_completed) as subtasks_completed,
      count(*) filter (where counts_missed) as subtasks_missed,
      coalesce(sum(sub_points) filter (where scored and is_work), 0) as work_sub,
      coalesce(sum(sub_points) filter (where scored and not is_work), 0) as personal_sub,
      coalesce(sum(case when scored and sub_points > 0 then sub_points else 0 end), 0) as positive_sub,
      coalesce(sum(case when scored and sub_points > 0 and not is_work then sub_points else 0 end), 0) as personal_positive_sub
    from subtask_rows
    group by credited_user_id
  )
  select
    p.id as user_id,
    p.name,
    p.avatar_seed,
    p.avatar_url,
    p.role,
    coalesce(round(tl.lost_points::numeric, 1), 0) as lost_points,
    coalesce(tl.tasks_expired, 0) as tasks_expired,
    coalesce(sl.subtasks_missed, 0) as subtasks_missed,
    coalesce(round((coalesce(tl.positive_base, 0) + coalesce(sl.positive_sub, 0))::numeric, 1), 0) as positive_points,
    coalesce(round((coalesce(tl.personal_positive_base, 0) + coalesce(sl.personal_positive_sub, 0))::numeric, 1), 0) as personal_positive_points,
    coalesce(round(tl.personal_lost_points::numeric, 1), 0) as personal_lost_points,
    coalesce(round((coalesce(tl.work_base, 0) + coalesce(sl.work_sub, 0))::numeric, 1), 0) as work_xp,
    coalesce(round((coalesce(tl.personal_base, 0) + coalesce(sl.personal_sub, 0))::numeric, 1), 0) as personal_xp,
    coalesce(tl.tasks_completed, 0) as tasks_completed,
    coalesce(sl.subtasks_completed, 0) as subtasks_completed,
    (select count(*) from public.community_members cm where cm.user_id = p.id) as community_count,
    round(tl.lead_time_avg_hours::numeric, 1) as lead_time_avg_hours,
    round(tl.cycle_time_avg_hours::numeric, 1) as cycle_time_avg_hours
  from public.profiles p
  left join task_level tl on tl.user_id = p.id
  left join subtask_level sl on sl.user_id = p.id;
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
  personal_positive_points numeric,
  personal_lost_points numeric,
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

-- Ranking de comunidades de Competição (não de usuários) para o Muro Global:
-- soma/agrega as tarefas de cada comunidade do tipo "competicao", ignorando
-- tarefas marcadas como "sem pontuação". Todo usuário autenticado pode ver
-- esse ranking, mesmo sem ser membro da comunidade (é global por natureza).
create or replace function public.competition_community_rankings()
returns table (
  community_id uuid,
  name text,
  member_count bigint,
  tasks_completed bigint,
  subtasks_completed bigint,
  lead_time_avg_hours numeric,
  cycle_time_avg_hours numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with task_level as (
    select
      t.community_id,
      count(*) filter (where t.completed and t.scored) as tasks_completed,
      avg(extract(epoch from (t.completed_at - t.created_at)) / 3600.0)
        filter (where t.completed and t.scored and t.completed_at is not null) as lead_time_avg_hours,
      avg(extract(epoch from (t.completed_at - t.started_at)) / 3600.0)
        filter (where t.completed and t.scored and t.completed_at is not null and t.started_at is not null) as cycle_time_avg_hours
    from public.tasks t
    join public.communities c on c.id = t.community_id and c.type = 'competicao'
    group by t.community_id
  ),
  subtask_level as (
    select
      t.community_id,
      count(*) as subtasks_completed
    from public.subtasks s
    join public.tasks t on t.id = s.task_id
    join public.communities c on c.id = t.community_id and c.type = 'competicao'
    where t.completed and t.scored
    group by t.community_id
  )
  select
    c.id as community_id,
    c.name,
    (select count(*) from public.community_members cm where cm.community_id = c.id) as member_count,
    coalesce(tl.tasks_completed, 0) as tasks_completed,
    coalesce(sl.subtasks_completed, 0) as subtasks_completed,
    round(tl.lead_time_avg_hours::numeric, 1) as lead_time_avg_hours,
    round(tl.cycle_time_avg_hours::numeric, 1) as cycle_time_avg_hours
  from public.communities c
  left join task_level tl on tl.community_id = c.id
  left join subtask_level sl on sl.community_id = c.id
  where c.type = 'competicao';
$$;

grant execute on function public.competition_community_rankings() to authenticated;
