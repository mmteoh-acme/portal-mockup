# Acme External Portal — UI mockup

UI-only mockup of the Acme external portal. No backend, no auth, no real API. Used to show the dev team the new UI Ming wants added.

## Run

```
pnpm install
pnpm dev
```

Dev server runs on `http://localhost:3001`.

## Stack

Vite + React 19 + TypeScript, TanStack Router (client SPA), Tailwind v4, shadcn/ui.

## Design system

Type and colour mirror the **production Acme dashboard** so this mockup reads as
the same product. Source of truth is `packages/ui/src/styles/globals.css` in the
`acme` monorepo (`apps/dashboard` runs it on `localhost:3010`); `src/index.css`
is a copy of those tokens:

- **Font** Public Sans (loaded from Google Fonts; production loads it from
  `@fontsource-variable/public-sans`). Mono is deliberately left at the Tailwind
  default stack — production uses that for IDs, references and timestamps.
- **Palette** brand `#003fbb`, page background `#fafaf8`, surfaces white,
  borders `#ebebeb`, `--radius: 0.5rem`. The `brand-*` aliases this mockup uses
  for the sidebar's selected state point at the same tokens.
- **Composition** page headings come from `src/components/page-header.tsx`
  (same shape as `apps/dashboard/src/components/page-header.tsx`); grouped
  fields use `FormSection` / `FieldGrid` / `FieldRow` / `FormField` in
  `src/components/form-section.tsx`, which mirror the bordered, header-ruled
  sections of production's detail sheets. Money-movement request forms
  (create payment, retry payment, refund) share
  `src/components/request-form.tsx` for the back-link header, mode options,
  attachment picker and maker-checker footer.

When adding UI, copy the production component rather than inventing a variant —
`packages/ui/src/components/ui/*` in the monorepo is the same shadcn generation
as `src/components/ui/*` here, so files can be lifted across with only the
`@tryacme/ui/lib/utils` → `@/lib/utils` import rewrite.

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
