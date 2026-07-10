-- Suporte a notificações push (Web Push).
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essas mudanças para projetos novos).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- Evita reenviar o mesmo lembrete de "prazo perto" repetidas vezes.
alter table public.tasks add column if not exists reminder_sent_at timestamptz;

-- Permite que uma notificação linke para a tarefa que a gerou (deep link do push).
alter table public.notifications add column if not exists task_id uuid references public.tasks (id) on delete set null;
