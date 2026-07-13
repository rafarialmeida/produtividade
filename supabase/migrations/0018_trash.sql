-- Lixeira: exclusão de tarefas e comunidades vira "soft delete" (coluna
-- deleted_at), com tela pra restaurar ou excluir definitivamente. Rode isso
-- no SQL Editor do seu projeto Supabase.

alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.communities add column if not exists deleted_at timestamptz;

create index if not exists tasks_deleted_at_idx on public.tasks (deleted_at);
create index if not exists communities_deleted_at_idx on public.communities (deleted_at);

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

grant execute on function public.soft_delete_community(uuid) to authenticated;
grant execute on function public.restore_community(uuid) to authenticated;

-- Purga diária: itens na lixeira há mais de 30 dias são apagados de vez.
-- Exclui as comunidades primeiro (cascateia as tarefas delas via FK) e
-- depois limpa tarefas soltas que passaram do prazo.
select cron.schedule(
  'purge-trash-daily',
  '0 3 * * *',
  $$
  delete from public.communities where deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.tasks where deleted_at is not null and deleted_at < now() - interval '30 days';
  $$
);

-- Para remover o agendamento ou mudar o prazo de retenção no futuro:
-- select cron.unschedule('purge-trash-daily');
