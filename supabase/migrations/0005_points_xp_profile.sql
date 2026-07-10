-- Ranking positivo, XP/Nível e perfil de usuário (foto + estatísticas públicas).
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essas mudanças para projetos novos).

-- Foto de perfil (opcional).
alter table public.profiles add column if not exists avatar_url text;
grant update (name, avatar_seed, avatar_url, notify_reminder, notify_expired, notify_completed, notify_only_urgent)
  on public.profiles to authenticated;

-- Bucket de Storage para as fotos de perfil, público para leitura.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_insert_own" on storage.objects;
create policy "avatar_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_delete_own" on storage.objects;
create policy "avatar_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ranking positivo (1 ponto por tarefa concluída + 1 ponto por subtarefa concluída,
-- sem peso de urgência — toda tarefa vale igual) e XP/Nível (mesma contagem simples,
-- mas some quando expira: -1 pela tarefa e -1 por cada subtarefa que ficou sem marcar).
-- O ranking negativo por pontos perdidos (Baixa -1/Média -3/Alta -5/Crítica -10)
-- continua igual, sem contar subtarefas.
drop function if exists public.global_wall();
create function public.global_wall()
returns table (
  user_id uuid,
  name text,
  avatar_seed text,
  avatar_url text,
  role text,
  lost_points bigint,
  tasks_expired bigint,
  subtasks_missed bigint,
  positive_points bigint,
  xp bigint,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with subtask_agg as (
    select
      task_id,
      count(*) as subtask_count,
      count(*) filter (where not done) as not_done_count
    from public.subtasks
    group by task_id
  ),
  task_agg as (
    select
      t.id,
      t.user_id,
      t.urgency,
      t.completed,
      t.expired,
      coalesce(sa.subtask_count, 0) as subtask_count,
      coalesce(sa.not_done_count, 0) as not_done_count
    from public.tasks t
    left join subtask_agg sa on sa.task_id = t.id
  )
  select
    p.id as user_id,
    p.name,
    p.avatar_seed,
    p.avatar_url,
    p.role,
    coalesce(sum(case when ta.expired and not ta.completed then
      case ta.urgency
        when 'baixa' then 1
        when 'media' then 3
        when 'alta' then 5
        when 'critica' then 10
        else 0
      end
    else 0 end), 0) as lost_points,
    count(*) filter (where ta.expired and not ta.completed) as tasks_expired,
    coalesce(sum(case when ta.expired and not ta.completed then ta.not_done_count else 0 end), 0) as subtasks_missed,
    coalesce(sum(case when ta.completed then 1 + ta.subtask_count else 0 end), 0) as positive_points,
    coalesce(sum(case
      when ta.completed then 1 + ta.subtask_count
      when ta.expired and not ta.completed then -(1 + ta.not_done_count)
      else 0
    end), 0) as xp,
    count(*) filter (where ta.completed) as tasks_completed,
    coalesce(sum(case when ta.completed then ta.subtask_count else 0 end), 0) as subtasks_completed,
    (select count(*) from public.community_members cm where cm.user_id = p.id) as community_count
  from public.profiles p
  left join task_agg ta on ta.user_id = p.id
  group by p.id, p.name, p.avatar_seed, p.avatar_url, p.role;
$$;

grant execute on function public.global_wall() to authenticated;

-- Perfil público de um único usuário (visível a partir do Muro Global ou das
-- comunidades) — mesmas estatísticas do ranking, nunca e-mail nem senha.
create or replace function public.get_public_profile(_user_id uuid)
returns table (
  user_id uuid,
  name text,
  avatar_seed text,
  avatar_url text,
  role text,
  lost_points bigint,
  tasks_expired bigint,
  subtasks_missed bigint,
  positive_points bigint,
  xp bigint,
  tasks_completed bigint,
  subtasks_completed bigint,
  community_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select * from public.global_wall() where user_id = _user_id;
$$;

grant execute on function public.get_public_profile(uuid) to authenticated;
