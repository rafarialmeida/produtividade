-- Termo de aceite (Termos de Uso + Política de Privacidade), exigido de todo
-- usuário por conta do tratamento de dados pessoais (nome, e-mail, foto, tarefas).

alter table public.profiles add column if not exists terms_accepted_at timestamptz;

grant update (terms_accepted_at) on public.profiles to authenticated;
