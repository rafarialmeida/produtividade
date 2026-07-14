-- Qualquer usuário pode reportar um bug ou sugerir uma melhoria. O relato
-- fica registrado em bug_reports e gera uma notificação in-app para todo
-- admin da plataforma (hoje, só você).

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('bug', 'melhoria')),
  message text not null,
  page_url text,
  created_at timestamptz not null default now()
);

create index if not exists bug_reports_user_idx on public.bug_reports (user_id);
create index if not exists bug_reports_created_idx on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- Quem reportou vê o próprio relato; admins da plataforma veem todos. Toda
-- escrita passa pela função abaixo (security definer).
drop policy if exists "bug_reports_select" on public.bug_reports;
create policy "bug_reports_select" on public.bug_reports for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.report_bug(_type text, _message text, _page_url text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
  _reporter_name text;
  _label text;
begin
  if _type not in ('bug', 'melhoria') then
    raise exception 'INVALID_TYPE';
  end if;
  if trim(coalesce(_message, '')) = '' then
    raise exception 'EMPTY_MESSAGE';
  end if;

  insert into public.bug_reports (user_id, type, message, page_url)
  values (auth.uid(), _type, trim(_message), _page_url)
  returning id into _id;

  select name into _reporter_name from public.profiles where id = auth.uid();
  _label := case when _type = 'bug' then 'um bug' else 'uma melhoria' end;

  insert into public.notifications (user_id, type, message)
  select p.id, 'info',
    coalesce(_reporter_name, 'Alguém') || ' reportou ' || _label || ': ' || left(trim(_message), 160)
  from public.profiles p
  where p.role = 'admin';

  return _id;
end;
$$;

grant execute on function public.report_bug(text, text, text) to authenticated;
