-- Descrição livre do objetivo macro (links, menções a pessoas, contexto),
-- igual ao campo de observação que já existe nas subtarefas.
alter table public.macro_objectives add column if not exists description text;
