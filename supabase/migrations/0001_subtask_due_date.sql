-- Adiciona prazo opcional por subtarefa.
-- Rode isso no SQL Editor do seu projeto Supabase se o banco já foi criado
-- antes desta mudança (supabase/schema.sql já inclui essa coluna para projetos novos).

alter table public.subtasks add column if not exists due_date timestamptz;
