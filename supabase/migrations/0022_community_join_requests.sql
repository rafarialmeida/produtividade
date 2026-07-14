-- Entrar em uma comunidade por código de convite deixa de ser imediato: agora
-- cria um pedido pendente, e um admin da comunidade precisa aprovar ou
-- recusar. Quem pede recebe uma notificação quando o pedido é resolvido; os
-- admins recebem uma notificação quando alguém pede pra entrar.

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  unique (community_id, user_id)
);

create index if not exists community_join_requests_community_idx on public.community_join_requests (community_id);
create index if not exists community_join_requests_user_idx on public.community_join_requests (user_id);

alter table public.community_join_requests enable row level security;

-- Só o próprio solicitante e os admins da comunidade (ou admin da plataforma)
-- podem ver um pedido. Toda escrita passa pelas funções abaixo (security
-- definer) — não há política de insert/update/delete pro cliente.
drop policy if exists "join_requests_select" on public.community_join_requests;
create policy "join_requests_select" on public.community_join_requests for select to authenticated
  using (user_id = auth.uid() or public.is_community_admin(community_id) or public.is_admin());

-- Substitui o comportamento anterior (entrada imediata) por um pedido
-- pendente. Se já for membro, ou já tiver um pedido pendente, recusa. Se um
-- pedido antigo foi recusado/aprovado (ex.: saiu da comunidade depois),
-- reabre como pendente. Notifica todos os admins da comunidade.
drop function if exists public.join_community_with_code(text);

create function public.join_community_with_code(_code text)
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
    || ' pediu para entrar em "' || _community.name || '" — abra Convidar para aprovar ou recusar.'
  from public.community_members cm
  where cm.community_id = _community.id and cm.role = 'admin';

  return query select _community.id, _community.name, 'pending'::text;
end;
$$;

-- Aprova um pedido: matricula o solicitante e avisa que foi aceito.
create or replace function public.approve_join_request(_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _community_id uuid;
  _user_id uuid;
  _status text;
  _community_name text;
begin
  select community_id, user_id, status into _community_id, _user_id, _status
  from public.community_join_requests where id = _request_id;

  if _community_id is null then
    raise exception 'NOT_FOUND';
  end if;
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if _status <> 'pending' then
    raise exception 'ALREADY_RESOLVED';
  end if;

  insert into public.community_members (community_id, user_id)
  values (_community_id, _user_id)
  on conflict do nothing;

  update public.community_join_requests
  set status = 'approved', resolved_at = now(), resolved_by = auth.uid()
  where id = _request_id;

  select name into _community_name from public.communities where id = _community_id;

  insert into public.notifications (user_id, type, message)
  values (_user_id, 'success', 'Seu pedido para entrar em "' || _community_name || '" foi aprovado!');
end;
$$;

-- Recusa um pedido: só atualiza o status e avisa o solicitante.
create or replace function public.reject_join_request(_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _community_id uuid;
  _user_id uuid;
  _status text;
  _community_name text;
begin
  select community_id, user_id, status into _community_id, _user_id, _status
  from public.community_join_requests where id = _request_id;

  if _community_id is null then
    raise exception 'NOT_FOUND';
  end if;
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if _status <> 'pending' then
    raise exception 'ALREADY_RESOLVED';
  end if;

  update public.community_join_requests
  set status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
  where id = _request_id;

  select name into _community_name from public.communities where id = _community_id;

  insert into public.notifications (user_id, type, message)
  values (_user_id, 'info', 'Seu pedido para entrar em "' || _community_name || '" foi recusado.');
end;
$$;

grant execute on function public.join_community_with_code(text) to authenticated;
grant execute on function public.approve_join_request(uuid) to authenticated;
grant execute on function public.reject_join_request(uuid) to authenticated;
