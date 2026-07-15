-- RPC pra buscar em lote os cosméticos equipados (moldura, círculo de luz,
-- paleta, pet) + nível de trabalho + nível do pet de vários usuários de uma
-- vez, pra qualquer usuário autenticado poder ver a personalização completa
-- de todo mundo no tabuleiro 3D (antes só dava pra ver a própria).

create or replace function public.board_cosmetics(_user_ids uuid[])
returns table (
  user_id uuid,
  work_xp numeric,
  critical_tasks_completed bigint,
  equipped_name_frame text,
  equipped_ground_aura text,
  equipped_palette text,
  equipped_pet text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(gw.work_xp, 0) as work_xp,
    public.critical_tasks_completed(p.id) as critical_tasks_completed,
    p.equipped_name_frame,
    p.equipped_ground_aura,
    p.equipped_palette,
    p.equipped_pet
  from public.profiles p
  left join public.global_wall() gw on gw.user_id = p.id
  where p.id = any(_user_ids);
$$;

grant execute on function public.board_cosmetics(uuid[]) to authenticated;
