-- Libera nível do personagem, moedas, loja e bichinhos de estimação pra
-- todo mundo (antes só a conta do dono da plataforma, pra testar antes).

create or replace function public.claim_level_coins()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _work_xp numeric;
  _current_level integer;
  _paid_level integer;
  _awarded integer;
begin
  select work_xp into _work_xp from public.global_wall() where user_id = auth.uid();
  if _work_xp is null then
    return 0;
  end if;

  _current_level := public.work_level_from_xp(_work_xp);

  select work_level_paid into _paid_level from public.profiles where id = auth.uid();
  _paid_level := coalesce(_paid_level, 1);

  if _current_level <= _paid_level then
    return 0;
  end if;

  _awarded := (_current_level - _paid_level) * 25;

  update public.profiles
  set coins = coins + _awarded, work_level_paid = _current_level
  where id = auth.uid();

  return _awarded;
end;
$$;

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
