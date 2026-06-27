# HomeStock

A self-aware home inventory: knows who lives in the household, how much they consume, and when things will run out.

Built per [the HomeStock spec](./docs/spec.md) — Node.js · TypeScript · React · Prisma · Vercel.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TanStack Query, Tailwind |
| Backend | Express + TypeScript |
| ORM | Prisma + PostgreSQL (Supabase) |
| Validation | Zod (shared with frontend) |
| AI | Anthropic Claude (vision + text) |
| Email | Resend |
| Tests | Vitest + Supertest |
| Tooling | pnpm workspaces + Turborepo |
| Hosting | Vercel (web + serverless API + cron) |

## Repository layout

```
homestock/
├── apps/
│   ├── api/        Express + Prisma backend
│   └── web/        React + Vite frontend
├── packages/
│   └── types/      Shared TS types (used by both apps)
├── api/index.ts    Vercel serverless entry → apps/api
├── vercel.json     Build, rewrites, and cron schedule
└── turbo.json
```

## Rodando localmente

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- PostgreSQL local **ou** uma instância no [Supabase](https://supabase.com) (free tier)

### Instalação

```bash
pnpm install
cp .env.example .env
```

Edite o `.env` com os valores reais. Para dev local com auth desabilitado, o mínimo é:

```env
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
AUTH_DISABLED="true"
```

> **Supabase:** copie as URLs em *Settings → Database → Connection string* (porta 6543 para `DATABASE_URL`, porta 5432 para `DIRECT_URL`). Caracteres especiais na senha devem ser URL-encoded (`/` → `%2F`, `$` → `%24`, `+` → `%2B`).

### Banco de dados

```bash
pnpm db:generate        # gera o Prisma Client
pnpm db:migrate         # aplica as migrations
pnpm --filter @homestock/api exec tsx prisma/seed.ts   # dados iniciais (opcional)
```

### Iniciar

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (proxied via Vite em `/api`)

## Tests

```bash
pnpm test                        # all tests
pnpm --filter @homestock/api test
```

## API surface

All endpoints under `/api/v1/...`. See [the spec](./docs/spec.md#5-api-design) for the
full table; in short:

- `/members`, `/members/:id/routine`
- `/products`, `/products/:id/restock`, `/products/:id/duration`, `/products/:id/alert-config`
- `/categories`
- `/ai/extract-routine`, `/ai/infer-duration`, `/ai/extract-product-from-image`
- `/alerts`, `/alerts/summary`
- `/settings`
- `/internal/alerts/digest` — cron-only

The **same API** powers the web app and the planned WhatsApp agent — no
channel-specific logic in the backend.

## Auth (v1)

Single-household. Three modes — pick one:

- `AUTH_DISABLED=true` — open access (default for local dev).
- `JWT_SECRET=...` — Bearer JWT for the web app.
- `HOMESTOCK_API_KEYS=key1,key2` — comma-separated static API keys for external clients (e.g. WhatsApp agent), passed via `X-API-Key`.

Multi-tenancy is explicitly out of scope for v1.

## Deploy (Vercel + Supabase)

1. Crie um projeto no [Supabase](https://supabase.com) e copie as URLs de conexão em *Settings → Database*.
2. Instale a Vercel CLI: `npm install -g vercel` e faça login com `vercel login`.
3. Link o projeto: `vercel link`.
4. Adicione as variáveis de ambiente no Vercel:
   ```
   vercel env add DATABASE_URL production   # URL pooled (porta 6543)
   vercel env add DIRECT_URL production     # URL direct (porta 5432)
   vercel env add JWT_SECRET production
   vercel env add ANTHROPIC_API_KEY production
   vercel env add RESEND_API_KEY production
   vercel env add DIGEST_FROM_EMAIL production
   vercel env add WEB_ORIGIN production     # ex: https://seu-app.vercel.app
   ```
5. Aplique as migrations no banco remoto:
   ```bash
   cd apps/api && npx prisma migrate deploy
   ```
6. Faça push no GitHub — o Vercel deploya automaticamente a cada commit.

> O cron de alertas já está configurado em `vercel.json` para 08:00 BRT (`0 11 * * *` UTC). O `CRON_SECRET` é gerado automaticamente pelo Vercel.
