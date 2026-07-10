-- Preferências de notificação push por usuário + tipo "success" de notificação
-- (usado para parabenizar ao concluir uma tarefa).
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essas mudanças para projetos novos).

alter table public.profiles add column if not exists notify_reminder boolean not null default true;
alter table public.profiles add column if not exists notify_expired boolean not null default true;
alter table public.profiles add column if not exists notify_completed boolean not null default true;
alter table public.profiles add column if not exists notify_only_urgent boolean not null default false;

grant update (notify_reminder, notify_expired, notify_completed, notify_only_urgent) on public.profiles to authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('penalty', 'warning', 'info', 'success'));
