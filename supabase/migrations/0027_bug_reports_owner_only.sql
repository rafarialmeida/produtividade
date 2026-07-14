-- Restringe a visibilidade dos relatos de bug/melhoria só à conta do dono da
-- plataforma (rafael.farialmeida@gmail.com), em vez de qualquer admin. Tanto
-- a leitura (RLS) quanto a notificação in-app gerada por report_bug passam a
-- valer só pra essa conta específica.

drop policy if exists "bug_reports_select" on public.bug_reports;
create policy "bug_reports_select" on public.bug_reports for select to authenticated
  using (user_id = auth.uid() or (auth.jwt() ->> 'email') = 'rafael.farialmeida@gmail.com');

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
  select u.id, 'info',
    coalesce(_reporter_name, 'Alguém') || ' reportou ' || _label || ': ' || left(trim(_message), 160)
  from auth.users u
  where u.email = 'rafael.farialmeida@gmail.com';

  return _id;
end;
$$;
