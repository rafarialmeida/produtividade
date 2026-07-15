-- Bichinhos de estimação: item mais caro da loja. Nível do pet não usa XP —
-- só sobe com tarefas de complexidade crítica concluídas.

alter table public.profiles add column if not exists equipped_pet text;

create or replace function public.critical_tasks_completed(_user_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from public.tasks where user_id = _user_id and completed and complexity = 'critica';
$$;

grant execute on function public.critical_tasks_completed(uuid) to authenticated;

-- Catálogo de preços espelha src/utils/shopItems.ts — recria a função incluindo
-- os pets (categoria mais cara).
create or replace function public.buy_shop_item(_item_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _price integer;
  _coins integer;
  _owned text[];
begin
  if (auth.jwt() ->> 'email') <> 'rafael.farialmeida@gmail.com' then
    raise exception 'NOT_ALLOWED';
  end if;

  _price := case _item_id
    when 'frame_silver' then 50
    when 'frame_emerald' then 120
    when 'frame_neon_purple' then 220
    when 'frame_gold' then 400
    when 'aura_blue' then 60
    when 'aura_green' then 140
    when 'aura_flames' then 250
    when 'aura_rainbow' then 450
    when 'palette_silver' then 70
    when 'palette_toxic_green' then 150
    when 'palette_blood_red' then 260
    when 'palette_royal_gold' then 420
    when 'pet_slime' then 600
    when 'pet_owl' then 800
    when 'pet_ghost' then 1000
    when 'pet_dragon' then 1400
    else null
  end;

  if _price is null then
    raise exception 'INVALID_ITEM';
  end if;

  select coins, owned_items into _coins, _owned from public.profiles where id = auth.uid();

  if _item_id = any(_owned) then
    raise exception 'ALREADY_OWNED';
  end if;

  if _coins < _price then
    raise exception 'NOT_ENOUGH_COINS';
  end if;

  update public.profiles
  set coins = coins - _price, owned_items = array_append(owned_items, _item_id)
  where id = auth.uid();
end;
$$;

create or replace function public.equip_item(_category text, _item_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _owned text[];
begin
  if (auth.jwt() ->> 'email') <> 'rafael.farialmeida@gmail.com' then
    raise exception 'NOT_ALLOWED';
  end if;

  if _category not in ('frame', 'aura', 'palette', 'pet') then
    raise exception 'INVALID_CATEGORY';
  end if;

  if _item_id is not null then
    select owned_items into _owned from public.profiles where id = auth.uid();
    if not (_item_id = any(coalesce(_owned, array[]::text[]))) then
      raise exception 'NOT_OWNED';
    end if;
  end if;

  if _category = 'frame' then
    update public.profiles set equipped_name_frame = _item_id where id = auth.uid();
  elsif _category = 'aura' then
    update public.profiles set equipped_ground_aura = _item_id where id = auth.uid();
  elsif _category = 'pet' then
    update public.profiles set equipped_pet = _item_id where id = auth.uid();
  else
    update public.profiles set equipped_palette = _item_id where id = auth.uid();
  end if;
end;
$$;

grant execute on function public.buy_shop_item(text) to authenticated;
grant execute on function public.equip_item(text, text) to authenticated;
