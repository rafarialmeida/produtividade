-- Troca o roster de peças do tabuleiro de ícones genéricos para personagens
-- 3D originais. Atualiza a lista de peças válidas/exclusivas usada pela
-- validação server-side de set_community_piece.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já
-- inclui essa mudança para projetos novos).

create or replace function public.set_community_piece(_community_id uuid, _piece_id text, _color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _valid_pieces text[] := array[
    'fox','owl','astronaut','dino','fish','rabbit','bear','cat','ghost','bird',
    'turtle','squirrel','snail','octopus','panda','cloud','frog','ninja','robot','bee',
    'dragon-king','phoenix','crystal-knight','griffin','rune-golem'
  ];
  _exclusive_pieces text[] := array['dragon-king','phoenix','crystal-knight','griffin','rune-golem'];
  _valid_colors text[] := array[
    '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9',
    '#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#78716c','#1e293b','#e2e8f0'
  ];
begin
  if not exists (select 1 from public.community_members where community_id = _community_id and user_id = auth.uid()) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if not (_piece_id = any(_valid_pieces)) then
    raise exception 'INVALID_PIECE';
  end if;

  if not (_color = any(_valid_colors)) then
    raise exception 'INVALID_COLOR';
  end if;

  if _piece_id = any(_exclusive_pieces) and not (public.is_community_admin(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.community_members
  set piece_id = _piece_id, piece_color = _color
  where community_id = _community_id and user_id = auth.uid();
end;
$$;
