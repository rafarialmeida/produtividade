-- Agenda a Edge Function "push-sweep" para rodar a cada 5 minutos via pg_cron + pg_net.
-- Antes de rodar:
--   1. Habilite as extensões "pg_cron" e "pg_net" em Database -> Extensions no dashboard.
--   2. Faça o deploy da função: supabase functions deploy push-sweep
--   3. Troque os dois placeholders abaixo:
--      - SEU_PROJECT_REF: o ref do projeto (aparece na URL do dashboard e em Project Settings -> General)
--      - SUA_SERVICE_ROLE_KEY: Project Settings -> API -> service_role key (NUNCA exponha essa chave no frontend)

select cron.schedule(
  'push-sweep-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.functions.supabase.co/push-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para remover o agendamento no futuro, se precisar:
-- select cron.unschedule('push-sweep-every-5-min');
