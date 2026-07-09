# Flawless

Aplicativo de produtividade híbrido (pessoal/trabalho) com foco em execução estratégica, gestão de comunidades e **gamificação reversa**. Dark mode minimalista com detalhes em roxo e verde neon.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, React Router, [Supabase](https://supabase.com) (Postgres + Auth, incluindo login por e-mail/senha e OAuth Google/Microsoft).

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

### Limitação conhecida: expiração de tarefas

A checagem de "essa tarefa expirou" roda no navegador de cada usuário (a cada ~15s enquanto o app está aberto, e uma vez ao logar), e só atualiza as **próprias** tarefas de quem está com o app aberto naquele momento — não há um cron job no servidor. Isso significa que a tarefa de uma pessoa que não abre o app há dias só será marcada como expirada (e só vai contar no ranking) na próxima vez que ela logar. Para expiração 100% em tempo real independente de quem está online, seria necessário um Supabase Edge Function agendado (`pg_cron`), o que pode ser adicionado depois.

## Deploy no Vercel

O projeto é uma SPA estática gerada por `vite build` (saída em `dist/`) e já inclui um `vercel.json` com o rewrite necessário para as rotas do React Router.

1. Importe este repositório em [vercel.com/new](https://vercel.com/new) — o preset **Vite** é detectado automaticamente (`npm run build`, output `dist`).
2. Em **Settings -> Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env.local`.
3. Se for usar Google/Microsoft, adicione também a URL de produção (`https://seu-app.vercel.app`) nas **Redirect URLs** permitidas em Supabase -> Authentication -> URL Configuration.
