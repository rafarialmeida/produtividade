-- Permite que o dono da plataforma responda e exclua relatos de bug/melhoria.
-- A resposta vira uma notificação in-app pra quem reportou.

alter table public.bug_reports add column if not exists admin_reply text;
alter table public.bug_reports add column if not exists replied_at timestamptz;

alter table public.notifications add column if not exists bug_report_id uuid references public.bug_reports (id) on delete set null;

create or replace function public.reply_to_bug_report(_report_id uuid, _reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _reporter_id uuid;
begin
  if (auth.jwt() ->> 'email') <> 'rafael.farialmeida@gmail.com' then
    raise exception 'NOT_ALLOWED';
  end if;
  if trim(coalesce(_reply, '')) = '' then
    raise exception 'EMPTY_MESSAGE';
  end if;

  select user_id into _reporter_id from public.bug_reports where id = _report_id;
  if _reporter_id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.bug_reports
  set admin_reply = trim(_reply), replied_at = now()
  where id = _report_id;

  insert into public.notifications (user_id, type, message, bug_report_id)
  values (_reporter_id, 'info', 'Resposta sobre o seu relato: ' || trim(_reply), _report_id);
end;
$$;

create or replace function public.delete_bug_report(_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.jwt() ->> 'email') <> 'rafael.farialmeida@gmail.com' then
    raise exception 'NOT_ALLOWED';
  end if;

  delete from public.bug_reports where id = _report_id;
end;
$$;

grant execute on function public.reply_to_bug_report(uuid, text) to authenticated;
grant execute on function public.delete_bug_report(uuid) to authenticated;
