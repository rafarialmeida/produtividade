-- Papéis de administrador por comunidade: quem cria uma comunidade já nasce admin
-- dela, e admins podem promover/rebaixar outros membros a admin também.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essa mudança para projetos novos).

alter table public.community_members add column if not exists role text not null default 'member' check (role in ('admin', 'member'));

-- Promove os criadores de comunidades já existentes a admin da própria comunidade.
update public.community_members cm
set role = 'admin'
from public.communities c
where c.id = cm.community_id and c.creator_id = cm.user_id and cm.role <> 'admin';

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

grant execute on function public.is_community_admin(uuid) to authenticated;

-- Atualiza create_community para o criador já nascer admin da comunidade.
create or replace function public.create_community(_name text, _type text, _severity text)
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
  insert into public.communities (name, type, severity, invite_code, creator_id)
  values (_name, _type, _severity, _code, auth.uid())
  returning * into _community;

  insert into public.community_members (community_id, user_id, role)
  values (_community.id, auth.uid(), 'admin');

  return _community;
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

grant execute on function public.set_community_admin(uuid, uuid, boolean) to authenticated;
