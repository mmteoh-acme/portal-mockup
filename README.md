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
Permission ─> Permission Set ─> Role ─> Group ─> User
                                         + account scope
```

Permissions and permission sets are managed by Acme. A role narrows the sets for
one organization's way of working, so roles are the customizable layer. A group
defines account access, grants roles and holds users. A user can be in several
groups, and holds no permission of their own. An account inside no group's scope
is invisible to everyone, so that state is surfaced in a banner and the
notification bell.

## Routes

- `/login` — UI-only sign-in (any submit navigates to `/transactions`, the MVP landing page)
- `/transactions` — wildcard search, three timestamp columns (booking / posting / value date), filter chips including legal entity
- `/payments` — tabs: Refunds (new-refund dialog with bene details + maker-checker), Withdrawals (retrigger dialog with audit log), All payments
- `/internal-accounts` — flat account list with bank / legal entity / country / currency columns, filters, and which groups can see each account
- `/user-management` — admin: Groups, Roles, Permission Sets and Users tabs. A group defines account access and grants roles

All fake data lives in `src/data/fixtures.ts`. Groups an admin creates in the UI
are kept in `sessionStorage` via `src/lib/admin-store.ts`, seeded from the
fixtures — clear the session to get back to the seed state.
