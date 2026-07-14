-- Permite que um admin da comunidade (não só o criador ou admin da
-- plataforma) remova um membro — usado na nova aba "Membros". Mesma guarda
-- de "último admin" que já existe em set_community_admin, pra não deixar a
-- comunidade sem nenhum admin.
create or replace function public.remove_community_member(_community_id uuid, _user_id uuid)
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

  if (select count(*) from public.community_members where community_id = _community_id and role = 'admin') <= 1
     and exists (select 1 from public.community_members where community_id = _community_id and user_id = _user_id and role = 'admin')
  then
    raise exception 'LAST_ADMIN';
  end if;

  delete from public.community_members where community_id = _community_id and user_id = _user_id;
end;
$$;

grant execute on function public.remove_community_member(uuid, uuid) to authenticated;
