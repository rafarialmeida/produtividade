# Flawless

Aplicativo de produtividade híbrido (pessoal/trabalho) com foco em execução estratégica, gestão de comunidades e **gamificação reversa**. Dark mode minimalista com detalhes em roxo e verde neon.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, React Router, [Supabase](https://supabase.com) (Postgres + Auth, incluindo login por e-mail/senha e OAuth Google/Microsoft). PWA instalável (`vite-plugin-pwa`) com notificações Web Push.

Contas, comunidades, tarefas e o ranking ficam num banco Postgres real (Supabase), com Row Level Security controlando quem vê o quê — não há mais dados de demonstração/seed.

## Configurando o Supabase (obrigatório antes de rodar)

1. Crie uma conta e um projeto gratuito em [supabase.com](https://supabase.com/dashboard).
2. No painel do projeto, abra **SQL Editor -> New query**, cole todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e rode. Isso cria as tabelas, as políticas de segurança (RLS) e as funções auxiliares.
3. Em **Project Settings -> API**, copie a **Project URL** e a chave **anon/public**.
4. Copie `.env.example` para `.env.local` e preencha com esses dois valores:
   ```bash
   cp .env.example .env.local
   ```
5. Rode o app:
   ```bash
   npm install
   npm run dev
   ```

### Login por e-mail/senha

Funciona direto após o passo acima. Por padrão o Supabase exige confirmação por e-mail antes do primeiro login — se quiser desativar isso em desenvolvimento, vá em **Authentication -> Providers -> Email** e desmarque "Confirm email".

### Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **OAuth Client ID** do tipo "Web application".
2. Em **Authorized redirect URIs**, adicione: `https://SEU-PROJETO.supabase.co/auth/v1/callback` (pegue a URL exata em Supabase -> Authentication -> Providers -> Google).
3. Copie o **Client ID** e o **Client Secret** gerados e cole em Supabase -> Authentication -> Providers -> Google. Ative o provider.

### Login com Microsoft

No Supabase, o provider de Microsoft chama-se **Azure**.

1. No [Azure Portal](https://portal.azure.com) -> Microsoft Entra ID -> **App registrations -> New registration**.
2. Em **Redirect URI**, adicione: `https://SEU-PROJETO.supabase.co/auth/v1/callback` (mesma URL exibida em Supabase -> Authentication -> Providers -> Azure).
3. Em **Certificates & secrets**, crie um **Client secret** e copie o valor.
4. Em Supabase -> Authentication -> Providers -> Azure, cole o **Application (client) ID**, o **Client secret** e o **Azure Tenant URL/ID**. Ative o provider.

### Primeiro administrador

Ninguém nasce administrador — toda conta nova começa como `member`. Depois de criar sua conta pelo app, promova-se rodando no SQL Editor (trocando o e-mail):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'voce@exemplo.com');
```

## Navegação

- **Meu dia**: painel pessoal com as tarefas de todas as suas comunidades reunidas, calendário mensal, Mural do Humor, e contagem regressiva de prazos.
- **Comunidades**: hub com as comunidades de que você participa, criação de novas comunidades e entrada em outras via código de convite.
- **Muro Global**: ranking invertido de toda a plataforma, somando pontos perdidos em todas as comunidades de cada usuário (calculado no servidor, sem expor tarefas de comunidades das quais você não participa).
- **Admin**: exclusivo para administradores — progresso geral, todas as comunidades e seus membros.

## Funcionalidades

- **Contas reais**: cadastro por e-mail/senha (com confirmação por e-mail) ou login com Google/Microsoft.
- **Dois tipos de comunidade**: **Trabalho** (projetos e tarefas em conjunto com colegas) e **Competição** (só ranking entre amigos, cada um com suas próprias metas). Qualquer usuário — não só o admin — pode criar uma comunidade e convidar pessoas por código de convite.
- **Tarefas com ou sem comunidade**: dá para criar uma tarefa 100% pessoal, sem vínculo com nenhum grupo.
- **Regra rígida de criação de tarefas**: toda tarefa exige Objetivo Macro, Título, Categoria, checklist de subtarefas (Plano de Execução), Prazo e Nível de Urgência antes de liberar o botão Salvar.
- **Quatro status de tarefa**: Não iniciada, Em andamento, Concluída e Expirada, com botões para mover entre Não iniciada e Em andamento.
- **Gamificação reversa — Muro da Procrastinação**: ranking invertido por pontos perdidos (Baixa -1, Média -3, Alta -5, Crítica -10) em cada comunidade, recalculado automaticamente quando uma tarefa expira, com notificação visual (toast) imediata.
- **Preferências de notificação**: cada pessoa escolhe (no ícone de engrenagem ao lado do sino) se quer receber push de prazo chegando perto, só para tarefas Alta/Crítica, de tarefa expirada e/ou de parabéns ao concluir uma tarefa.

### Expiração de tarefas: cliente + servidor

Enquanto o app está aberto, o navegador checa localmente (a cada ~15s) as **próprias** tarefas vencidas e já marca como expiradas na hora. Além disso, se você configurar a Edge Function `push-sweep` (seção abaixo), o próprio servidor varre **todas** as tarefas de **todos** os usuários a cada 5 minutos via `pg_cron` — então uma tarefa expira e entra no ranking mesmo que a pessoa não abra o app. A Edge Function é opcional para o app funcionar, mas é obrigatória para as notificações push e para expiração 100% confiável independente de quem está online.

## PWA instalável

O app já é instalável (ícone na tela inicial / barra de endereço do navegador, abre em janela própria, funciona offline para os assets já visitados) sem nenhuma configuração extra — isso é gerado automaticamente no `npm run build` via `vite-plugin-pwa`. Não tem custo nenhum, tanto local quanto no Vercel.

## Notificações Web Push

Push notifications (fora do app, mesmo com o navegador fechado) também não têm custo — usam o padrão Web Push nativo do navegador com um par de chaves VAPID geradas por você, sem depender de nenhum serviço pago. Tem duas partes: o **cliente** (já pronto no código: o sininho no cabeçalho do app pede permissão e salva a inscrição) e o **servidor** (a Edge Function `push-sweep`, que você precisa implantar manualmente, já que não dá pra fazer isso pelo Git).

### 1. Gerar as chaves VAPID

Rode uma vez, localmente:

```bash
npx web-push generate-vapid-keys
```

Isso gera uma `publicKey` e uma `privateKey`. Guarde as duas.

### 2. Configurar o cliente

Adicione a chave pública no `.env.local` (e no Vercel, ver seção de deploy):

```
VITE_VAPID_PUBLIC_KEY=<publicKey gerada acima>
```

### 3. Rodar as migrações novas do banco

Se o seu banco já existia antes desta funcionalidade, rode no SQL Editor (nessa ordem) os arquivos que ainda não rodou em `supabase/migrations/`:

- `0002_push_notifications.sql` — cria `push_subscriptions`, `tasks.reminder_sent_at`, `notifications.task_id`.
- `0004_notification_preferences.sql` — cria as colunas de preferência (`notify_reminder`, `notify_expired`, `notify_completed`, `notify_only_urgent`) em `profiles` e adiciona o tipo `success` às notificações (usado no aviso de tarefa concluída).

Projetos novos já recebem tudo isso rodando só o `supabase/schema.sql`.

### 4. Implantar a Edge Function

Duas formas, escolha uma:

- **Painel do Supabase** (sem instalar nada): Edge Functions -> Create a new function, cole o conteúdo de [`supabase/functions/push-sweep/index.ts`](./supabase/functions/push-sweep/index.ts) e clique em Deploy. O Supabase pode dar um nome aleatório à função em vez do que você digitou — se isso acontecer, defina `VITE_PUSH_FUNCTION_NAME` (local e no Vercel) com o nome real que ele gerou, para o app saber qual função chamar ao parabenizar uma tarefa concluída.
- **Supabase CLI**: requer [instalação](https://supabase.com/docs/guides/cli) e login (`supabase login`, `supabase link --project-ref SEU_PROJECT_REF`).
  ```bash
  supabase functions deploy push-sweep
  ```

Depois, configure as senhas que a função usa (painel: Edge Functions -> Secrets; ou CLI):

```bash
supabase secrets set VAPID_PUBLIC_KEY=<publicKey> VAPID_PRIVATE_KEY=<privateKey> VAPID_SUBJECT=mailto:seu-email@exemplo.com
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente dentro da função — não precisa configurar.)

Sempre que o código de `supabase/functions/push-sweep/index.ts` mudar neste repositório (por exemplo, ao adicionar um novo tipo de notificação), repita este passo — cole o conteúdo atualizado e clique em Deploy de novo.

### 5. Agendar a varredura periódica

1. No dashboard, em **Database -> Extensions**, habilite `pg_cron` e `pg_net`.
2. Abra `supabase/migrations/0003_schedule_push_sweep.sql`, troque `SEU_PROJECT_REF` e `SUA_SERVICE_ROLE_KEY` (Project Settings -> API -> service_role — **nunca** coloque essa chave no frontend) pelos valores reais, e rode o SQL resultante no SQL Editor.

A partir daí, a cada 5 minutos o servidor expira tarefas vencidas de todo mundo e envia um push pra quem tiver prazo perto ou tarefa recém-expirada — mesmo com o app fechado.

## Deploy no Vercel

O projeto é uma SPA estática gerada por `vite build` (saída em `dist/`) e já inclui um `vercel.json` com o rewrite necessário para as rotas do React Router.

1. Importe este repositório em [vercel.com/new](https://vercel.com/new) — o preset **Vite** é detectado automaticamente (`npm run build`, output `dist`).
2. Em **Settings -> Environment Variables**, adicione `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_VAPID_PUBLIC_KEY` com os mesmos valores do seu `.env.local`.
3. Se for usar Google/Microsoft, adicione também a URL de produção (`https://seu-app.vercel.app`) nas **Redirect URLs** permitidas em Supabase -> Authentication -> URL Configuration.
