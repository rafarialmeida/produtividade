-- Bloco de observações livre na própria tarefa (links, menção a pessoas,
-- contexto) e observação opcional registrada no momento da conclusão.
alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists completion_note text;

-- "description" pode ser editado via update direto, como os demais campos de
-- edição da tarefa. "completion_note" só é setado pela função complete_task
-- (abaixo) — não entra na lista de colunas liberadas pro update direto, pra
-- só poder ser registrado no ato da conclusão.
grant update (description) on public.tasks to authenticated;

-- Acrescentar o parâmetro _completion_note muda a assinatura da função —
-- precisa dropar a versão de 3 argumentos antes.
drop function if exists public.complete_task(uuid, integer, double precision);
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
end;
$$;

grant execute on function public.complete_task(uuid, integer, double precision, text) to authenticated;
