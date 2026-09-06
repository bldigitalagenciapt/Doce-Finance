# 🎂 Doce Finance

SaaS completo para confeiteiras gerenciarem **ingredientes, receitas (ficha técnica), precificação, clientes, pedidos e agenda** — com seletor de moeda **Real (R$) / Euro (€)**.

Construído com **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** e **Supabase**.

---

## ✨ Funcionalidades

- **Dashboard** — métricas do mês (pedidos, faturamento, clientes, receitas), próximas entregas e pedidos recentes.
- **Ingredientes** — cadastro com cálculo automático de custo por unidade, busca e filtro por categoria.
- **Receitas / Ficha Técnica** — montagem de receita com ingredientes, custos extras, slider de margem e preço sugerido em tempo real.
- **Calculadora** — custo proporcional por porção e calculadora de margem bidirecional (preço ⇄ margem).
- **Clientes** — base de clientes com total gasto e número de pedidos.
- **Pedidos** — tabs por status, itens dinâmicos, desconto e total em tempo real.
- **Agenda** — calendário mensal com as entregas agendadas.
- **Configurações** — dados do atelier, **seletor de moeda (BRL/EUR)** e troca de senha.
- **Autenticação** — login/registro via Supabase Auth, com proteção de rotas por middleware.

---

## 🧱 Stack

| Camada        | Tecnologia                          |
| ------------- | ----------------------------------- |
| Framework     | Next.js 14 (App Router)             |
| Linguagem     | TypeScript                          |
| Estilo        | Tailwind CSS + Lucide Icons         |
| Backend/Auth  | Supabase (PostgreSQL + Auth + RLS)  |
| Estado global | Zustand                             |
| Notificações  | react-hot-toast                     |
| Datas         | date-fns                            |

---

## 🚀 Rodando localmente

### 1. Pré-requisitos
- Node.js 18.17+ (recomendado 20+)
- Uma conta no [Supabase](https://supabase.com)

### 2. Clonar e instalar
```bash
git clone https://github.com/bldigitalagenciapt/gestao-confeitaria.git
cd gestao-confeitaria
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env.local` na raiz (use o `.env.example` como base):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key
```

### 4. Configurar o banco de dados
No painel do Supabase, abra **SQL Editor** e execute o script `supabase/schema.sql`
(disponível neste repositório). Ele cria todas as tabelas, triggers, funções e as
políticas de **Row Level Security (RLS)**.

> Opcional: em **Storage**, crie um bucket `atelier-images` (privado) caso queira
> habilitar upload de fotos de receitas/avatares.

### 5. Rodar
```bash
npm run dev
```
Acesse **http://localhost:3000**. Crie sua conta na tela de login e comece a usar.

---

## 📦 Scripts

| Comando          | Descrição                          |
| ---------------- | ---------------------------------- |
| `npm run dev`    | Servidor de desenvolvimento        |
| `npm run build`  | Build de produção                  |
| `npm run start`  | Servidor de produção               |
| `npm run lint`   | Verificação de lint                |

---

## 📁 Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/login/          # Tela de login/registro
│   ├── (app)/                 # Área autenticada (com sidebar + header)
│   │   ├── dashboard/
│   │   ├── ingredientes/
│   │   ├── receitas/          # lista, nova, [id]
│   │   ├── calculadora/
│   │   ├── clientes/
│   │   ├── pedidos/
│   │   ├── agenda/
│   │   └── configuracoes/
│   ├── layout.tsx             # Root layout (fontes + Toaster)
│   └── page.tsx               # Redireciona → /dashboard ou /login
├── components/
│   ├── layout/                # Sidebar, Header
│   ├── ui/                    # Button, Input, Modal, Table, Badge, ...
│   ├── dashboard/  ingredientes/  receitas/  clientes/  pedidos/
├── hooks/                     # useCurrency, useProfile, useSupabase
├── lib/
│   ├── supabase/              # client, server, middleware
│   ├── orderStatus.ts
│   └── utils.ts
├── store/useAppStore.ts       # Zustand (profile, currency)
├── types/database.ts          # Tipos do schema Supabase
└── middleware.ts              # Proteção de rotas
```

---

## 💱 Seletor de moeda

A moeda é salva em `profiles.currency` (`BRL` ou `EUR`) e mantida no estado global (Zustand).
O hook `useCurrency()` expõe `format(value)` e `symbol`, aplicados em **todas** as telas com
valores monetários. Troque a moeda em **Configurações**.

---

## 🔒 Segurança

Todas as tabelas usam **RLS** no Supabase: cada usuária só acessa os próprios dados
(`auth.uid() = user_id`). As credenciais ficam em `.env.local` e **não** são versionadas.

---

© 2026 Doce Finance
