-- Flawless — schema completo do banco (Postgres / Supabase)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Database -> SQL Editor -> New query).
-- Ele é idempotente na maior parte (usa "if not exists" / "or replace"), mas destina-se a rodar
-- uma única vez em um projeto novo.

create extension if not exists pgcrypto;

-- ============================================================================
-- TABELAS
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_seed text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('trabalho', 'competicao')),
  severity text not null check (severity in ('baixa', 'media', 'alta', 'critica')),
  invite_code text not null unique,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  macro_objective text not null,
  title text not null,
  category text not null,
  deadline timestamptz not null,
  urgency text not null check (urgency in ('baixa', 'media', 'alta', 'critica')),
  started boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  expired boolean not null default false,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position int not null default 0,
  due_date timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  type text not null default 'penalty' check (type in ('penalty', 'warning', 'info')),
  read boolean not null default false,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Guarda as inscrições de notificação push (Web Push) de cada dispositivo/navegador.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_community_id_idx on public.tasks (community_id);
create index if not exists subtasks_task_id_idx on public.subtasks (task_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists community_members_user_id_idx on public.community_members (user_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- ============================================================================
-- FUNÇÕES AUXILIARES (security definer -> usadas dentro das policies para
-- evitar recursão de RLS e para operações controladas que precisam ignorar RLS)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_community_member(_community_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where community_id = _community_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_community_creator(_community_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.communities
    where id = _community_id and creator_id = auth.uid()
  );
$$;

-- Cria o profile automaticamente quando alguém se cadastra (e-mail/senha ou OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_seed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cria uma comunidade e já matricula quem criou, de forma atômica.
create or replace function public.create_community(_name text, _type text, _severity text)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  _community public.communities;
  _code text;
begin
  _code := upper(substr(md5(random()::text), 1, 6));
  insert into public.communities (name, type, severity, invite_code, creator_id)
  values (_name, _type, _severity, _code, auth.uid())
  returning * into _community;

  insert into public.community_members (community_id, user_id)
  values (_community.id, auth.uid());

  return _community;
end;
$$;

-- Entra em uma comunidade a partir do código de convite.
create or replace function public.join_community_with_code(_code text)
returns public.communities
language plpgsql
security definer
set search_path = public
as $$
declare
  _community public.communities;
begin
  select * into _community from public.communities where upper(invite_code) = upper(_code);
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  insert into public.community_members (community_id, user_id)
  values (_community.id, auth.uid())
  on conflict do nothing;

  return _community;
end;
$$;

-- Gera um novo código de convite (só quem criou a comunidade ou um admin).
create or replace function public.regenerate_invite_code(_community_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_code text;
begin
  if not (public.is_community_creator(_community_id) or public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;
  _new_code := upper(substr(md5(random()::text), 1, 6));
  update public.communities set invite_code = _new_code where id = _community_id;
  return _new_code;
end;
$$;

-- Ranking agregado de toda a plataforma (Muro Global): calculado no servidor para
-- que ninguém precise enxergar as tarefas de comunidades das quais não participa —
-- só o total de pontos perdidos, tarefas expiradas e nº de comunidades de cada pessoa.
create or replace function public.global_wall()
returns table (
  user_id uuid,
  name text,
  avatar_seed text,
  role text,
  lost_points bigint,
  expired_count bigint,
  community_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id as user_id,
    p.name,
    p.avatar_seed,
    p.role,
    coalesce(sum(case when t.expired and not t.completed then
      case t.urgency
        when 'baixa' then 1
        when 'media' then 3
        when 'alta' then 5
        when 'critica' then 10
        else 0
      end
    else 0 end), 0) as lost_points,
    count(distinct t.id) filter (where t.expired and not t.completed) as expired_count,
    (select count(*) from public.community_members cm where cm.user_id = p.id) as community_count
  from public.profiles p
  left join public.tasks t on t.user_id = p.id
  group by p.id, p.name, p.avatar_seed, p.role;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_creator(uuid) to authenticated;
grant execute on function public.create_community(text, text, text) to authenticated;
grant execute on function public.join_community_with_code(text) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.global_wall() to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: qualquer pessoa autenticada pode ver nome/avatar de qualquer usuário
-- (necessário para rankings e listagem de membros). Só o próprio dono edita seu perfil,
-- e apenas os campos nome/avatar — a coluna "role" não pode ser alterada pelo cliente.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (name, avatar_seed) on public.profiles to authenticated;

-- communities: visível para quem é membro (ou admin). Criar é livre para qualquer
-- autenticado (via a função create_community). Editar/excluir só criador ou admin.
drop policy if exists "communities_select_member" on public.communities;
create policy "communities_select_member" on public.communities for select to authenticated
  using (public.is_community_member(id) or public.is_admin());

drop policy if exists "communities_update_creator" on public.communities;
create policy "communities_update_creator" on public.communities for update to authenticated
  using (creator_id = auth.uid() or public.is_admin());

drop policy if exists "communities_delete_creator" on public.communities;
create policy "communities_delete_creator" on public.communities for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- community_members: visível para membros da mesma comunidade (ou admin).
drop policy if exists "members_select_same_community" on public.community_members;
create policy "members_select_same_community" on public.community_members for select to authenticated
  using (public.is_community_member(community_id) or public.is_admin());

drop policy if exists "members_delete_self_or_creator" on public.community_members;
create policy "members_delete_self_or_creator" on public.community_members for delete to authenticated
  using (user_id = auth.uid() or public.is_community_creator(community_id) or public.is_admin());

-- tasks: dono sempre vê e edita as próprias. Tarefas de uma comunidade são visíveis
-- para todos os membros dela, mas só o dono edita/exclui/conclui.
drop policy if exists "tasks_select_own_or_community" on public.tasks;
create policy "tasks_select_own_or_community" on public.tasks for select to authenticated
  using (
    user_id = auth.uid()
    or (community_id is not null and public.is_community_member(community_id))
    or public.is_admin()
  );

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using (user_id = auth.uid());

-- subtasks: seguem a visibilidade da tarefa. Marcar feito/não feito é permitido para
-- o dono da tarefa e para colegas da mesma comunidade (checklist colaborativo em
-- comunidades de Trabalho); tarefas pessoais só o dono mexe.
drop policy if exists "subtasks_select_via_task" on public.subtasks;
create policy "subtasks_select_via_task" on public.subtasks for select to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (
        t.user_id = auth.uid()
        or (t.community_id is not null and public.is_community_member(t.community_id))
        or public.is_admin()
      )
  ));

drop policy if exists "subtasks_insert_via_task_owner" on public.subtasks;
create policy "subtasks_insert_via_task_owner" on public.subtasks for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid()));

drop policy if exists "subtasks_update_via_task_or_community" on public.subtasks;
create policy "subtasks_update_via_task_or_community" on public.subtasks for update to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and (t.user_id = auth.uid() or (t.community_id is not null and public.is_community_member(t.community_id)))
  ));

drop policy if exists "subtasks_delete_via_task_owner" on public.subtasks;
create policy "subtasks_delete_via_task_owner" on public.subtasks for delete to authenticated
  using (exists (select 1 from public.tasks t where t.id = subtasks.task_id and t.user_id = auth.uid()));

-- notifications: cada um só vê e mexe nas próprias.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- push_subscriptions: cada um só vê e mexe nas próprias inscrições. As Edge
-- Functions que disparam os pushes usam a service role key, que ignora RLS.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Promover o primeiro administrador
-- ============================================================================
-- Depois de criar sua conta pelo app, rode manualmente (trocando o e-mail):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'voce@exemplo.com');
--
-- Por segurança, isso não pode ser feito pelo próprio app (só via SQL Editor/dashboard).
