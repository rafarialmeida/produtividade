-- Kanban da comunidade: Backlog / A Fazer / Em andamento / Aguardando
-- aprovação / Bloqueadas / Concluídas. Bloqueada e Concluída continuam
-- derivadas de tasks.blocked/tasks.completed (já existiam); board_status só
-- cobre os 4 estados "em aberto". board_order ordena os cards dentro de uma
-- coluna (arrastar e soltar).

alter table public.tasks add column if not exists board_status text not null default 'todo'
  check (board_status in ('backlog', 'todo', 'in_progress', 'awaiting_approval'));
alter table public.tasks add column if not exists board_order double precision not null default 0;

-- Adicionar o parâmetro _order muda a assinatura da função — "create or
-- replace" não substitui nesse caso, só cria uma sobrecarga nova ao lado da
-- antiga. Precisa dropar a versão de 3 argumentos primeiro.
drop function if exists public.set_task_blocked(uuid, boolean, text);

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
end;
$$;

-- Move uma tarefa entre as colunas "em aberto" do Kanban da comunidade
-- (Backlog/A Fazer/Em andamento/Aguardando aprovação) — Bloqueada e
-- Concluída têm suas próprias funções (set_task_blocked / complete_task)
-- porque carregam campos extras (motivo, minutos). Mesma regra de permissão
-- das outras ações de tarefa: dono, admin da comunidade de trabalho, ou
-- admin da plataforma.
create or replace function public.set_task_board_status(_task_id uuid, _status text, _order double precision default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner_id uuid;
  _community_id uuid;
begin
  if _status not in ('backlog', 'todo', 'in_progress', 'awaiting_approval') then
    raise exception 'INVALID_STATUS';
  end if;

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
    board_status = _status,
    board_order = coalesce(_order, board_order),
    started = (_status in ('in_progress', 'awaiting_approval')),
    started_at = case
      when _status in ('in_progress', 'awaiting_approval') and started_at is null then now()
      else started_at
    end
  where id = _task_id;
end;
$$;

-- Conclui uma tarefa: o próprio dono sempre pode; num board de comunidade,
-- isso funciona como a "aprovação" de quem está em Aguardando aprovação —
-- só um admin da comunidade (ou admin da plataforma) consegue concluir a
-- tarefa de outra pessoa.
create or replace function public.complete_task(_task_id uuid, _minutes_spent integer default null, _order double precision default null)
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
    minutes_spent = coalesce(_minutes_spent, minutes_spent)
  where id = _task_id;
end;
$$;

-- Reabre uma tarefa concluída (volta pra Em andamento) — mesma regra de
-- permissão: dono, admin da comunidade, ou admin da plataforma. É como um
-- admin "rejeita" uma aprovação e manda de volta pra retrabalho.
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
end;
$$;

grant execute on function public.set_task_blocked(uuid, boolean, text, double precision) to authenticated;
grant execute on function public.set_task_board_status(uuid, text, double precision) to authenticated;
grant execute on function public.complete_task(uuid, integer, double precision) to authenticated;
grant execute on function public.reopen_task(uuid, double precision) to authenticated;
