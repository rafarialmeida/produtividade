-- Comentários numa tarefa — visíveis pra quem já vê a tarefa (dono, membro
-- da comunidade, ou admin da plataforma).
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Histórico de eventos de uma tarefa ("fulano criou", "fulano concluiu"...)
-- pra montar a linha do tempo junto com os comentários. Só as funções de
-- tarefa (security definer) escrevem aqui, exceto 'created', que o próprio
-- cliente registra ao criar a tarefa (ver política task_events_insert_created_own).
create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('created', 'completed', 'reopened', 'blocked', 'unblocked', 'assigned')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments (task_id);
create index if not exists task_events_task_id_idx on public.task_events (task_id);

alter table public.task_comments enable row level security;
alter table public.task_events enable row level security;

drop policy if exists "task_comments_select" on public.task_comments;
create policy "task_comments_select" on public.task_comments for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = task_comments.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_member(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "task_comments_insert" on public.task_comments;
create policy "task_comments_insert" on public.task_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and (
          t.user_id = auth.uid()
          or (t.community_id is not null and public.is_community_member(t.community_id))
          or public.is_admin()
        )
    )
  );

drop policy if exists "task_comments_delete_own" on public.task_comments;
create policy "task_comments_delete_own" on public.task_comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "task_events_select" on public.task_events;
create policy "task_events_select" on public.task_events for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = task_events.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_member(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "task_events_insert_created_own" on public.task_events;
create policy "task_events_insert_created_own" on public.task_events for insert to authenticated
  with check (
    event_type = 'created'
    and user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_events.task_id and t.user_id = auth.uid())
  );

-- Registra eventos nas funções de tarefa já existentes (mesmo corpo de
-- antes, só acrescentando o insert em task_events no final).

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

  insert into public.task_events (task_id, user_id, event_type, metadata)
  values (_task_id, auth.uid(), 'assigned', jsonb_build_object('assignee_id', _assignee_id));
end;
$$;

create or replace function public.set_task_blocked(_task_id uuid, _blocked boolean, _reason text default null, _order double precision default null)
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
    blocked_by = case when _blocked then auth.uid() else null end,
    board_order = coalesce(_order, board_order)
  where id = _task_id;

  insert into public.task_events (task_id, user_id, event_type, metadata)
  values (_task_id, auth.uid(), case when _blocked then 'blocked' else 'unblocked' end, jsonb_build_object('reason', _reason));
end;
$$;

create or replace function public.complete_task(
  _task_id uuid,
  _minutes_spent integer default null,
  _order double precision default null,
  _completion_note text default null
)
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
    completed = true,
    completed_at = now(),
    board_order = coalesce(_order, board_order),
    minutes_spent = coalesce(_minutes_spent, minutes_spent),
    completion_note = coalesce(_completion_note, completion_note)
  where id = _task_id;

  insert into public.task_events (task_id, user_id, event_type)
  values (_task_id, auth.uid(), 'completed');
end;
$$;

create or replace function public.reopen_task(_task_id uuid, _order double precision default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
  _community_id uuid;
  _started_at timestamptz;
begin
  select user_id, community_id, started_at into _owner_id, _community_id, _started_at from public.tasks where id = _task_id;
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
    completed = false,
    completed_at = null,
    started = true,
    started_at = coalesce(_started_at, now()),
    board_status = 'in_progress',
    board_order = coalesce(_order, board_order)
  where id = _task_id;

  insert into public.task_events (task_id, user_id, event_type)
  values (_task_id, auth.uid(), 'reopened');
end;
$$;
