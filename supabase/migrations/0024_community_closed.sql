-- Comunidade "fechada": admin da comunidade pode travar a entrada de novos
-- membros mesmo que o código de convite tenha vazado. Com a comunidade
-- fechada, join_community_with_code recusa o pedido antes de criar a
-- solicitação e antes de notificar os admins — ou seja, pedidos indesejados
-- nem chegam a aparecer pra ninguém.

alter table public.communities add column if not exists closed boolean not null default false;

create or replace function public.set_community_closed(_community_id uuid, _closed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.communities set closed = _closed where id = _community_id;
end;
$$;

grant execute on function public.set_community_closed(uuid, boolean) to authenticated;

-- Recria join_community_with_code com a checagem de comunidade fechada logo
-- no início — antes de qualquer insert em community_join_requests ou
-- notifications.
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
  on conflict (community_id, user_id)
  do update set status = 'pending', created_at = now(), resolved_at = null, resolved_by = null;

  insert into public.notifications (user_id, type, message)
  select cm.user_id, 'info',
    (select p.name from public.profiles p where p.id = auth.uid())
    || ' pediu para entrar em "' || _community.name || '" — abra a aba Membros para aprovar ou recusar.'
  from public.community_members cm
  where cm.community_id = _community.id and cm.role = 'admin';

  return query select _community.id, _community.name, 'pending'::text;
end;
$$;

grant execute on function public.join_community_with_code(text) to authenticated;
