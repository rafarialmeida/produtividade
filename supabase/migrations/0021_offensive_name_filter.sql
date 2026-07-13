-- Bloqueia palavras ofensivas no nome do usuário — direto no banco, então
-- vale pra qualquer caminho que altere profiles.name (cliente, cadastro
-- inicial, etc.), não só quem passar pelo app. Filtro por palavra inteira
-- (não substring), pra não travar nomes legítimos que contenham a mesma
-- sequência de letras (ex.: "Paulo"). Não é uma lista exaustiva — é um
-- primeiro filtro para os casos mais óbvios.

create extension if not exists unaccent;

create or replace function public.check_profile_name_language()
returns trigger
language plpgsql
as $$
declare
  normalized text;
  blocked text[] := array[
    'porra', 'caralho', 'merda', 'bosta', 'puta', 'putas', 'putaria',
    'foda', 'fodase', 'fudeu', 'cacete', 'desgraca', 'desgracado', 'desgracada',
    'arrombado', 'arrombada', 'cuzao', 'cuzo', 'cu', 'buceta', 'piroca',
    'pinto', 'xoxota', 'corno', 'cornao', 'babaca', 'imbecil', 'idiota',
    'retardado', 'retardada', 'escroto', 'escrota', 'punheta', 'boceta', 'rola', 'xana', 'fdp'
  ];
  w text;
begin
  normalized := lower(unaccent(new.name));
  foreach w in array blocked loop
    if normalized ~ ('(^|[^a-z0-9])' || w || '($|[^a-z0-9])') then
      raise exception 'OFFENSIVE_NAME';
    end if;
  end loop;
  if normalized like '%filho da puta%'
    or normalized like '%filha da puta%'
    or normalized like '%vai se fuder%'
    or normalized like '%vai tomar no cu%'
  then
    raise exception 'OFFENSIVE_NAME';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_check_name_language on public.profiles;
create trigger profiles_check_name_language
  before insert or update of name on public.profiles
  for each row execute function public.check_profile_name_language();
