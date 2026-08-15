-- Admin de comunidade agora edita tarefas e subtarefas de outros membros (só
-- reatribuir dono e excluir/restaurar continuam pelas funções dedicadas).
-- Fecha também a brecha de qualquer colega da comunidade reescrever campos de
-- subtarefa que não sejam "feito" (texto, prazo, nota, responsável) — colega
-- sem ser dono/admin passa a só poder marcar feito/não feito, via função.

drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_update_own_or_community_admin" on public.tasks;
create policy "tasks_update_own_or_community_admin" on public.tasks for update to authenticated
  using (
    user_id = auth.uid()
    or (community_id is not null and public.is_community_admin(community_id))
    or public.is_admin()
  );

revoke update on public.tasks from authenticated;
grant update (
  community_id, macro_objective_id, title, category, deadline, urgency, complexity,
  started, started_at, completed, completed_at, minutes_spent, expired, scored,
  recurrence, blocked, blocked_reason, blocked_at, blocked_by, board_status, board_order,
  reminder_sent_at
) on public.tasks to authenticated;

-- Mover pra lixeira / restaurar continuam só o dono (ou admin da plataforma).
create or replace function public.soft_delete_task(_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
begin
  select user_id into _owner_id from public.tasks where id = _task_id;
  if _owner_id is null then
    raise exception 'not found';
  end if;
  if not (_owner_id = auth.uid() or public.is_admin()) then
    raise exception 'not authorized';
  end if;
  update public.tasks set deleted_at = now() where id = _task_id;
end;
$$;

create or replace function public.restore_task(_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
begin
  select user_id into _owner_id from public.tasks where id = _task_id;
  if _owner_id is null then
    raise exception 'not found';
  end if;
  if not (_owner_id = auth.uid() or public.is_admin()) then
    raise exception 'not authorized';
  end if;
  update public.tasks set deleted_at = null where id = _task_id;
end;
$$;

-- Marca subtarefa feita/não feita — liberado pra qualquer colega da mesma
-- comunidade (checklist colaborativo), não só dono/admin.
create or replace function public.toggle_subtask_done(_subtask_id uuid, _done boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
  _community_id uuid;
begin
  select t.user_id, t.community_id into _owner_id, _community_id
  from public.subtasks s
  join public.tasks t on t.id = s.task_id
  where s.id = _subtask_id;

  if _owner_id is null then
    raise exception 'not found';
  end if;

  if not (
    _owner_id = auth.uid()
    or (_community_id is not null and public.is_community_member(_community_id))
    or public.is_admin()
  ) then
    raise exception 'not authorized';
  end if;

  update public.subtasks set done = _done where id = _subtask_id;
end;
$$;

grant execute on function public.soft_delete_task(uuid) to authenticated;
grant execute on function public.restore_task(uuid) to authenticated;
grant execute on function public.toggle_subtask_done(uuid, boolean) to authenticated;

drop policy if exists "subtasks_insert_via_task_owner" on public.subtasks;
drop policy if exists "subtasks_insert_owner_or_admin" on public.subtasks;
create policy "subtasks_insert_owner_or_admin" on public.subtasks for insert to authenticated
  with check (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_admin(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "subtasks_update_via_task_or_community" on public.subtasks;
drop policy if exists "subtasks_update_owner_or_admin" on public.subtasks;
create policy "subtasks_update_owner_or_admin" on public.subtasks for update to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_admin(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "subtasks_delete_via_task_owner" on public.subtasks;
drop policy if exists "subtasks_delete_owner_or_admin" on public.subtasks;
create policy "subtasks_delete_owner_or_admin" on public.subtasks for delete to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_admin(t.community_id))
        or public.is_admin()
      )
  ));

revoke update on public.subtasks from authenticated;
grant update (text, done, position, due_date, minutes_spent, note) on public.subtasks to authenticated;
