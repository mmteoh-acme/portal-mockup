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

## Account model

Flat, per ACME-2177: `Client Group > Accounts`. There is no entity or bank
layer. Bank, legal entity, country and currency are attributes on the account
and act as filter dimensions; the backend connection profile (what used to be
`Organization`) is carried per account and shown as metadata only.

Access is granted by explicit admin configuration rather than tree position:

```
Accounts ──> Account Group ──(mapping)──> User Group ──> User
```

A user group decides which accounts its members can *see*; role and permissions
decide what they can *do*. Accounts and users can each belong to several groups.
Accounts in no account group are invisible to non-admins, so the unassigned
state is surfaced in a banner, a tab, and the notification bell.

## Routes

- `/login` — UI-only sign-in (any submit navigates to `/dashboard`)
- `/dashboard` — KPIs + balances across the flat account list, filterable by legal entity, bank, currency
- `/transactions` — wildcard search, three timestamp columns (booking / posting / value date), filter chips including legal entity
- `/payments` — tabs: Refunds (new-refund dialog with bene details + maker-checker), Withdrawals (retrigger dialog with audit log), All payments
- `/internal-accounts` — flat account list with bank / legal entity / country / currency / account-group columns and filters
- `/account-groups` — admin: create account groups (hand-picked or driven by legal-entity tag), edit membership, see mapped user groups and unassigned accounts
- `/user-groups` — admin: create user groups, map them to account groups or legal-entity tags, manage members, preview effective access
- `/users` — team members with their user groups, effective account access, and approval limits
- `/api-keys` — API keys table
- `/webhooks` — webhooks table

All fake data lives in `src/data/fixtures.ts`. Groups an admin creates in the UI
are kept in `sessionStorage` via `src/lib/admin-store.ts`, seeded from the
fixtures — clear the session to get back to the seed state.
