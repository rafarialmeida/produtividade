-- Observação (nota) opcional por subtarefa.

alter table public.subtasks add column if not exists note text;
