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

## Setup

```bash
pnpm install
cp .env.example .env             # fill in real values
pnpm db:generate
pnpm db:migrate                  # creates tables locally
pnpm --filter @homestock/api exec tsx prisma/seed.ts
pnpm dev
```

Frontend on http://localhost:5173, API on http://localhost:3001 (proxied via Vite).

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

## Deployment (Vercel)

1. Create a Supabase project, copy the **pooled** `DATABASE_URL` (port 6543).
2. Set Vercel env vars:
   - `DATABASE_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `DIGEST_FROM_EMAIL`
   - `JWT_SECRET` (or `HOMESTOCK_API_KEYS`)
3. `vercel.json` already wires the cron at 08:00 BRT (`0 11 * * *` UTC).
4. The `CRON_SECRET` is set automatically by Vercel and verified by the digest endpoint.
