-- Tarefas recorrentes: ao concluir (ou expirar) uma tarefa com recorrência definida,
-- o app cria automaticamente a próxima ocorrência com um novo prazo.
-- Rode isso no SQL Editor do seu projeto Supabase (supabase/schema.sql já inclui
-- essa mudança para projetos novos).

alter table public.tasks add column if not exists recurrence text check (recurrence in ('daily', 'weekly', 'biweekly', 'monthly'));
