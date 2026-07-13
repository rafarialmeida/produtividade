-- Tabuleiro gamificado das comunidades de trabalho passa a ser opcional:
-- o admin escolhe incluir (ou não) ao criar a comunidade, e pode ativar/
-- desativar depois a qualquer momento.

alter table public.communities add column if not exists board_enabled boolean not null default true;

-- A assinatura mudou (novo parâmetro), então a versão antiga de 3 argumentos
-- precisa ser removida pra não sobrar como overload separado.
drop function if exists public.create_community(text, text, text);

create or replace function public.create_community(_name text, _type text, _severity text, _board_enabled boolean default true)
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
  insert into public.communities (name, type, severity, invite_code, creator_id, board_enabled)
  values (_name, _type, _severity, _code, auth.uid(), _board_enabled)
  returning * into _community;

  insert into public.community_members (community_id, user_id, role)
  values (_community.id, auth.uid(), 'admin');

  return _community;
end;
$$;

-- Ativa/desativa o tabuleiro de uma comunidade (só admin da comunidade ou admin da plataforma).
create or replace function public.set_community_board_enabled(_community_id uuid, _enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.communities set board_enabled = _enabled where id = _community_id;
end;
$$;

grant execute on function public.set_community_board_enabled(uuid, boolean) to authenticated;
