-- Permite que qualquer membro saia voluntariamente de uma comunidade, sem
-- precisar ser admin (diferente de remove_community_member, que só admin
-- pode usar contra outra pessoa). Mesma guarda de "último admin".
create or replace function public.leave_community(_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.community_members
    where community_id = _community_id and user_id = auth.uid()
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if (select count(*) from public.community_members where community_id = _community_id and role = 'admin') <= 1
     and exists (
       select 1 from public.community_members
       where community_id = _community_id and user_id = auth.uid() and role = 'admin'
     )
  then
    raise exception 'LAST_ADMIN';
  end if;

  delete from public.community_members where community_id = _community_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_community(uuid) to authenticated;
