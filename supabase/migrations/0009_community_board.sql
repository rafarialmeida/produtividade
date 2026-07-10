-- Tabuleiro gamificado por comunidade de trabalho: cada membro escolhe uma peça
-- (boneco) e uma cor. A posição no tabuleiro é derivada do número de tarefas
-- concluídas na comunidade (calculado no cliente), não fica armazenada aqui.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essa mudança para projetos novos).

alter table public.community_members add column if not exists piece_id text;
alter table public.community_members add column if not exists piece_color text;

create or replace function public.set_community_piece(_community_id uuid, _piece_id text, _color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _valid_pieces text[] := array[
    'cat','dog','bird','fish','rabbit','turtle','bug','squirrel','snail','ghost',
    'rocket','anchor','compass','dice-5','puzzle','feather','umbrella','panda','flower-2','tree-pine',
    'crown','swords','shield-half','flame','gem'
  ];
  _exclusive_pieces text[] := array['crown','swords','shield-half','flame','gem'];
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

grant execute on function public.set_community_piece(uuid, text, text) to authenticated;
