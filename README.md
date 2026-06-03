# Acme External Portal — UI mockup

UI-only mockup of the Acme external portal. No backend, no auth, no real API. Used to show the dev team the new UI Ming wants added.

## Run

```
pnpm install
pnpm dev
```

Dev server runs on `http://localhost:3001`.

## Stack

Vite + React 19 + TypeScript, TanStack Router (client SPA), Tailwind v4, shadcn/ui (zinc).

## Routes

- `/login` — UI-only sign-in (any submit navigates to `/dashboard`)
- `/dashboard` — KPIs + recent activity
- `/transactions` — wildcard search, three timestamp columns (booking / posting / value date), filter chips
- `/payments` — tabs: Refunds (new-refund dialog with bene details + maker-checker), Withdrawals (retrigger dialog with audit log), All payments
- `/internal-accounts` — registered bank accounts table
- `/api-keys` — API keys table
- `/webhooks` — webhooks table

All fake data lives in `src/data/fixtures.ts`.
