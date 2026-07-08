# FailSync

Aplicativo de produtividade híbrido (pessoal/trabalho) com foco em execução estratégica, gestão de comunidades e **gamificação reversa**. Dark mode minimalista com detalhes em roxo e verde neon.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, Zustand (com persistência em `localStorage`), React Router.

Não há backend: todos os dados (usuários, comunidades, tarefas, ranking) vivem no `localStorage` do navegador, populados por um seed de demonstração ao iniciar.

## Rodando localmente

```bash
npm install
npm run dev
```

## Credenciais de demonstração

- **Admin:** `admin@failsync.com` / `senha123`
- **Membros:** `ana@failsync.com`, `bruno@failsync.com`, `carla@failsync.com`, `diego@failsync.com` (sem senha, login por e-mail)
- **Convite:** gere um código na tela de Admin de uma comunidade e entre pela aba "Convite" do login com nome/e-mail fictícios.

## Funcionalidades

- **Autenticação por papel**: login de Administrador (com painel exclusivo) e login de Membro comum.
- **Gestão de comunidades**: criação de comunidades com gravidade geral, geração/renovação de código de convite e adição instantânea de membros fictícios para popular o ranking.
- **Regra rígida de criação de tarefas**: toda tarefa exige Objetivo Macro, Título, checklist de subtarefas (Plano de Execução), Prazo e Nível de Urgência antes de liberar o botão Salvar.
- **Gamificação reversa — Muro da Procrastinação**: ranking invertido por pontos perdidos (Baixa -1, Média -3, Alta -5, Crítica -10), recalculado automaticamente quando uma tarefa expira, com notificação visual (toast) imediata.
- **Dashboards**: painel pessoal com contagem regressiva de prazos, e Admin Dashboard com progresso geral, comunidades e membros.

## Deploy no Vercel

O projeto é uma SPA estática gerada por `vite build` (saída em `dist/`) e já inclui um `vercel.json` com o rewrite necessário para as rotas do React Router. Para publicar:

1. Importe este repositório em [vercel.com/new](https://vercel.com/new) — o preset **Vite** é detectado automaticamente (`npm run build`, output `dist`).
2. Ou, via CLI: `npx vercel` (preview) e `npx vercel --prod` (produção).

Como não há backend, nenhuma variável de ambiente é necessária.
