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

A permission is a feature plus an action (`payments.view`), per ACME-2178. The
MVP catalogue is view only: `transactions.view` and `payments.view`. Acme
defines the catalogue and the three sets (Operations, Finance, Administrator).
The client composes roles from those sets. Administrator never holds
`payments.approve`, so an administrator configures who approves rather than
approving.

Permissions and permission sets are managed by Acme. A role narrows the sets for
one organization's way of working, so roles are the customizable layer. A group
defines account access, grants roles and holds users. A user can be in several
groups, and holds no permission of their own. An account inside no group's scope
is invisible to everyone, so that state is surfaced in a banner and the
notification bell.

## Routes

- `/login` — UI-only sign-in (any submit navigates to `/transactions`, the MVP landing page)
- `/transactions` — per-column filters, selection to CSV, detail sheet
- `/payments` — read-only list on the same data table as `/transactions`. View only for MVP: no create, retry or maker-checker approval, and only the settled `COMPLETED` / `FAILED` statuses
- `/accounts` — flat account list: Bank, Name, Bank account no., Legal entity, Currencies. Everything else (internal ID, routing, balances, connection profile, which groups can see it) is in the detail sheet
- `/user-management` — **administrator only**: Groups, Roles, Permission Sets and Users tabs. A group defines account access and grants roles. Clicking a permission set or a user shows a permission and action table. Deletes confirm first and can be undone. Seeded from the ACME-2178 worked example: 6 groups, 4 roles, 3 permission sets, 7 users

Every list — Transactions, Payments, Accounts and the User Management tabs —
shares the same table components:
`src/components/data-table.tsx` (header, body, pager), `data-table-filter.tsx`
(per-column filters) and `detail-list.tsx` (the detail sheet's description
list).

All fake data lives in `src/data/fixtures.ts`. Groups an admin creates in the UI
are kept in `sessionStorage` via `src/lib/admin-store.ts`, seeded from the
fixtures — clear the session to get back to the seed state.
