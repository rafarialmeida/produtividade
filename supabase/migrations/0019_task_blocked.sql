-- Tarefa bloqueada: pra quando uma tarefa deixa de ser prioridade ou os
-- planos mudaram, sem que isso conte como negligência. Enquanto bloqueada,
-- a tarefa não expira e não gera perda de pontos — o prazo "pausa" até
-- alguém desbloquear. Rode isso no SQL Editor do seu projeto Supabase.

alter table public.tasks add column if not exists blocked boolean not null default false;
alter table public.tasks add column if not exists blocked_reason text;
alter table public.tasks add column if not exists blocked_at timestamptz;
alter table public.tasks add column if not exists blocked_by uuid references public.profiles (id) on delete set null;

-- Bloquear/desbloquear passa por uma função security definer porque a
-- política "tasks_update_own" só deixa o dono mexer na própria tarefa —
-- aqui o admin da comunidade de trabalho também precisa poder agir (ex.:
-- reorganizar prioridades do time), então a permissão é checada aqui dentro.
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

grant execute on function public.set_task_blocked(uuid, boolean, text) to authenticated;
