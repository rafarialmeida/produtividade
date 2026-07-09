# Flawless

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

- **Admin:** `admin@flawless.com` / `senha123`
- **Membros:** `ana@flawless.com`, `bruno@flawless.com`, `carla@flawless.com`, `diego@flawless.com` (sem senha, login por e-mail)
- **Convite:** gere um código na tela de Admin de uma comunidade e entre pela aba "Convite" do login com nome/e-mail fictícios.

## Navegação

- **Meu dia**: painel pessoal com as tarefas de todas as suas comunidades reunidas, contagem regressiva de prazos e criação rápida de tarefas.
- **Comunidades**: hub com as comunidades de que você participa, criação de novas comunidades e entrada em outras via código de convite.
- **Muro Global**: ranking invertido de toda a plataforma, somando pontos perdidos em todas as comunidades de cada usuário.
- **Admin**: exclusivo para administradores — progresso geral, todas as comunidades e seus membros.

## Funcionalidades

- **Autenticação por papel**: login de Administrador (com painel exclusivo) e login de Membro comum.
- **Dois tipos de comunidade**: **Trabalho** (projetos e tarefas em conjunto com colegas) e **Competição** (só ranking entre amigos, cada um com suas próprias metas). Qualquer usuário — não só o admin — pode criar uma comunidade e convidar pessoas.
- **Convites**: código de convite copiável/renovável por comunidade, entrada por código estando logado (na aba Comunidades) ou ainda deslogado (tela de login), e adição instantânea de membros fictícios para popular o ranking.
- **Regra rígida de criação de tarefas**: toda tarefa exige Objetivo Macro, Título, checklist de subtarefas (Plano de Execução), Prazo e Nível de Urgência antes de liberar o botão Salvar.
- **Gamificação reversa — Muro da Procrastinação**: ranking invertido por pontos perdidos (Baixa -1, Média -3, Alta -5, Crítica -10) em cada comunidade, recalculado automaticamente quando uma tarefa expira, com notificação visual (toast) imediata.

## Deploy no Vercel

O projeto é uma SPA estática gerada por `vite build` (saída em `dist/`) e já inclui um `vercel.json` com o rewrite necessário para as rotas do React Router. Para publicar:

1. Importe este repositório em [vercel.com/new](https://vercel.com/new) — o preset **Vite** é detectado automaticamente (`npm run build`, output `dist`).
2. Ou, via CLI: `npx vercel` (preview) e `npx vercel --prod` (produção).

Como não há backend, nenhuma variável de ambiente é necessária.
