-- Adiciona a opção "dia sim, dia não" na recorrência de tarefas.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essa mudança para projetos novos).

alter table public.tasks drop constraint if exists tasks_recurrence_check;
alter table public.tasks add constraint tasks_recurrence_check
  check (recurrence in ('daily', 'every_other_day', 'weekly', 'biweekly', 'monthly'));
