-- Flawless — schema completo do banco (Postgres / Supabase)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Database -> SQL Editor -> New query).
-- Ele é idempotente na maior parte (usa "if not exists" / "or replace"), mas destina-se a rodar
-- uma única vez em um projeto novo.

create extension if not exists pgcrypto;

-- ============================================================================
-- TABELAS
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_seed text not null,
  notify_reminder boolean not null default true,
  notify_expired boolean not null default true,
  notify_completed boolean not null default true,
  notify_only_urgent boolean not null default false,
  notify_weekly_digest boolean not null default true,
  onboarding_completed_at timestamptz,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('trabalho', 'competicao')),
  severity text not null check (severity in ('baixa', 'media', 'alta', 'critica')),
  invite_code text not null unique,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  board_enabled boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  piece_id text,
  piece_color text,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.macro_objectives (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  macro_objective_id uuid not null references public.macro_objectives (id),
  title text not null,
  category text not null,
  deadline timestamptz not null,
  urgency text not null check (urgency in ('baixa', 'media', 'alta', 'critica')),
  complexity text not null default 'media' check (complexity in ('baixa', 'media', 'alta', 'critica')),
  started boolean not null default false,
  started_at timestamptz,
  completed boolean not null default false,
  completed_at timestamptz,
  minutes_spent integer,
  expired boolean not null default false,
  scored boolean not null default true,
  reminder_sent_at timestamptz,
  recurrence text check (recurrence in ('daily', 'every_other_day', 'weekly', 'biweekly', 'monthly')),
  blocked boolean not null default false,
  blocked_reason text,
  blocked_at timestamptz,
  blocked_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position int not null default 0,
  due_date timestamptz,
  assignee_id uuid references public.profiles (id) on delete set null,
  minutes_spent integer
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  type text not null default 'penalty' check (type in ('penalty', 'warning', 'info', 'success')),
  read boolean not null default false,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Guarda as inscrições de notificação push (Web Push) de cada dispositivo/navegador.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_community_id_idx on public.tasks (community_id);
create index if not exists subtasks_task_id_idx on public.subtasks (task_id);
create index if not exists macro_objectives_community_id_idx on public.macro_objectives (community_id);
create index if not exists macro_objectives_user_id_idx on public.macro_objectives (user_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists community_members_user_id_idx on public.community_members (user_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists tasks_deleted_at_idx on public.tasks (deleted_at);
create index if not exists communities_deleted_at_idx on public.communities (deleted_at);

-- Bucket de Storage para as fotos de perfil, público para leitura.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_insert_own" on storage.objects;
create policy "avatar_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_delete_own" on storage.objects;
create policy "avatar_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- FUNÇÕES AUXILIARES (security definer -> usadas dentro das policies para
-- evitar recursão de RLS e para operações controladas que precisam ignorar RLS)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_community_member(_community_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where community_id = _community_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_community_creator(_community_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.communities
    where id = _community_id and creator_id = auth.uid()
  );
$$;

create or replace function public.is_community_admin(_community_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where community_id = _community_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- Cria o profile automaticamente quando alguém se cadastra (e-mail/senha ou OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_seed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cria uma comunidade e já matricula quem criou, de forma atômica.
create or replace function public.create_community(_name text, _type text, _severity text, _board_enabled boolean default true)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  _community public.communities;
  _code text;
begin
  _code := upper(substr(md5(random()::text), 1, 6));
  insert into public.communities (name, type, severity, invite_code, creator_id, board_enabled)
  values (_name, _type, _severity, _code, auth.uid(), _board_enabled)
  returning * into _community;

  insert into public.community_members (community_id, user_id, role)
  values (_community.id, auth.uid(), 'admin');

  return _community;
end;
$$;

-- Ativa/desativa o tabuleiro de uma comunidade (só admin da comunidade ou admin da plataforma).
create or replace function public.set_community_board_enabled(_community_id uuid, _enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.communities set board_enabled = _enabled where id = _community_id;
end;
$$;

-- Promove ou rebaixa um membro a admin da comunidade (só quem já é admin dela,
-- ou admin da plataforma, pode chamar). Impede remover o último admin restante.
create or replace function public.set_community_admin(_community_id uuid, _user_id uuid, _is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  if not exists (select 1 from public.community_members where community_id = _community_id and user_id = _user_id) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if not _is_admin then
    if (select count(*) from public.community_members where community_id = _community_id and role = 'admin') <= 1
       and exists (select 1 from public.community_members where community_id = _community_id and user_id = _user_id and role = 'admin')
    then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  update public.community_members
  set role = case when _is_admin then 'admin' else 'member' end
  where community_id = _community_id and user_id = _user_id;
end;
$$;

-- Escolhe a peça (boneco) e a cor do usuário no tabuleiro gamificado da
-- comunidade. Peças exclusivas só podem ser escolhidas por admins da
-- comunidade (ou admin da plataforma).
create or replace function public.set_community_piece(_community_id uuid, _piece_id text, _color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _valid_pieces text[] := array[
    'fox','owl','astronaut','dino','fish','rabbit','bear','cat','ghost','bird',
    'turtle','squirrel','snail','octopus','panda','cloud','frog','ninja','robot','bee',
    'dragon-king','phoenix','crystal-knight','griffin','rune-golem'
  ];
  _exclusive_pieces text[] := array['dragon-king','phoenix','crystal-knight','griffin','rune-golem'];
  _valid_colors text[] := array[
    '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9',
    '#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#78716c','#1e293b','#e2e8f0'
  ];
begin
  if not exists (select 1 from public.community_members where community_id = _community_id and user_id = auth.uid()) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if not (_piece_id = any(_valid_pieces)) then
    raise exception 'INVALID_PIECE';
  end if;

  if not (_color = any(_valid_colors)) then
    raise exception 'INVALID_COLOR';
  end if;

  if _piece_id = any(_exclusive_pieces) and not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.community_members
  set piece_id = _piece_id, piece_color = _color
  where community_id = _community_id and user_id = auth.uid();
end;
$$;

-- Entra em uma comunidade a partir do código de convite.
create or replace function public.join_community_with_code(_code text)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  _community public.communities;
begin
  select * into _community from public.communities where upper(invite_code) = upper(_code);
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  insert into public.community_members (community_id, user_id)
  values (_community.id, auth.uid())
  on conflict do nothing;

  return _community;
end;
$$;

-- Atribui o responsável por uma tarefa (só admin da comunidade de trabalho da tarefa).
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

-- Atribui (ou remove, com _assignee_id null) o responsável por uma subtarefa
-- (só admin da comunidade de trabalho da tarefa).
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

-- Bloquear/desbloquear passa por uma função security definer porque a
-- política "tasks_update_own" só deixa o dono mexer na própria tarefa —
-- aqui o admin da comunidade de trabalho também precisa poder agir (ex.:
-- reorganizar prioridades do time), então a permissão é checada aqui dentro.
-- Enquanto bloqueada, a tarefa não expira e não gera perda de pontos — o
-- prazo "pausa" até alguém desbloquear.
create or replace function public.set_task_blocked(_task_id uuid, _blocked boolean, _reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
  _community_id uuid;
begin
  select user_id, community_id into _owner_id, _community_id from public.tasks where id = _task_id;
  if _owner_id is null then
    raise exception 'not found';
  end if;

  if not (
    _owner_id = auth.uid()
    or (_community_id is not null and public.is_community_admin(_community_id))
    or public.is_admin()
  ) then
    raise exception 'not authorized';
  end if;

  update public.tasks
  set
    blocked = _blocked,
    blocked_reason = case when _blocked then _reason else null end,
    blocked_at = case when _blocked then now() else null end,
    blocked_by = case when _blocked then auth.uid() else null end
  where id = _task_id;
end;
$$;

-- Gera um novo código de convite (só quem criou a comunidade ou um admin).
create or replace function public.regenerate_invite_code(_community_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_code text;
begin
  if not (public.is_community_creator(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  _new_code := upper(substr(md5(random()::text), 1, 6));
  update public.communities set invite_code = _new_code where id = _community_id;
  return _new_code;
end;
$$;

-- Move uma comunidade (e as tarefas dela) para a lixeira. Roda como
-- security definer porque a política "tasks_update_own" só deixa cada
-- pessoa mexer nas próprias tarefas — aqui o criador da comunidade (ou um
-- admin) precisa poder mandar as tarefas de TODOS os membros pra lixeira
-- junto, igual ao "on delete cascade" que já existia na exclusão definitiva.
create or replace function public.soft_delete_community(_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_creator(_community_id) or public.is_admin()) then
    raise exception 'not authorized';
  end if;

  update public.communities set deleted_at = now() where id = _community_id and deleted_at is null;
  update public.tasks set deleted_at = now() where community_id = _community_id and deleted_at is null;
end;
$$;

-- Restaura uma comunidade e só as tarefas que foram para a lixeira junto com
-- ela (mesmo instante de deleted_at) — tarefas que algum membro já tinha
-- excluído antes, individualmente, continuam na lixeira dele.
create or replace function public.restore_community(_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _deleted_at timestamptz;
begin
  if not (public.is_community_creator(_community_id) or public.is_admin()) then
    raise exception 'not authorized';
  end if;

  select deleted_at into _deleted_at from public.communities where id = _community_id;
  if _deleted_at is null then
    return;
  end if;

  update public.communities set deleted_at = null where id = _community_id;
  update public.tasks set deleted_at = null where community_id = _community_id and deleted_at = _deleted_at;
end;
$$;

-- Ranking agregado de toda a plataforma (Muro Global): calculado no servidor para
-- que ninguém precise enxergar as tarefas de comunidades das quais não participa.
-- Multiplicado pela complexidade da tarefa (baixa 1x / média 1.5x / alta 2x /
-- crítica 3x) para que poucas tarefas complexas valham mais que muitas tarefas
-- fáceis, e ignorando tarefas marcadas como "sem pontuação" (scored = false).
-- Pontos positivos/XP são decompostos por responsável: a tarefa em si sempre
-- credita quem é responsável por ela (tasks.user_id, atualizado via
-- assign_task), mas cada subtarefa credita seu próprio responsável
-- (subtasks.assignee_id), caindo pro dono da tarefa se não tiver um
-- responsável específico — assim quem efetivamente faz o trabalho é quem
-- pontua, não quem só criou ou é dono da tarefa.
--   - lost_points: pontos perdidos por urgência (Baixa 1/Média 3/Alta 5/Crítica 10) ×
--     complexidade, sempre do dono da tarefa (é sobre perder o prazo como um todo).
--   - work_xp / personal_xp: soma da base da tarefa + de cada subtarefa,
--     separadas por origem — work_xp só conta tarefas de comunidades do tipo
--     Trabalho, personal_xp conta o resto (tarefas sem comunidade + comunidades
--     de Competição).
--   - lead_time_avg_hours / cycle_time_avg_hours: médias de criação->conclusão e
--     início->conclusão, cross-comunidade, em horas (sempre do dono da tarefa).
--   - personal_positive_points / personal_lost_points: mesma conta de
--     positive_points/lost_points, mas só considerando tarefas fora de
--     comunidades de Trabalho — é o que alimenta o ranking individual do Muro
--     Global, que é sobre tarefas gerais, não sobre desempenho no trabalho.
--   - personal_tasks_completed / personal_tasks_expired: idem, contagens de
--     tarefas (não pontos) só fora de comunidades de Trabalho — usadas nas
--     legendas do ranking individual do Muro Global.
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
  personal_tasks_completed bigint,
  personal_tasks_expired bigint,
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
      count(*) filter (where completed and not is_work) as personal_tasks_completed,
      count(*) filter (where expired and not completed and not is_work) as personal_tasks_expired,
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
    coalesce(tl.personal_tasks_completed, 0) as personal_tasks_completed,
    coalesce(tl.personal_tasks_expired, 0) as personal_tasks_expired,
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
  personal_tasks_completed bigint,
  personal_tasks_expired bigint,
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

-- Ranking de comunidades de Competição (não de usuários) para o Muro Global:
-- agrega as tarefas de cada comunidade do tipo "competicao", ignorando
-- tarefas marcadas como "sem pontuação". Qualquer usuário autenticado pode
-- ver esse ranking, mesmo sem ser membro da comunidade (é global por
-- natureza).
create function public.competition_community_rankings()
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

-- Ranking de comunidades de Trabalho (a comunidade como um todo, não seus
-- membros) — análogo ao competition_community_rankings(), mas para o tipo
-- "trabalho". Usado dentro da própria comunidade (aba "Ranking", ao lado do
-- Tabuleiro) pra comparar com as demais comunidades de trabalho da
-- plataforma.
create or replace function public.work_community_rankings()
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
    join public.communities c on c.id = t.community_id and c.type = 'trabalho'
    group by t.community_id
  ),
  subtask_level as (
    select
      t.community_id,
      count(*) as subtasks_completed
    from public.subtasks s
    join public.tasks t on t.id = s.task_id
    join public.communities c on c.id = t.community_id and c.type = 'trabalho'
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
  where c.type = 'trabalho';
$$;

-- Estatísticas semanais por usuário: tarefas concluídas e pontos ganhos essa
-- semana vs a semana passada (tarefa + subtarefas, creditadas a quem
-- executou, ponderadas por complexidade, só entregas pontuadas), mais a
-- posição atual no ranking individual do Muro Global (mesmo critério de
-- personal_positive_points usado lá, só entre quem já está em pelo menos 1
-- comunidade). Usada pela Edge Function "weekly-digest" (via service role,
-- não precisa de grant para "authenticated").
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

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_creator(uuid) to authenticated;
grant execute on function public.is_community_admin(uuid) to authenticated;
grant execute on function public.create_community(text, text, text, boolean) to authenticated;
grant execute on function public.set_community_admin(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_community_piece(uuid, text, text) to authenticated;
grant execute on function public.set_community_board_enabled(uuid, boolean) to authenticated;
grant execute on function public.assign_task(uuid, uuid) to authenticated;
grant execute on function public.assign_subtask(uuid, uuid) to authenticated;
grant execute on function public.set_task_blocked(uuid, boolean, text) to authenticated;
grant execute on function public.join_community_with_code(text) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.soft_delete_community(uuid) to authenticated;
grant execute on function public.restore_community(uuid) to authenticated;
grant execute on function public.global_wall() to authenticated;
grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.competition_community_rankings() to authenticated;
grant execute on function public.work_community_rankings() to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.macro_objectives enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: qualquer pessoa autenticada pode ver nome/avatar de qualquer usuário
-- (necessário para rankings e listagem de membros). Só o próprio dono edita seu perfil,
-- e apenas os campos nome/avatar — a coluna "role" não pode ser alterada pelo cliente.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (
  name, avatar_seed, avatar_url,
  notify_reminder, notify_expired, notify_completed, notify_only_urgent, notify_weekly_digest,
  onboarding_completed_at
) on public.profiles to authenticated;

-- communities: visível para quem é membro (ou admin). Criar é livre para qualquer
-- autenticado (via a função create_community). Editar/excluir só criador ou admin.
drop policy if exists "communities_select_member" on public.communities;
create policy "communities_select_member" on public.communities for select to authenticated
  using (public.is_community_member(id) or public.is_admin());

drop policy if exists "communities_update_creator" on public.communities;
create policy "communities_update_creator" on public.communities for update to authenticated
  using (creator_id = auth.uid() or public.is_admin());

drop policy if exists "communities_delete_creator" on public.communities;
create policy "communities_delete_creator" on public.communities for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- community_members: visível para membros da mesma comunidade (ou admin).
drop policy if exists "members_select_same_community" on public.community_members;
create policy "members_select_same_community" on public.community_members for select to authenticated
  using (public.is_community_member(community_id) or public.is_admin());

drop policy if exists "members_delete_self_or_creator" on public.community_members;
create policy "members_delete_self_or_creator" on public.community_members for delete to authenticated
  using (user_id = auth.uid() or public.is_community_creator(community_id) or public.is_admin());

-- macro_objectives: visível para membros da comunidade (ou para o próprio dono,
-- se for um objetivo pessoal sem comunidade). Só o próprio dono edita/exclui.
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

-- tasks: dono sempre vê e edita as próprias. Tarefas de uma comunidade são visíveis
-- para todos os membros dela, mas só o dono edita/exclui/conclui.
drop policy if exists "tasks_select_own_or_community" on public.tasks;
create policy "tasks_select_own_or_community" on public.tasks for select to authenticated
  using (
    user_id = auth.uid()
    or (community_id is not null and public.is_community_member(community_id))
    or public.is_admin()
  );

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using (user_id = auth.uid());

-- subtasks: seguem a visibilidade da tarefa. Marcar feito/não feito é permitido para
-- o dono da tarefa e para colegas da mesma comunidade (checklist colaborativo em
-- comunidades de Trabalho); tarefas pessoais só o dono mexe.
drop policy if exists "subtasks_select_via_task" on public.subtasks;
create policy "subtasks_select_via_task" on public.subtasks for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_member(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "subtasks_insert_via_task_owner" on public.subtasks;
create policy "subtasks_insert_via_task_owner" on public.subtasks for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid()));

drop policy if exists "subtasks_update_via_task_or_community" on public.subtasks;
create policy "subtasks_update_via_task_or_community" on public.subtasks for update to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (t.user_id = auth.uid() or (t.community_id is not null and public.is_community_member(t.community_id)))
  ));

drop policy if exists "subtasks_delete_via_task_owner" on public.subtasks;
create policy "subtasks_delete_via_task_owner" on public.subtasks for delete to authenticated
  using (exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid()));

-- notifications: cada um só vê e mexe nas próprias.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- push_subscriptions: cada um só vê e mexe nas próprias inscrições. As Edge
-- Functions que disparam os pushes usam a service role key, que ignora RLS.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Promover o primeiro administrador
-- ============================================================================
-- Depois de criar sua conta pelo app, rode manualmente (trocando o e-mail):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'voce@exemplo.com');
--
-- Por segurança, isso não pode ser feito pelo próprio app (só via SQL Editor/dashboard).
