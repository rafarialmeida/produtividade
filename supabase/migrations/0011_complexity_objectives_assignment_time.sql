-- Complexidade das tarefas (afeta pontuação), Objetivo Macro como entidade
-- vinculável/criável, atribuição de responsável por tarefa/subtarefa (admin
-- da comunidade de trabalho) e registro de tempo gasto por subtarefa/tarefa.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já
-- inclui essas mudanças para projetos novos).

-- ============================================================================
-- Complexidade
-- ============================================================================

alter table public.tasks add column if not exists complexity text not null default 'media'
  check (complexity in ('baixa', 'media', 'alta', 'critica'));

alter table public.tasks add column if not exists started_at timestamptz;
alter table public.tasks add column if not exists minutes_spent integer;
alter table public.subtasks add column if not exists assignee_id uuid references public.profiles (id) on delete set null;
alter table public.subtasks add column if not exists minutes_spent integer;

-- ============================================================================
-- Objetivo Macro como entidade própria (reaproveitável entre tarefas)
-- ============================================================================

create table if not exists public.macro_objectives (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists macro_objectives_community_id_idx on public.macro_objectives (community_id);
create index if not exists macro_objectives_user_id_idx on public.macro_objectives (user_id);

alter table public.tasks add column if not exists macro_objective_id uuid references public.macro_objectives (id);

-- Backfill: cria um objetivo macro pra cada texto distinto já usado nas tarefas
-- e liga cada tarefa ao objetivo correspondente.
insert into public.macro_objectives (community_id, user_id, title)
select distinct t.community_id, t.user_id, t.macro_objective
from public.tasks t
where t.macro_objective is not null and trim(t.macro_objective) <> ''
  and not exists (
    select 1 from public.macro_objectives mo
    where mo.title = t.macro_objective
      and mo.user_id = t.user_id
      and coalesce(mo.community_id::text, '') = coalesce(t.community_id::text, '')
  );

update public.tasks t
set macro_objective_id = mo.id
from public.macro_objectives mo
where t.macro_objective_id is null
  and mo.title = t.macro_objective
  and mo.user_id = t.user_id
  and coalesce(mo.community_id::text, '') = coalesce(t.community_id::text, '');

alter table public.tasks alter column macro_objective_id set not null;
alter table public.tasks drop column if exists macro_objective;

alter table public.macro_objectives enable row level security;

drop policy if exists "macro_objectives_select" on public.macro_objectives;
create policy "macro_objectives_select" on public.macro_objectives for select to authenticated
  using (
    (community_id is not null and public.is_community_member(community_id))
    or (community_id is null and user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "macro_objectives_insert" on public.macro_objectives;
create policy "macro_objectives_insert" on public.macro_objectives for insert to authenticated
  with check (
    user_id = auth.uid()
    and (community_id is null or public.is_community_member(community_id))
  );

drop policy if exists "macro_objectives_update_own" on public.macro_objectives;
create policy "macro_objectives_update_own" on public.macro_objectives for update to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "macro_objectives_delete_own" on public.macro_objectives;
create policy "macro_objectives_delete_own" on public.macro_objectives for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Atribuição de responsável (só admin da comunidade de trabalho)
-- ============================================================================

create or replace function public.assign_task(_task_id uuid, _assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _community_id uuid;
begin
  select community_id into _community_id from public.tasks where id = _task_id;
  if _community_id is null then
    raise exception 'NOT_ALLOWED';
  end if;
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if not exists (select 1 from public.community_members where community_id = _community_id and user_id = _assignee_id) then
    raise exception 'NOT_A_MEMBER';
  end if;

  update public.tasks set user_id = _assignee_id where id = _task_id;
end;
$$;

create or replace function public.assign_subtask(_subtask_id uuid, _assignee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _community_id uuid;
begin
  select t.community_id into _community_id
  from public.subtasks s
  join public.tasks t on t.id = s.task_id
  where s.id = _subtask_id;

  if _community_id is null then
    raise exception 'NOT_ALLOWED';
  end if;
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if _assignee_id is not null and not exists (
    select 1 from public.community_members where community_id = _community_id and user_id = _assignee_id
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  update public.subtasks set assignee_id = _assignee_id where id = _subtask_id;
end;
$$;

grant execute on function public.assign_task(uuid, uuid) to authenticated;
grant execute on function public.assign_subtask(uuid, uuid) to authenticated;

-- ============================================================================
-- Pontuação: multiplicador de complexidade sobre pontos positivos e negativos
-- ============================================================================

-- O tipo de retorno mudou (lost_points/positive_points/xp: bigint -> numeric),
-- então as funções antigas precisam ser removidas antes de recriar.
drop function if exists public.get_public_profile(uuid);
drop function if exists public.global_wall();

create or replace function public.global_wall()
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
  xp numeric,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint
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
      coalesce(sa.subtask_count, 0) as subtask_count,
      coalesce(sa.not_done_count, 0) as not_done_count,
      case t.complexity
        when 'baixa' then 1
        when 'media' then 1.5
        when 'alta' then 2
        when 'critica' then 3
        else 1
      end as complexity_mult
    from public.tasks t
    left join subtask_agg sa on sa.task_id = t.id
  )
  select
    p.id as user_id,
    p.name,
    p.avatar_seed,
    p.avatar_url,
    p.role,
    coalesce(round(sum(case when ta.expired and not ta.completed then
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
    coalesce(round(sum(case when ta.completed then (1 + ta.subtask_count) * ta.complexity_mult else 0 end)::numeric, 1), 0) as positive_points,
    coalesce(round(sum(case
      when ta.completed then (1 + ta.subtask_count) * ta.complexity_mult
      when ta.expired and not ta.completed then -(1 + ta.not_done_count) * ta.complexity_mult
      else 0
    end)::numeric, 1), 0) as xp,
    count(*) filter (where ta.completed) as tasks_completed,
    coalesce(sum(case when ta.completed then ta.subtask_count else 0 end), 0) as subtasks_completed,
    (select count(*) from public.community_members cm where cm.user_id = p.id) as community_count
  from public.profiles p
  left join task_agg ta on ta.user_id = p.id
  group by p.id, p.name, p.avatar_seed, p.avatar_url, p.role;
$$;

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
  xp numeric,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint
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
