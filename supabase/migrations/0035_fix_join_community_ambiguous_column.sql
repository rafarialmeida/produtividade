-- Corrige "column reference community_id is ambiguous" ao entrar numa
-- comunidade com código de convite: a função join_community_with_code
-- retorna uma coluna chamada community_id, que colide com a coluna de
-- mesmo nome na cláusula `on conflict (community_id, user_id)` — o Postgres
-- não sabe se é a coluna da tabela ou o parâmetro de saída da função.
-- Referenciar a constraint pelo nome (em vez de listar as colunas) evita a
-- ambiguidade.

create or replace function public.join_community_with_code(_code text)
returns table (
  community_id uuid,
  community_name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _community public.communities;
  _existing_status text;
begin
  select * into _community from public.communities where upper(invite_code) = upper(_code);
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if _community.closed then
    raise exception 'COMMUNITY_CLOSED';
  end if;

  if exists (
    select 1 from public.community_members cm
    where cm.community_id = _community.id and cm.user_id = auth.uid()
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  select cjr.status into _existing_status
  from public.community_join_requests cjr
  where cjr.community_id = _community.id and cjr.user_id = auth.uid();

  if _existing_status = 'pending' then
    raise exception 'ALREADY_PENDING';
  end if;

  insert into public.community_join_requests (community_id, user_id, status, resolved_at, resolved_by)
  values (_community.id, auth.uid(), 'pending', null, null)
  on conflict on constraint community_join_requests_community_id_user_id_key
  do update set status = 'pending', created_at = now(), resolved_at = null, resolved_by = null;

  insert into public.notifications (user_id, type, message)
  select cm.user_id, 'info',
    (select p.name from public.profiles p where p.id = auth.uid())
    || ' pediu para entrar em "' || _community.name || '" — abra Convidar para aprovar ou recusar.'
  from public.community_members cm
  where cm.community_id = _community.id and cm.role = 'admin';

  return query select _community.id, _community.name, 'pending'::text;
end;
$$;
