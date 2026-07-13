-- Permite renomear uma comunidade. Passa por uma função security definer
-- (mesmo padrão de set_community_board_enabled) porque a política
-- "communities_update_creator" só libera update pra quem CRIOU a comunidade
-- ou é admin da plataforma — aqui queremos que qualquer admin promovido da
-- comunidade também possa renomear, não só o criador original.
create or replace function public.rename_community(_community_id uuid, _name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  if trim(_name) = '' then
    raise exception 'EMPTY_NAME';
  end if;

  update public.communities set name = trim(_name) where id = _community_id;
end;
$$;

grant execute on function public.rename_community(uuid, text) to authenticated;
