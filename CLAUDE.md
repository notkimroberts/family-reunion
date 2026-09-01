# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (http://localhost:5173)
bun run build            # Production build
bun run check            # Svelte type checking
bun run lint             # Prettier check + ESLint
bun run format           # Prettier write (auto-fix formatting)
bun run test             # Run Vitest unit tests (NOT `bun test` — see below)

bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply pending migrations
bun run db:push          # Push schema directly to DB (dev shortcut)
bun run db:seed          # Seed database if empty (skips if data already exists)
bun run db:reseed        # Always truncate all app tables and re-seed
bun run db:studio        # Drizzle Studio GUI

bun run stripe:dev       # Forward Stripe webhooks to the running dev server
```

`stripe:dev` **finds the port** rather than assuming 5173 — Vite increments when that is taken, and a forward to the wrong port fails silently: the app never sees `checkout.session.completed`, so no confirmation email is sent and the registration sits at `pending` while the payer believes they have paid.

It probes `/api/health` and requires `status: 'ok'`, not merely a reply. That matters more than it sounds: on a machine behind an HTTP proxy, **every** port answers — a bare reachability check matches the first one and forwards into nothing. Set `PORT=5180 bun run stripe:dev` for a tunnel or container the probe cannot see; that path is trusted without probing. Anything after `--` is passed to the Stripe CLI.

### Migration rules

> **⚠️ PRODUCTION INCIDENT RISK — READ THIS BEFORE TOUCHING MIGRATION FILES**
>
> Drizzle tracks every applied migration by the SHA-256 hash of its SQL file content. If you modify, delete, rename, or regenerate an existing migration file after it has been applied to **any** environment (staging or production), the hashes will no longer match and `drizzle-kit migrate` will **abort on every future deploy** — blocking all deployments until manually repaired. This is not a warning you can work around easily; recovery requires direct DB access and manual surgery on `drizzle.__drizzle_migrations`.
>
> **Rules:**
>
> - Never edit, rename, or delete a `.sql` file in `drizzle/` once it has been **applied** to any environment. Verify by checking `drizzle.__drizzle_migrations` on every DB the file could have reached — if its hash isn't there anywhere, editing the file is still safe (and is often the right fix when a never-applied migration is broken). Once applied anywhere, treat the file as immutable and put corrections in a new migration on top.
> - Never re-run `db:generate` to "redo" an existing migration — always generate a new one on top
> - Never use `db:push` on any database that has ever had `db:migrate` run on it — it bypasses the migration tracker entirely and will cause the same hash-mismatch problem on the next deploy

Schema changes must follow this sequence:

1. Edit `src/lib/server/db/schema.ts`
2. Run `bun run db:generate` — Drizzle diffs the latest snapshot against the schema and produces a new `NNNN_*.sql` file
3. If the generated SQL would drop data (e.g. dropping a column with existing data, changing a column type), **edit the migration file** to add the safe sequence: add the new column → backfill data → set constraints → drop the old column
4. Run `bun run db:migrate` locally, then commit both the schema change and the new migration files together

**Do not use `db:push`** in any environment where data must be preserved — it bypasses the migration tracker.

#### Writing migration SQL safely

Local seed data has the shape your code expects; production rarely does. Before pushing a migration that touches existing data, verify it against a snapshot of the target DB:

```bash
{ echo "BEGIN;"; sed 's|--> statement-breakpoint||g' drizzle/NNNN_*.sql; echo "ROLLBACK;"; } \
  | psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1
```

This applies the migration in a transaction and reverts it. Failures surface as real Postgres errors (orphan FKs, missing extensions, NOT NULL violations) without changing prod state. Two patterns this catches:

- **Adding a FK on an existing column.** If any row has a value with no match in the parent table, `ADD CONSTRAINT` fails. The fix is to pre-clean before the FK is added: `ALTER COLUMN DROP NOT NULL` → `UPDATE child SET ref = NULL WHERE ref NOT IN (SELECT id FROM parent)` → `ADD CONSTRAINT FK ... ON DELETE set null`. Order matters — null the orphans only after the column allows null.
- **PL/pgSQL `DO` blocks must use `$$` (or another matching tag), never single `$`.** `DO $ BEGIN … END $;` is a syntax error; `DO $$ BEGIN … END $$;` is correct. Drizzle-generated DO blocks are usually fine, but hand-written ones are easy to break here.

> **Never use `dropdb && createdb` to reset local data.** Use `bun run db:reseed` instead — it truncates all app tables and re-seeds without touching the DB itself.

For a clean local data reset (dev only): `bun run db:reseed`

## Architecture

SvelteKit full-stack app (Svelte 5 with runes). Node adapter for Railway deployment. Bun as package manager and runtime. Please read all the latest documentation for [SvelteKit](https://svelte.dev/llms.txt) and Tailwind CSS to ensure you are familiar with the latest features and best practices before implementing any new features or changes in these areas.

### Logging

- Prefer the `dbg` utility (`$lib/server/debug`) over `console.log` for all server-side logging. Add a new namespace to the `dbg` object if one doesn't exist for the area you're working in. Enable output with `DEBUG=reunion:*` (or a specific namespace).

- **PostgreSQL** via `postgres` driver + **Drizzle ORM** (schema at `src/lib/server/db/schema.ts`)
- DB connection uses lazy init with SvelteKit's `$env/dynamic/private` — standalone scripts (like seed.ts) must create their own `postgres()` client directly
- **`reunion_events` splits columns from content.** Everything the app only _displays_ — venue, menu, drinks, sites, activities, schedule — lives in one `metadata` jsonb column (`NOT NULL DEFAULT '{}'`), not one column each. See [ADR 0007](docs/adr/0007-event-content-in-one-metadata-column.md). The test for a new field is whether anything filters, orders, groups or indexes on it: `status` (the `one_open_event` partial unique index), `year`, the dates and `registration_lock_date` all pass and are columns; nothing else does. **Do not add a column for display data** — extend `reunionMetadataSchema` in `$lib/general/reunionMetadata` instead, and no migration is needed. The shape is a zod schema rather than only a `$type<>()` cast because `$type<>()` promises nothing at runtime; the settings editor is the sole writer and validates against it. `venue.imageUrl` and site `url`s were dropped in the fold — they were in the old types and rendered nowhere.
- **The owner edits `metadata` as one raw JSON textarea**, and `?/update_program` must keep failing loudly: `parseReunionMetadata` returns an error, the action returns `fail(400)` and writes **nothing**, and the textarea re-renders the rejected text. The version this replaced caught `JSON.parse` and stored `null`, so a bad paste blanked the program page on a save that reported success. The schema is `.strict()` so a typo'd key is named rather than silently dropped.
- **The settings page's writes are one action per card, and each `.set()` names only its own columns.** `?/update_dates`, `?/update_program`, `?/update_lock_date` and `?/update_status` all write `reunion_events`, and a drizzle `.update().set()` writes exactly the keys it is given. `update_dates` and `update_program` were one `?/update_event` doing all of it in a single statement, which was safe only while they shared one card and one Save: split the card without splitting the action and saving the dates posts no `metadata`, which parses to `{}` and **blanks the whole program page**. Pinned by `settings/server.test.ts`, which asserts on the `.set()` payloads — a regression here is silent data loss, not a broken page. Never widen one of these actions to a column another card owns.
- **Contact details stay on `registrations`, not `party_members`** — see [ADR 0008](docs/adr/0008-contact-stays-on-the-registration.md). `contactEmail` is the booking's credential-recovery key (`/register/recover` matches on it; only the token hash is stored), and it must outlive any attendee row: `removeMember` lets the registrant delete their own row, and a fully-cancelled registration keeps zero party members while still needing to be emailed. `contactName` duplicating the `isContact` row's name is deliberate and already single-writer (`updateRegistrationContact`). Do not "normalize" these onto `party_members`, and do not rename that table to `registrants` — CONTEXT.md already uses "registrant" for the contact specifically.
- Party members store birth date as split nullable integers (`birthYear`, `birthMonth`, `birthDay`); a CHECK constraint enforces prefix-consistency (day ⇒ month, month ⇒ year). **Birth date is optional** — `personDetailsSchema.birthDate` is `.optional()`, so plenty of rows have none and the admin party table shows "—". Nothing load-bearing needs it: the shirt order is grouped by the tier's label, and the confirmation email prints an age only when one exists. Do not "fix" this by making it required without deciding that catering actually needs ages — that adds a required field to a live public form.

### Server modules

Server logic lives under `src/lib/server/`, one domain per folder. Each exported function has its own file; barrel `index.ts` files expose the public API. Private helpers shared within a folder are prefixed with `_` and not re-exported from the barrel.

| Module        | Path                        | Responsibility                                                                                    |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| Registrations | `$lib/server/registrations` | Barrel delegating to `checkout/`, `management/`, `queries/`                                       |
| — checkout    | `registrations/checkout/`   | Pending registration, add-member checkout, admin direct creation, Stripe fulfillment              |
| — management  | `registrations/management/` | Post-payment mutations: remove member, cancel, update member details, set status                  |
| — queries     | `registrations/queries/`    | All registration reads                                                                            |
| Donations     | `$lib/server/donations`     | Gifts: pending creation, webhook fulfilment, admin/public reads                                   |
| Payments      | `$lib/server/payments`      | Stripe checkout creation, refunds, session retrieval; metadata encode/decode in `stripeMetadata/` |
| Email         | `$lib/server/email`         | Template rendering in `templates/`; Resend delivery in `send/`                                    |
| Auth          | `$lib/server/auth`          | Better Auth setup; guards in `guards/`                                                            |

### Auth

- **Better Auth** with admin plugin and email + password sign-in
- Magic link has been removed — admins sign in at `/login` with credentials only
- **Public sign-up is disabled** (`disableSignUp: true`). This is load-bearing, not tidiness: Better Auth exposes `POST /api/auth/sign-up/email` whenever email+password is enabled, and its handler is mounted _ahead of SvelteKit routing_ — so there is no route file to guard and `(app)/+layout.server.ts` never sees the request. With sign-up open, anyone could mint a `role='user'` account and read every page behind the login. Pinned by `src/lib/server/auth/auth.test.ts`. Admins come from `bun run admin:create`.
- `hooks.server.ts` populates `event.locals.user` per request. In dev mode, falls back to a hardcoded admin user when no session exists
- Guards: `requireAuth()`, `requireAdmin()`, `requireOwner()` and `isPublicPath()` in `$lib/server/auth/guards`. `(app)/+layout.server.ts` requires `role === 'admin'` for any non-public path — **test for the role, never merely for a session**, since any account satisfies presence. `/admin/*` carries its own `requireAdmin`. Registration itself is fully public.

#### `requireOwner` and the owner-only Setup area

`/admin/event/[eventId]/settings` and `/admin/event/new` are restricted to a single account, matched by **email** against `OWNER_EMAIL`. See [ADR 0003](docs/adr/0003-event-scoped-admin-and-owner-only-setup.md) and [ADR 0006](docs/adr/0006-setup-folded-into-the-event.md).

- **Never express the owner as a `role`.** Two independent hard-coded `role === 'admin'` comparisons gate the app (`requireAdmin` and `(app)/+layout.server.ts`), so an owner with any other role value loses `/admin` and `/program`. `admin({ adminRoles: [...] })` does not help — it throws at plugin construction, and auth is lazily initialised, so that surfaces on every request including public pages.
- Role would not be a boundary anyway: Better Auth mounts `POST /api/auth/admin/set-role` ahead of SvelteKit routing, its only check is that the caller is an admin, and there is no self-target guard. Any admin can already grant themselves any role.
- **`requireOwner` fails open when `OWNER_EMAIL` is unset**, and reports that to Sentry once per process. Deliberate: the degraded state is the old behaviour (admins only, never the public), whereas failing closed would let one forgotten Railway variable lock the owner out of pricing. Do not "harden" this into a fail-closed check without also making the variable impossible to forget.
- It must be called in the **load, in every action, and in every remote function** of a Setup page. A layout `load` runs after a form action, and remote functions are served from `/_app/remote/<id>` with route handling skipped entirely — no layout or page guard sees them, so the in-function guard is the whole protection.
- Better Auth manages its own tables (`user`, `session`, `account`)
- **Lazy-init typing**: `betterAuth({...})` returns a concrete parameterized type that TypeScript can't directly assign to `ReturnType<typeof betterAuth>`. To avoid `any`, extract the call into a `createAuthInstance()` function and type the singleton as `ReturnType<typeof createAuthInstance> | undefined`

#### Bootstrapping admins

`bun run admin:create <email> <password> [name]` creates a Better Auth user and sets `role='admin'` on the user row. Reads `DATABASE_URL` from the environment.

`bun run admin:reset-password <email> <new-password>` resets an EXISTING account. `admin:create` cannot do this — it calls `signUpEmail`, which fails outright on a duplicate, so it bootstraps but cannot recover, and there is no reset email and no account-management screen. The logic lives in `$lib/server/auth/resetPassword` and is tested; the script only supplies the client. Two things it does deliberately: it hashes with Better Auth's **own** `hashPassword` and verifies the result before writing, because the stored format is Better Auth's to define and a hand-rolled hash is silently unverifiable at sign-in (it presents as a wrong password); and it **revokes every session**, because Better Auth leaves them alive across a password change and a reset prompted by someone else knowing the old password would otherwise achieve nothing.

It is the **only** way to create an admin: there is no account-management screen at all, so run this for every account, not just the first. Set `OWNER_EMAIL` to the address you pass here, or event settings stay open to every admin.

### Registration Flow

Registration is **fully public — no sign-in required**. Anyone with a name + email can register and pay.

1. **Register** (`/register`) — public form collects contact name, email, party members. Submitting creates a pending registration with a `managementToken` and redirects to Stripe Checkout.
2. **View** (`/register/manage?token=…`) — public; the success URL after Stripe checkout. Shows pending/processing while polling, switches to `RegistrationManager` once paid. **Read-only: the page has no actions at all.** Adding a member, removing one, editing details and cancelling were all self-service on nothing more than the management link — two of them issuing Stripe refunds — and are now organiser-only, done from `/admin/event/[eventId]/registrations/[registrationId]`. `addMember`, `removeMember`, `cancelRegistration` and `updateMemberDetails` are deleted, not merely unrouted; the admin equivalents (`addAdminMember`, `removeAdminMember`, `cancelRegistrationAsAdmin`, `updateAdminMemberDetails`) are what remains. Do not add an action back to this route.
3. **Recover** (`/register/recover`) — public; enter the registration email and the link is re-sent via email.

The token is the only credential — no per-request auth check, which is exactly why the page it opens can only read. Email enumeration is avoided in `/register/recover` by always returning a generic success message.

**The host-hotel question is booking-level, and its three answers are load-bearing.** `registrations.staying_at_host_hotel` (enum `hotel_stay`) records whether a party will stay at `HOST_HOTEL`, because the organisers hold a room block and the size of it is guesswork otherwise. It sits on `registrations` beside `contactEmail` rather than on `party_members` — a household books rooms together, and asking each attendee would produce a party of four with four contradictory answers (ADR 0008). Three answers, not two: the question is asked months ahead, and `undecided` means asked-and-unsure, which is what tells an organiser "N parties might". `getRoomSummary` reports staying, undecided and elsewhere apart for that reason, in **parties and people both** — a block is negotiated in rooms and a party of five is not one room. **NULL means never asked** and is a fourth thing again: every booking taken before the question existed has it, and reading those as maybes would inflate the block by the reunion's whole history, so they are reported as families to ring. `HOTEL_STAY_ANSWERS` is the single list the pgEnum, the zod schemas and the admin labels all come off. In the zod enums `''` is FIRST, and that order is load-bearing: superforms defaults an absent enum field to the first value, so with the answers first an omitted field arrived as `'yes'` and silently booked a room.

**Every reunion datetime is reunion-local, and the lock date is shown rather than only enforced.** `REUNION_TIME_ZONE` (`America/Los_Angeles` — the reunion is in Oakland, not the family's Mississippi origins) is the zone an organiser's typed digits are read in and the zone every visitor is shown. Three utilities own it and nothing else may reimplement the rule: `parseReunionWallClock` (what a `datetime-local` posts → the instant it names, DST-correct via `@internationalized/date`), `toReunionWallClock` (the inverse, so re-saving an untouched settings form cannot drift the date), and `formatReunionDateTime` (display, `long` or `short`, always naming the zone). `new Date(digits)` reads the posted wall clock in the RUNTIME's zone — UTC on Railway — which stored a 9:00 AM deadline as 09:00 UTC and closed registration at 2:00 AM Pacific; that is the bug these exist to prevent, so do not parse a posted datetime any other way. The three `reunion_events` datetimes are `timestamptz` (migration `0016`) so the instant survives the server's zone; `registrations.paid_at` is still naive and has the same latent problem. `RegistrationDeadline` (`$lib/components`) states the deadline on the home page and the register hero, outside every event-state branch, and the home page swaps **Register Now** for a contact notice once it passes — via `isRegistrationClosed` (`$lib/general/registration`), the one predicate shared with `assertRegistrationEditable`. Pinning the zone is also what lets the line be server-rendered rather than appearing a beat after mount.

Route groups:

- `(auth)` — `/login` only, no nav, full-screen card layout. Admin sign-in only. `goto('/admin')` on success is the **only** entry point into the admin area anywhere in the app.
- `(app)` — public paths are **only** `/`, `/register` (which covers `/register/manage` and `/register/recover`), `/donate` (which covers `/donate/thanks`) and `/photos` (which covers `/photos/contribute`). Everything else in the group — `/program`, `/changelog`, `/admin/*` — redirects to `/login`. The allowlist is `isPublicPath()` in `$lib/server/auth/guards`; widen it there to reopen a page after the reunion. Contact is a section on `/` (`#contact`), not its own route.

#### Admin routes are event-scoped

Everything an organiser does concerns one reunion, and the reunion is named in the path — see [ADR 0003](docs/adr/0003-event-scoped-admin-and-owner-only-setup.md).

| Path                                                    | What it is                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/admin`                                                | The landing page: one card per reunion, newest first, plus **Add new event** (owner-only, a link)            |
| `/admin/event/new`                                      | Owner-only: create a reunion year. Title and year, both pre-filled from the newest one                       |
| `/admin/event/[eventId]/registrations`                  | The organiser's ONLY screen. Status panel beside the list, plus a Bookings / People / Gifts lens in `?view=` |
| `/admin/event/[eventId]/registrations/new`              | Paper entry. Tiers come from `params.eventId`, never `getOpenEvent()`                                        |
| `/admin/event/[eventId]/registrations/[registrationId]` | One registration. 404s if it does not belong to `eventId`                                                    |
| `/admin/event/[eventId]/settings`                       | Owner-only: event details, **status**, tiers, lock date, program                                             |

- **There is no Setup area.** `/admin/setup`, `/admin/setup/events`, `/admin/users`, `/admin/storefront` and `/admin/photos` are all gone — see [ADR 0006](docs/adr/0006-setup-folded-into-the-event.md). What survived went where it belonged: creating a year is `/admin/event/new`, reached from the list; a year's status is on that year's settings page, beside its dates and tiers. Nothing replaced account management, because `admin:create` was always the only way to make an admin and the screen was read-only. Do not reintroduce a Setup landing page — it existed to hold five links, four of which no longer have destinations.
- **Creating a year is a page, not a panel.** It was briefly a form that expanded in place above the year cards on `/admin`, whose result came back as `{ createdEventId }` for an `$effect` to `goto()` — a redirect written in three places, because an action that redirected would have stopped a `fail()` rendering on the list. `/admin/event/new` has neither problem: `fail()` renders on the create page and success is a plain `redirect(303, …)` to the new year's settings. Static segments outrank dynamic ones in SvelteKit, so `new` resolves ahead of `[eventId]` and is not covered by `[eventId]/+layout.server.ts`.
- **There is no `?eventId` filter and no "All years".** It was a filter dressed as navigation: `?eventId` absent meant "the open event" to the registrations list and "all years" to the shell, so moving between admin tabs silently changed scope. Only one event can be `open` at a time (`one_open_event` partial unique index), so the default was never ambiguous. Do not reintroduce a cross-page event filter — put the id in the path.
- `admin/+layout.server.ts` returns `events` (four columns only), `currentEventId` for the pages that have no id in their URL, and `isOwner` so the registrations page can hide the settings entry. `/admin` computes `isOwner` again in its own load, because it needs it for the create form and a page load cannot read a sibling's. Hiding is not the protection; the server guards the settings route and the create action.
- **There is no admin header.** Admin renders inside the ordinary app shell — the same `AppHeader` as every other page, which already carries the theme toggle and the account menu. An `AdminHeader` existed briefly and duplicated all three of those on every admin screen. What is genuinely admin-specific lives on the page: the reunion title, the year picker and the Event settings link are in the status card on the registrations list, beside the numbers they apply to.
- The 12-column grid wrappers in `(app)/+layout.svelte` and `admin/+layout.svelte` stay: every admin section is `col-span-12` or `xl:col-span-8` and they are also the only source of vertical spacing between sections. `admin/+layout.svelte` now does nothing else.
- **Getting back from settings**: the settings page has a breadcrumb (Reunions / year / Settings) and a "← Back to registrations" button. With no admin header, those are the only route back — do not remove them.
- **Registrations, People and Gifts are three lenses on one page** (`?view=`), not three routes — see [ADR 0004](docs/adr/0004-genealogy-out-of-scope-for-launch.md). Bookings is one row per party; People is one row per attendee, `paid` and `waived` only, which is what catering and shirt counts come off; Gifts is one row per donation, every status, because a pending gift is an abandoned checkout an organiser reconciling against Stripe needs to see. The status filter chips appear on Bookings only: the other two are already narrowed by their own query or list a state the chips do not name, so a chip there could only remove rows without explaining why. `bookings` is the parameter-LESS default, so the two spellings of it cannot drift.

- The event status banner is rendered once by `admin/event/[eventId]/+layout.svelte` for every child view. `open` renders **nothing** — `draft`, `closed` and `archived` each get a banner because all three mean nobody can register.

- **The status panel answers one question per block, and the money block leads with one figure.** `MoneyPanel` renders money, `HeadcountPanel` renders people, `OrderSheet` renders what to buy — they were one component that interleaved all three, stacking head counts and amounts in identical rows so neither scanned. Worse, it printed **"In the bank" twice**, once for registrations and once for gifts, leaving the organiser to add them. `getEventMoney` is where the two are added, and the rows under the headline are the terms of that sum: `registrations + gifts − fees − lost to refunds === in the bank`, asserted in `eventMoney.test.ts` against the real producers. Adding a figure to either `getRegistrationTotals` or `getDonationTotals` means deciding which side of that identity it falls on. Method notes — estimated vs recorded fees, cheques still to deposit, a gift sharing a booking's charge — live in the ⓘ tooltip, never as prose between the figures; that mistake has now been made twice and fixed twice.

> **The route lock covers page views only.** A SvelteKit layout `load` runs _after_ a form action, so `(app)/+layout.server.ts` cannot protect actions — those carry their own `requireAuth`/`requireAdmin` guards. Routes outside the `(app)` group are not covered at all, and must stay reachable: `/api/webhooks/stripe` (Stripe sends no session — blocking it breaks every payment), `/api/webhooks/resend` (same, and blocking it hides every bounce), `/api/registration/status`, `/api/auth/*`, `/api/health`, and `/api/photos/*` (the byte proxy, which enforces the moderation status itself).
>
> **Dev cannot demonstrate the lock.** `hooks.server.ts` substitutes a hardcoded admin whenever there is no session, so locally you are always signed in as an admin. Verify against a deployed environment in a private window.

### Remote Functions

- **Enabled**: `kit.experimental.remoteFunctions: true` + `compilerOptions.experimental.async: true` in `svelte.config.js`
- Remote functions live in `.remote.ts` files anywhere in `src/` except `src/lib/server/`
- Use `query` from `$app/server` for data fetching; `command` for imperative mutations; `form` for form submissions
- Call `getRequestEvent()` (from `$app/server`) inside the remote function to access `locals` for auth guards
- One export per `.remote.ts` file, named after the export (e.g. `getAdminUsers.remote.ts` exports `getAdminUsers`)
- Use `{#await queryFn() then data}` in templates; use `{@const}` for derived values inside the block
- After a mutation (form action), call `query.refresh()` to re-fetch — no `invalidateAll`, no manual `fetch`
- `query()` deduplicates: identical calls share a cache instance and re-use the same `await`

### Forms

- **sveltekit-superforms** + **zod** for server-validated forms. Always use the zod v4 adapters:
  - Server: `import { superValidate } from 'sveltekit-superforms/server'` and `import { zod4 as zod } from 'sveltekit-superforms/adapters'`
  - Client: `import { superForm } from 'sveltekit-superforms'` and `import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'`
  - Never import `superValidate` **or `defaults`** from the `sveltekit-superforms` barrel on the server — it re-exports `SuperDebug.svelte`, and a node import of it dies with `Unknown file extension ".svelte"`. Both are exported from `sveltekit-superforms/server`; import them from there.
- **shadcn-svelte field components** (`$lib/components/ui/field/`) for form field structure: `Field.Group`, `Field.Field`, `Field.Label`, `Field.Error`, `Field.Description`
- **bits-ui Select** has a `string | string[]` union for `value` — avoid `bind:value` on a `string` variable; use a native `<select>` styled with Tailwind or use `onValueChange` without bind
- Define zod schemas in a co-located `schema.ts` file next to the route
- **Initializing `$state` from load data**: don't use `$state(undefined)` + `$effect(() => { x = derived })` — this triggers the `svelte/prefer-writable-derived` lint error. Instead compute the value directly: `let x = $state(computedValue)`. This is intentional for "local copy" edit patterns where the value starts from server data but can be independently modified.
- **Reactive collections**: use `SvelteMap` and `SvelteSet` from `svelte/reactivity` instead of `Map` and `Set` inside Svelte components — the ESLint rule `svelte/prefer-svelte-reactivity` enforces this and will block commits.

### Payments

- **Stripe Checkout** for event registration. Webhook at `/api/webhooks/stripe` handles `checkout.session.completed`
- Each registration carries a `managementToken` (32 random bytes, base64url) — the credential the registrant uses to view their party afterward. The DB only stores `sha256(token)`; the plaintext lives in URLs/email and is carried through Stripe metadata so the webhook can build the manage URL in the confirmation email
- `/register/manage?token=…` sets a `reg_token` HttpOnly cookie on first land and redirects to a clean URL, keeping the plaintext out of subsequent access logs / Sentry breadcrumbs / referers
- `party_members` are denormalized: tier label and price are snapshotted onto the row at registration time so subsequent tier rename/reprice don't change historical refund amounts
- **`registrations.stripe_fee_cents` is what Stripe actually took, accumulated.** Written by the webhook from the charge's balance transaction (`retrievePaymentFee`), and ADDED to rather than assigned, because each `add_member` is its own PaymentIntent paying 2.9% + 30¢ again — `stripe_payment_intent_id` holds only the first. Both writes sit inside the paths that are already idempotent (the conditional `pending → paid` update; the `stripe_checkout_session_id` unique index), so a redelivery cannot double-count. NULL means not known, and the admin panel falls back to `stripeFeeOnChargeCents` and says it is estimating.
- **A refunded charge does not return its fee.** Stripe's refund is a separate balance transaction with `fee: 0`, so a cancelled $165.09 booking costs the reunion $5.09 with nobody attending. `getRegistrationTotals` reports that as `lostToRefundsCents` and subtracts it from what reaches the bank — refunded registrations are excluded from every other figure, which is what made the loss invisible.
- **Tiers carry no shirt-size category.** The column was write-only for its whole life: set by the tier form, returned by `resolveTierPricing`, read by nothing — every `ShirtSizeSelect` renders the same `SHIRT_SIZES`. The tier _label_ is the adult/child distinction, and `getPeopleSummary` groups the order sheet by it, so "Adult: S 1 M 3 · Child: S 1 M 1" is a youth count without a youth vocabulary. Do not reintroduce it without first wiring a size list that actually reads it.
- **`SHIRT_SIZES` is `YOUTH_SHIRT_SIZES` then `ADULT_SHIRT_SIZES`, and the order is load-bearing.** `shirt_size` is free text with only a `min(1)` check, so adding sizes needed no migration — but `peopleSummary` sorts the order sheet by index into `SHIRT_SIZES`, so the grouping is what keeps YS…YXL as their own run ahead of XS…XXXL rather than interleaved. The picker (`ShirtSizeSelect`) renders the two arrays as `Youth` / `Adult` optgroups; a flat list of codes reads "YS" as a typo for "S".
- **The contact cannot be booked on a child tier**, and the rule is a word match on the tier label — `isChildTierLabel` in `$lib/general/tiers`, because tiers still carry no adult/child column (see above). `YourInformationCard` filters the contact's dropdown; `assertContactTierIsAdult` enforces it in **both** `createPendingRegistration` and `createAdminRegistration`, before the Stripe session, since the tier id arrives from the client. The heuristic is deliberately narrow — it gates one dropdown, where a miss is fixable from the admin. Do not grow it into pricing or catering logic; that needs a real column.
- Stripe session metadata is typed via `encodeRegistrationMetadata` / `encodeAddMemberMetadata` / `decodeSessionMetadata` in `$lib/server/payments/stripeMetadata` — never access `session.metadata` keys directly. `decodeSessionMetadata` fails closed (returns null) when required fields are missing
- Refund flows pass a stable Stripe idempotency key (`cancel-registration-<id>-<intent>`) so retries cannot double-refund

### Donations

Gifts to the reunion, from `/donate` or added to a registration checkout. Presented amounts come from `DONATION_PRESET_CENTS`, bounded by `DONATION_MIN_CENTS` / `DONATION_MAX_CENTS` — all three in `$lib/general/constants`, and enforced by the zod schemas so the client and the server cannot disagree.

- **One `donations` table serves both paths**, with a nullable `registration_id` naming the booking a gift arrived with. Folding a gift into `registrations` would mix money that buys a chair with money that does not, and the admin panel reports them apart on purpose.
- **A gift is charged at face value — it is NOT grossed up.** A tier price is what the reunion must _net_, so the payer covers Stripe's cut; a gift is whatever the giver chose to give, and quoting $51.75 for a $50 gift reads as a mistake. `quotePartyTotal`'s `donationCents` option therefore adds to `totalCents` and skips `stripeFeeCents`, and stays out of `subtotalCents` so "Subtotal" remains the cost of the places.
- **A gift given with a registration shares ONE charge and one balance transaction**, and that fee is recorded on the registration. `markDonationPaid` is called with no `feeCents` on that path, and `getDonationTotals` charges no fee against a gift with a `registrationId` — between them that is what stops Stripe's cut being deducted twice across the two admin figures. `donations.stripe_fee_cents` NULL means "not known, or accounted on the registration".
- **A cancelled booking does NOT refund the gift — the reunion keeps it.** Someone dropping out has not asked for their gift back. But Stripe refunds **charges, not line items**, and a gift added during registration was a line item on the booking's own charge, so a full refund hands it back whether anyone meant it or not: keeping it requires refunding _less_ than the charge. `planRefunds` (`registrations/management/_planRefunds.ts`) decides that per intent — an intent carrying no gift is still refunded in full with `amount: undefined`, exactly as before, so every booking without a gift behaves identically; one carrying a gift is refunded the sum of the snapshotted member prices on it, which ARE the line items sent to Stripe. A charge that was the gift alone is skipped, because a zero refund is an error at Stripe. The cancellation email states the kept amount (`keptDonationCents`), or the donor waits for money that is not coming.
- **`/donate` ignores the registration lock date**, unlike `createPendingRegistration`. The lock exists so catering counts can be finalised; a gift needs no chair. `eventId` is nullable for the same reason — a gift arriving between reunions is recorded, not refused, and the receipt falls back to "the family reunion".
- Fulfilment mirrors the registration branch: one conditional `pending → paid` UPDATE, so a Stripe redelivery matches nothing and thanks nobody twice. The receipt carries `idempotencyKey: donation/<id>`; a gift given with a registration gets **no** receipt of its own, because the confirmation email names it.
- The public "raised so far" figure (`getPublicDonationTotal`, home page and `/donate`) counts **paid** gifts only and reports the GROSS. A pending row is an abandoned checkout, and counting it would let anyone inflate the total by opening a checkout and walking away.
- Admin-side it is read-only: a third lens on the registrations page (`?view=donations`), and gift money folded into the panel's single bank figure by `getEventMoney`. Nothing in the app refunds a gift — that is done in the Stripe dashboard, as it is for the money on a booking.

### Email

- **Resend** for delivery, via `send()` in `$lib/server/email/send/_resend.ts`.
- **The Resend SDK never throws.** It resolves with `{ data, error }`. `send()` inspects `error` and throws; never wrap the SDK call in try/catch expecting it to reject. Any caller that commits state only on a successful send depends on this — `/register/recover` rotates the management token, and since the DB holds only the hash, rotating on a failed send locks the registrant out permanently.
- A missing `RESEND_API_KEY` **throws in production** and only skips silently in dev. A silently skipped confirmation email is worse than a loud failure.
- Templates return `{ subject, text, html }` and both bodies are always sent: html-only is a deliverability penalty. HTML is table-based with fully inline styles (Outlook has no flexbox; Gmail strips `<head><style>`), and every cell sets both `background-color` and `color` so dark-mode auto-inversion cannot make text unreadable. Escape anything registrant-supplied with `escapeHtml`.
- Confirmation content is assembled in `getConfirmationEmailData` so the Stripe webhook and admin paper entry cannot drift. Copy is keyed off registration status (`paid` / `waived` / `pending`).
- Pass a Resend `idempotencyKey` (`confirm/<registrationId>`) wherever a webhook could redeliver.
- **Bounces are reported, not retried.** `/api/webhooks/resend` verifies the svix signature and routes `email.bounced` / `email.complained` / `email.failed` to Sentry via `reportError`, naming the affected registration ids. It exists because the confirmation is a _single un-retried attempt_ — the conditional `pending → paid` transition means a Stripe redelivery will not send it again — so without this a typo'd address fails silently and the registrant simply never gets their management link. Needs `RESEND_WEBHOOK_SECRET`; without it the endpoint returns 500 and reports the misconfiguration rather than dropping events quietly.
- **`webhooks.verify()` does not match Resend's published snippet.** In the installed SDK it is synchronous and _throws_ (no `{ data, error }`), the option is `webhookSecret` not `secret`, and `headers` wants the svix header _values_ as `{ id, timestamp, signature }` — not a Web API `Headers` object. Following the published example type-errors, and would have silently rejected every webhook.

### Genealogy and the shop are gone, tables and columns included

The app is a registration app with a photo gallery bolted on. Genealogy went out of scope before launch ([ADR 0004](docs/adr/0004-genealogy-out-of-scope-for-launch.md)); the storefront followed it ([ADR 0005](docs/adr/0005-drop-genealogy-and-gallery-tables.md)). **The gallery went with them and has since come back — see the Photos section below and [ADR 0009](docs/adr/0009-photos-return-with-a-moderated-gallery.md). Everything in this section about photos is history, not current state.**

- **The tables are dropped**, in `drizzle/0011_parched_lady_mastermind.sql`: `family_members`, `relationships`, `photos` and `party_members.family_member_id`. An earlier pass kept them deliberately, on the reasoning that real genealogy might already be entered and the feature could return without a data migration. That was overturned once the family-tree UI had been gone long enough that nothing could have written to them through the app. **This is not reversible** — bringing either feature back means a fresh schema and whatever data was in there is gone.
- **Cloudflare R2 went with the gallery, and is not what replaced it.** The old `R2_*` variables and `@aws-sdk/s3-request-presigner` are gone for good; anything still in that bucket is orphaned, since `photos.r2_key` was the only pointer to it. `$lib/server/storage` and `@aws-sdk/client-s3` are back under ADR 0009, but pointed at a Railway bucket with `BUCKET_*` variables. Do not resurrect the R2 names.
- `db:seed` no longer generates a family tree or photo rows. It still seeds events, tiers, registrations and party members, which is what `db:reseed` is for.
- **The shop went too**, in `drizzle/0012_smart_hairball.sql`: `/shop`, `/admin/storefront`, the `StorefrontProduct` type and `reunion_events.external_shop_url` / `shop_products` / `shop_active`. It was a link to an external store plus a JSONB list of shirts — nothing was ever sold through this app, so no order or payment depended on it. Shirt sizes are still collected at registration and counted in the admin order sheet; that is the part that mattered.
- **`PRIMARY_NAV_LINKS` and `SECONDARY_NAV_LINKS` are both gone**, and with them the "Family" and "Reunion" dropdowns in `AppHeader` and their sections in `MobileDrawer`. Between them they held only the gallery and the shop, so both arrays were already empty behind an `{#if …length}`. The nav is now logo · Photos · Donate · Register · theme · account, with Photos as plain text and Donate as an outline link left of the filled Register button, so there is still exactly one primary call to action. `MobileDrawer`'s `iconMap` went with them — nothing renders a link from a list any more.
- If either of them comes back, it comes back with its own ADR — as the gallery did. Do not reintroduce `/family-tree` or `/shop` by reflex because you found a dangling reference. Note the gallery lives at `/photos`, not the old `/gallery`.

### Photos

A public gallery at `/photos`, with public contribution and organiser moderation. See [ADR 0009](docs/adr/0009-photos-return-with-a-moderated-gallery.md), which amends ADR 0005 — this feature was deleted on 2026-08-29 and reinstated on 2026-09-01, so read that before changing anything here.

- **Upload carries NO credential, so review-before-publish is the entire protection.** Anyone may POST to `/photos/contribute`; every row is written `pending` and nothing is publicly reachable until an organiser approves it. That gate is enforced TWICE and both are load-bearing: `getApprovedPhotos` filters what is LISTED, and `getServablePhotoKey` — re-read per request by the byte proxy — decides what is REACHABLE. A photo that is merely unlisted is still served to anyone holding its id, which would make rejecting one meaningless. Do not add a "trusted uploader" fast path, do not cache the proxy publicly, and do not surface pending rows anywhere public.
- **`/register/manage` was NOT the upload route and must not become one.** It exports no actions and `manageReflectsServerState.test.ts` asserts it. The management token is a bearer credential with no per-request check; contribution deliberately uses its own public route instead.
- **The decode is the validation.** `_buildRenditions` throws unless libvips parses the bytes as a raster image — a `Content-Type` header is supplied by the caller and means nothing. SVG is refused **by name**: libvips would rasterise it happily, but it is a document that can carry script. Every accepted file is re-encoded from scratch, so a polyglot does not survive.
- **All EXIF is stripped, and there is a test asserting it rather than trusting sharp's default.** Phone photos of children carry the GPS coordinates of family homes. `.rotate()` bakes orientation into the pixels first, so a portrait photo is not served on its side once the tag is gone. libvips maps the GPS IFD to `IFD3`, which is what the test fixture writes.
- **Only renditions are kept** — `display` at 1600px and `thumb` at 400px, both JPEG q82. The upload is discarded. Measured on the 290-photo archive: 1.2 GB of originals becomes ~58 MB of renditions.
- **The bucket is private and the app proxies every byte** at `/api/photos/[id]/[variant]`. Railway exposes no public object URL, but even if it did, a public bucket would serve pending photos to anyone who guessed a key. An admin gets the unfiltered lookup (`getPhotoKey`), because the moderation queue has to render what is being moderated — that branch tests `role === 'admin'`, never merely for a session.
- **`photos.display_key` / `thumb_key` are the only pointers to the objects.** `deletePhoto` removes the objects FIRST, then the row. Deleting rows any other way orphans bytes nothing can enumerate — exactly what happened to the R2 bucket under ADR 0005.
- **`photos.event_id` is nullable**, mirroring `donations.event_id`: the archive predates every `reunion_events` row, and a photo contributed between reunions is recorded rather than refused. The admin queue is therefore **deliberately not filtered by `params.eventId`** — a queue scoped to a year would hide the rows most needing a decision.
- **Moderation is a fourth `?view=` lens** on the registrations page, not a route. `moderate_photo` carries its own `requireAdmin`: a layout load runs after a form action, so the route lock cannot protect it. It is **not** written to `registration_audit` — that table records changes to someone else's registration and its action enum says so.
- **`BODY_SIZE_LIMIT` must be set on Railway.** adapter-node defaults it to `512K` (`@sveltejs/adapter-node/files/handler.js:25`), which silently rejects the average phone photo. The dev server applies no such limit, so this fails **only in production**.
- Bucket variables on `family-reunion-app` are **reference variables**, not literals: `BUCKET_NAME` → `${{ family-reunion-photos.BUCKET }}`, and likewise `BUCKET_ENDPOINT` → `.ENDPOINT`, `BUCKET_ACCESS_KEY_ID` → `.ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY` → `.SECRET_ACCESS_KEY`, `BUCKET_REGION` → `.REGION`. The client throws a named error when they are missing rather than degrading — a half-configured bucket that accepts uploads and loses them is worse than one that refuses.
- **`BUCKET` is not `RAILWAY_BUCKET_NAME`.** The S3 bucket name is globally unique and suffixed — the bucket displayed as `family-reunion-photos` is `family-reunion-photos-ceh2kq` to the API. Railway exposes both and only `BUCKET` is the one an S3 call accepts. Railway's storage is Tigris-backed (`https://t3.storageapi.dev`), which is why `_client.ts` sets `forcePathStyle: true` — verified by a put/get/delete round-trip against the live bucket, not assumed.
- **Every photo has its own URL** at `/photos/[id]`, server-rendered with `og:image` so a link pasted into a text thread or Facebook unfurls. The grid links to it rather than opening a lightbox — client-only lightbox state is not shareable and not crawlable. It 404s identically for pending, rejected and absent: a distinct "removed" message would confirm a rejected photo once existed there.
- **Caching is `private, max-age=300` + ETag/304, and both halves are deliberate.** The bytes for an `(id, variant)` are immutable — the key comes from a fresh uuid and is never overwritten — so the object's etag identifies them permanently and only the PERMISSION can change. The 304 is evaluated **after** the status check, never before: a browser holding a good etag for a since-rejected photo must get 404, not "your copy is still valid" (pinned by a test). Without the 304 a full-grid browse re-downloads ~4.4 MB of thumbnails every five minutes, which is essentially the whole egress bill. **Do not make the cache public or the max-age long** — a shared proxy would keep serving a rejected photo.
- **Downloads are `?download` on the proxy**, which sets `Content-Disposition: attachment`. The header, not the anchor's `download` attribute: iOS Safari has ignored the attribute for cross-document navigations, and the header is what actually reaches Files or Photos.
- **The per-year zip streams**, at `/api/photos/year/[year]/zip`. `store`, not `deflate` — JPEGs are already compressed and deflating them burns a single vCPU to save a percent. It must never buffer: 54 MB held in memory on a 150 MB container is the OOM the upload path was tuned out of, doubled if two people tap it at once. No `content-length`, because the size is unknown until the last entry and a wrong one truncates the download.
- **`takenYear` is read from EXIF `DateTimeOriginal` before the metadata is stripped** — that is the only chance to have it, since renditions carry no EXIF. An explicit year from the importer wins over it. Years with no photos never appear as chips, and photos with no year are excluded from year buckets but still browsable in the full grid: a zip named for a year should hold only photos from it.
- The per-IP rate limiter is in-process: it resets on deploy and does not coordinate across replicas. Honest at one container; a second replica doubles the effective limit.
- `scripts/importPhotos.ts` imports the recovered archive **approved** (it was already public on the family's old site) through the same pipeline. Idempotent on the unique `source_key`, so a half-finished run can be re-run. The 1.2 GB of originals stay out of the repo — `photos-orig/` is gitignored.

### Icons

- **@lucide/svelte** for all icons — import as named components: `import { Home, Users } from '@lucide/svelte'`
- Browse available icons at lucide.dev; use PascalCase component names (e.g. `CalendarClock`, `ExternalLink`)
- Do **not** use unplugin-icons or `virtual:icons/*` imports — those have been removed

### Styling

- **Tailwind CSS v4 + shadcn-svelte** (vega preset, neutral base color). No DaisyUI.
- Dark mode via `.dark` class on `<html>` (not `data-theme` attribute)
- Theme constants (`LIGHT_THEME = 'light'`, `DARK_THEME = 'dark'`) in `$lib/general/constants/THEMES.ts`
- Theme toggle persisted in localStorage via `$lib/stores/theme`
- CSS variables defined in `src/app.css` — use semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `text-primary`, `bg-destructive`, etc.)
- **Fonts**: Inter (system font, shadcn default) — Google Fonts removed
- shadcn components live in `$lib/components/ui/` — import them directly: `import { Button } from '$lib/components/ui/button'`
- `cn()` utility (clsx + tailwind-merge) available from `$lib/utils`

### Mobile Navigation

- Top navbar is **hidden on mobile** (`hidden md:flex`) — only shown on desktop
- **The theme toggle is unconditional and lives in `AppHeader` at both breakpoints** — in the desktop nav, and in the mobile bar beside the hamburger rather than inside the drawer. A control everyone should be able to reach must not be two taps down behind a menu.
- **Account controls are conditional on `page.data.user`**, which the root layout returns on every route. Signed in, `AppHeader` shows an avatar; **sign out lives in a dropdown behind it**, alongside the name and email — a rare action does not earn permanent width next to a Register call-to-action, and the menu has room to say which account you are in. Signed out, neither renders: offering to sign someone out advertises a session they do not have. On mobile the account block is in the drawer, inline, where a dropdown inside a slide-over would be fussy.
- `AppHeader` is the **only** header. Admin uses it too — see the admin routing section for why there is no separate admin header.
- **Side drawer** (`MobileDrawer.svelte`) slides in from the left on mobile, triggered by a hamburger button in `AppHeader`. Contains: app logo/name, Family links, Reunion links, Register CTA, and the account block when signed in
- Main content has no bottom-bar clearance (bottom tab bar was removed)

### Versioning

- **commit-and-tag-version** for semantic versioning and changelog generation
- App version injected at build time via Vite `define` (`__APP_VERSION__` from package.json)
- Release workflow: `bun run release` (patch), `release:minor`, `release:major`, `release:first`

### Error monitoring

- **Sentry** via `@sentry/sveltekit`. Server init in `src/instrumentation.server.ts`; client init in `src/hooks.client.ts`
- DSN constant at `$lib/general/constants/SENTRY_DSN.ts`
- The Vite plugin (`sentrySvelteKit` in `vite.config.ts`) uploads source maps and creates a Sentry release automatically on every production build. Release name is set to `package.json` version; commits are associated automatically via `release.setCommits: { auto: true }` (requires the GitHub repo connected in Sentry → Settings → Integrations)
- **Source map chain**: adapter-node produces a 3-level chain (`build/` → `.svelte-kit/adapter-node/` → `src/`). The plugin's built-in sorcery flattening only resolves one level, so `sourcemaps.assets` is configured to upload both `build/**` and `.svelte-kit/adapter-node/**` so Sentry can chain through to the TypeScript source. Do not change this without understanding the impact
- **Code mappings**: uploaded via `bun run sentry:code-mappings` (one-time, not per deploy). Config in `sentry-mappings.json` and `.sentryclirc`. Requires an org-scoped token with `org:ci` scope
- `environment` and `release` are injected into both `Sentry.init()` calls via `import.meta.env.MODE` and `import.meta.env.VITE_SENTRY_RELEASE`
- Auth token: `SENTRY_AUTH_TOKEN` in `.env` (local) or Railway environment variables (production). `vite.config.ts` uses `loadEnv` to read it — necessary because `vite.config.ts` runs before Vite loads `.env` into `process.env`

### Deployment

- **Railway** with Node adapter. Internal Postgres at `postgres.railway.internal`
- Build: `vite build` (DB is not reachable during build — Railway internal DNS is runtime-only)
- Predeploy command (Railway setting): `bun run db:migrate` (`scripts/migrate.ts`) — runs migrations before the server starts. It wraps `drizzle-orm`'s migrator directly instead of shelling out to `drizzle-kit migrate`, because drizzle-kit's spinner UI writes progress via carriage-return redraws that collapse to nothing useful over a non-TTY log pipe (Railway's), hiding the real error behind a bare "exited with code 1". The script also retries the initial connection for ~30s. **Keep that retry even though the database no longer sleeps.** It was originally attributed to a scaled-to-zero Postgres, but that explanation is incomplete: it fired again on the deploy of `c605f59` while metrics showed the database had held ~50MB continuously for the previous hour and had never stopped. The predeploy container is fresh on every deploy, so it can race Railway's private networking becoming usable for that container — independent of whether the database is asleep. The exact layer (DNS resolution vs TCP reachability) is not pinned. Do not remove the retry on the reasoning that sleep is off; it also covers this.
- Start: `node build/index.js`
- DB migrations are idempotent — Drizzle tracks applied migrations and skips them on subsequent deploys
- Required Railway environment variables: `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT=production`, and `OWNER_EMAIL` (the address allowed into event settings and event creation; unset means every admin can reach them, and Sentry gets told once)
- **Watch paths**: `family-reunion-app`'s Railway build config sets `watchPatterns` to `["src/**", "static/**", "drizzle/**", "scripts/**", "package.json", "bun.lock", "svelte.config.js", "vite.config.ts", "tsconfig.json", "drizzle.config.ts"]`, so pushes to `main` that only touch docs/tooling (`CLAUDE.md`, `.claude/**`, `.agents/**`, `skills-lock.json`, etc.) don't trigger a deploy. `scripts/**` is in the list because the predeploy command lives there — without it, a fix to `scripts/migrate.ts` would not deploy. If you add a new source directory, config file, or build input outside these paths, update the pattern list (`railway environment edit --environment production --service-config family-reunion-app build.watchPatterns '[...]'`) or it'll silently stop deploying real changes.
- **Health check**: Railway's `healthcheckPath` is `/api/health`. It is a **liveness** check and deliberately does not touch the database. A DB probe there would be redundant with the predeploy migration (which already retries the connection for ~30s and fails the deploy loudly), and refusing to promote a deployment because the database is down gains nothing — the deployment it keeps serving has the same database. Use `/api/health?probe=db` to check the database explicitly; it retries, so a brief blip reports `ok` rather than `unreachable`.
- **The database does not sleep.** `family-reunion-db` had "Sleep when inactive" enabled, which made the first query after any idle period fail: `postgres.js` rejects the in-flight query on a connection error (`connection.js` `queryError`) and only reconnects for a _later_ query, so a real visitor got an error page and a refresh fixed it. It idles at ~50MB, so keeping it warm is cheap. Do not re-enable sleep on a service that serves public page loads.

#### Resetting production

Only do this when production has no real data worth keeping (e.g. pre-launch, or after an intentional migration-history squash — see Migration rules above for why squashing breaks `drizzle-kit migrate` on any environment the old files were ever applied to).

1. **Wipe both schemas** — not just `public`. The migration tracker lives in a separate `drizzle` schema, which survives a `public`-only wipe and causes the exact hash-mismatch failure this runbook exists to fix:

   ```sql
   DROP SCHEMA IF EXISTS drizzle CASCADE;
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

   Run via `railway connect family-reunion-db --environment production` (opens a psql shell), or Railway's dashboard query console.

2. **Redeploy** so predeploy (`bun run db:migrate`) runs fresh against the empty DB. `redeploy` only takes `--service`/`--yes`/`--json`/`--from-source` — no `--environment` or `--project` flags; it uses whatever environment the CLI is linked to:

   ```
   railway redeploy --service family-reunion-app --yes
   ```

3. **Verify** the deploy actually succeeded before assuming it worked:

   ```
   railway deployment list --service family-reunion-app --environment production --limit 5 --json
   ```

   Look for `status: SUCCESS` on the newest entry.

4. **Bootstrap the first admin.** The app's `DATABASE_URL` points at the Railway-internal hostname, which only resolves inside Railway's network — `railway run` (which injects env vars into a _local_ process) fails with `DNSException: getaddrinfo ENOTFOUND`. Use `railway ssh` instead, which executes the command inside the deployed container itself:

   ```
   railway ssh --service family-reunion-app --environment production -- bun run admin:create <email> <password> <name>
   ```

5. **Smoke-test**: visit the production URL, confirm the homepage loads and `/admin` login works with the new credentials.

**Do not run `bun run db:seed` against production as a shortcut for real content.** It generates fake historical events and fake registrations with fake Stripe session IDs — meant for local dev only. Add the real event through `/admin` instead.

## Mobile-first guidelines

The app is fully responsive with a `md:` (768px) breakpoint separating mobile and desktop layouts. Follow these rules to keep mobile working:

- **Never use fixed widths** on form inputs (no `w-24`, `w-28`, etc.). Use grid/flex layouts that collapse to full-width on mobile
- **Grid layouts must include a mobile breakpoint**: use `grid-cols-1 md:grid-cols-N`, never bare `grid-cols-2` or higher
- **Data tables need a mobile card view**: show `md:hidden` stacked cards + `hidden md:block` table. Each card should display the key info (name/title + 1-2 secondary details) without horizontal scrolling
- **Tap targets**: `app.css` enforces 44px min-height on interactive elements below `md:`. Don't override this on mobile
- **Safe area insets**: handled globally in `app.css` on `html`
- **Test mobile layouts**: when adding new pages or changing layouts, verify at 375px width (iPhone SE) in dev tools

# Code style

- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Each Svelte component should declare its own prop types using TypeScript within the same file
- Svelte component files should have constants declared outside the component function
- Use camelCase for variable and function names
- Use PascalCase for Svelte components
- Avoid use of inline styles, prefer Tailwind CSS classes
- Avoid using `any` type in Typescript or casting with `as`
- Declare constant values and objects using `const`
- Constant values that are objects, do not use CAPS for the variable name, use camelCase instead suffixed with 'Value'
- Event handlers should be named with the `handle` prefix (e.g. `handleClick`)
- Only write code comments when the code is not clear and keep it conscise, avoid commenting out code
- Avoid magic numbers and strings, use constants instead
- Each file should have line break at the end
- Try to limit components and modules up to 200 lines and split in to different components to manage complexity
- Typescript files should be camelCase e.g. myService.ts
- `if` statements and `for` loops should always use brackets; no inline `return` statements
- Prefer to put functions, constants, and types into individual files; exported through an index.ts barrel file. Be mindful of circular dependency issues and importing server code onto the client!
- Private/internal helpers that are shared within a folder but not part of its public API are prefixed with an underscore (e.g. `_fetchAndValidateTiers.ts`). They are exported for use within the folder but not re-exported from the barrel `index.ts`. The underscore signals "do not import this from outside this folder."

## File organization

- **Utilities** (`$lib/utils`): `formatPrice`, `getAge`, `parseBirthDate`, `formatBirthDate`, `getInitials`, `cn` — import from barrel `$lib/utils`
- **Constants** (`$lib/general/constants`): `APP_NAME`, `THEMES`, `EVENT_STATUSES`, `navigation` — import from barrel `$lib/general/constants`
- **Components** (`$lib/components`): `AppHeader`, `MobileDrawer`, `AdminDataView`, `EventStatusBanner`, `DatePicker`, `Footer`, `Divider`, `ThemeToggle` — import from barrel `$lib/components`
- **shadcn-svelte UI components** (`$lib/components/ui/`): `Button`, `Badge`, `Card`, `Input`, `Textarea`, `Select`, `Table`, `Alert`, `Avatar`, `Separator`, `Dialog`, `DropdownMenu`, `Sheet`, `Tooltip`, `Breadcrumb`, `Pagination`, `Calendar`, `Sonner`, `Field` — import directly from the component path
- Use `@lucide/svelte` for all icons (not inline SVGs or unplugin-icons): `import { Home } from '@lucide/svelte'`
- Price formatting always uses `formatPrice(cents)` from `$lib/utils`, never inline `(x / 100).toFixed(2)`

# Workflow

- Be sure to run `bun run check` when you're done making a series of code changes
- Use `bun run format` whenever the format is not correct
- Prefer running single tests, and not the whole test suite, for performance
- **Tests**: run `bun run test` after any change to logic covered by tests; add or update co-located `.test.ts` files whenever new utility functions or server logic is added or modified. Tests live next to the source file (e.g. `price.test.ts` beside `price.ts`)

#### Prettier plugin order, and the `$` corruption it caused

`prettier-plugin-tailwindcss` **must be last** in `.prettierrc`'s `plugins` array — its own docs say
so, because it wraps whatever printer the other plugins install. It was second for a long time, with
the sort-imports plugin after it, and the result was that `bun run format` spliced formatted script
blocks back into `.svelte` files through a plain `String.prototype.replace`. The replacement's
special patterns then fired on the source itself:

| In a `<script>` | Became                                        |
| --------------- | --------------------------------------------- |
| `$$`            | `$` — a price silently lost its symbol        |
| `` $` ``        | the whole file _before_ the match, spliced in |
| `$'`            | the whole file _after_ the match, spliced in  |
| `$&`            | the matched text, spliced in                  |

It shipped: `AdminCancelDialog` offered to refund "165.09" with no dollar sign. The last three broke
files outright, and the Svelte parser reported it as
`element_invalid_closing_tag: </script> attempted to close an element that was not open` — pointing
at the closing tag and saying nothing about the cause.

Fixed by moving `prettier-plugin-tailwindcss` last and swapping
`@trivago/prettier-plugin-sort-imports` (unmaintained) for `@ianvs/prettier-plugin-sort-imports`.
All four patterns now survive a format, in code and comments. **Do not reorder that plugins array.**
If a currency symbol or a whole file is ever mangled again, check the order first, then search script
blocks for ``\$[$&'`]``.

`formatUsd(cents)` in `$lib/utils` stays regardless: one place owns the symbol, so components read
`formatUsd(x)` instead of gluing `'$'` onto `formatPrice(x)` in a dozen files. `importOrder` keeps
the same three groups it always had, with `<BUILTIN_MODULES>` and `<THIRD_PARTY_MODULES>` now named
explicitly because @ianvs requires them, and `importOrderCaseSensitive: true` to preserve the
existing ordering. @ianvs additionally sorts named specifiers and merges duplicate type imports from
one module, which is what the one-time 162-file reformat was.

#### `bun test` is not this project's test runner

`bun test` is Bun's own runner and `bun run test` is vitest. The difference is silent and total: Bun's runner ignores `package.json` scripts AND `vitest.config.ts`, so every alias below disappears — `$lib/server/db` points at the real Postgres client, `$env/dynamic/private` and `$app/environment` do not resolve, and `globalSetup` never builds the PGLite template. Bun's `vi` shim is partial too, so tests fail on missing helpers like `setSystemTime`. It reports several hundred fewer tests than exist, which is the part that could mislead someone into reading a run as green.

`bunfig.toml` registers `scripts/blockBunTest.ts` as the `[test]` preload, so `bun test` now exits 1 with that explanation. vitest never loads it.

#### Tests that touch the database run against a real Postgres

`vitest.config.ts` aliases `$lib/server/db` to `db/testing/pgliteDb.ts`, so a test importing a module that queries gets **PGLite** — a real Postgres in-process — instead of the production client. Production is untouched: there is no test branch in `db/index.ts` and PGLite never reaches the build.

```ts
let db: Awaited<ReturnType<typeof resetTestDb>>
beforeEach(async () => {
    db = await resetTestDb() // emptied, fully migrated, ~7ms
})
const seeded = await seedRegistration(db, { members: [...] })
```

- `globalSetup` migrates an empty database **from the real `drizzle/` SQL** once per run and dumps it. A migration that would fail on deploy fails here first.
- **`resetTestDb()` restores that dump once per test FILE and `TRUNCATE`s between tests.** It used to rebuild a PGlite from the 4.7 MB template on every `beforeEach`, documented here as costing about the same as truncating. Measured, it does not: a restore is ~161ms and truncating all eleven public tables is ~7ms, and with 294 database-touching tests that was essentially the whole suite. Each restore also left the previous instance open — every live PGlite holds ~200 MB — so a worker climbed past 6 GB and the contention inflated a 161ms restore to ~660ms in a full run. Fixing both took the suite from **19.5s to 6.5s** and DB tests from 669ms to 127ms each.
- **The truncate list is read from `pg_tables`, never hardcoded.** A migration that adds a table has to be picked up automatically, or rows start surviving between tests and surface as flakiness somewhere unrelated. Only `public` is touched — drizzle's migration tracker lives in its own `drizzle` schema and must survive.
- **The one thing truncate does not undo is DDL.** Nothing in the suite issues any; a test that creates, alters or drops something must restore the template itself rather than assume `resetTestDb` cleaned up after it.
- **Do not wire this into `setupFiles`.** Closing the instance per file via a setup hook was tried and reverted twice over: it imports PGlite into all 89 files (33s of CPU, two thirds of which never touch the database), and because the alias makes `$lib/server/db` and `./pgliteDb` the same module, it breaks the four suites that `vi.mock` that path or `$lib/general/constants`. Vitest isolates per file, so the process holding the instance exits with the file.
- `seedRegistration` returns the **plaintext** management token, which nothing else can — only the hash is stored — so the token gate is exercised rather than mocked.
- Assert on **rows**, not on calls. Stripe and Resend stay mocked (`$lib/server/payments`, `$lib/server/email`): those are genuinely external. The database is not.
- **Posting a form in a test is not posting JSON.** The registration forms run `superForm` with `dataType: 'json'`, so the browser sends `FormData` carrying one `__superform_json` field of **devalue-encoded** data. A test that sends a JSON body instead gets `posted: false`, a blank `data`, and a 400 that looks like a schema bug. Build it the real way — `formData.append('__superform_json', stringify(body))` with `stringify` from `devalue` — see `register/server.test.ts`.
- **Never hand-roll a drizzle mock.** There are none left. They were chainable objects whose queued values had to be listed in the order the function happened to query them, with `drizzle-orm` itself mocked so `eq` was a `vi.fn()` and no WHERE clause was ever evaluated — they pinned the implementation rather than the contract, and could not catch a wrong predicate. Every test that touches the database now uses `resetTestDb()`.
- **Two files still substitute the db module, and both are right to.** `api/health/server.test.ts` replaces it with `{ execute }` because its subject is what happens when the database is UNREACHABLE, which a working PGLite cannot simulate. `auth/auth.test.ts` stubs `getDb` because it asserts on Better Auth's resolved `options` and never issues a query. Neither is a query-builder fake; do not "finish the job" by converting them.
- `vitest.config.ts` also aliases `$env/dynamic/private` and `$app/environment`, which SvelteKit generates at build time and which therefore do not resolve in a node test run. Without them, importing any real server module fails as soon as one of its transitive dependencies reads an environment variable. `dev` is stubbed **false** on purpose: it is the stricter branch, and a suite running as dev would exercise neither `send()`'s missing-key throw nor the real auth guard.
- Real constraints now apply, and they will catch fixture mistakes that the fakes waved through: `one_open_event` (only one `open` reunion event — pass `eventStatus` for a second year), the unique `stripe_session_id`, the one-contact-per-registration index, and the birth-date prefix CHECK.
- **Commits**: follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Format: `<type>[optional scope]: <description>`. Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`. Breaking changes use `!` before the colon (e.g. `feat!: ...`) or a `BREAKING CHANGE:` footer. This project uses `commit-and-tag-version` for releases which relies on this format to determine version bumps.

# Dependency management

- Ensure to find the latest version of a package before adding it
- Avoid using deprecated packages or APIs

# LLM

- shadcn-svelte: https://shadcn-svelte.com/llms.txt
- Svelte & SvelteKit: https://svelte.dev/llms-full.txt
- Bun: https://bun.sh/llms.txt

## Svelte MCP Tools

The Svelte MCP server provides comprehensive Svelte 5 and SvelteKit documentation. Use these tools when doing Svelte development:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Runtime, Package Manager, Test

Always use `bun`, not `npm`.

## Debugging principles

### Diagnosis before remedy

1. State the mechanism in one falsifiable sentence before proposing any fix. If you can't explain why the bad thing happens in a single concrete sentence, you don't have a diagnosis - you have a guess. Fixes proposed before this point anchor you to a wrong model.
2. A mitigation is not a diagnosis. "Make the symptom stop" (add a bound, add a retry, add a cache) and "explain the cause" are different activities. Doing the first early actively harms the second by making you stop looking.
3. Separate "what is the defect" from "what triggered it." For regressions especially, the defect often lives in unchanged code while a separate change made it reachable. Answering the first from the current code is usually faster and firmer than archaeology on the second.

### Evidence discipline

4. Rank evidence by conclusiveness; derive from the strongest artifact first. Not all clues are equal. When one is near-decisive, reason from it rather than generating parallel hypotheses that ignore it.
5. Distinguish "I verified this" from "this seems true," and never let the second speak in the voice of the first. Confidence should track what you actually checked. Phrases like "in practice,"
   "presumably," "should be" are flags to go run the check.
6. Don't generalize from one instance. "This case behaves like X" does not establish "all cases behave like X." Enumerate; check the others.
7. Label every artifact with its exact provenance and don't merge conclusions across sources until you've confirmed they're the same path. Different environment, version, or config = potentially
   different behavior. Conflating them manufactures contradictions you then waste effort resolving.

### Contradictions are signal

8. When two things you believe can't both be true, that gap is the diagnosis - don't paper over it. "It's always been broken" colliding with "it used to work" is not noise to smooth away; it's the exact question to chase.
9. Ask the naive question of yourself: "why did this ever work / not fire before?" The highest-leverage questions are often the simplest ones you're tempted to skip.

### Verification

10. A fix isn't verified until you've seen the test fail without it. Watching the broken code exhibit the failure - and the fix remove it - is far stronger than a passing happy-path test.
11. Verify across the conditions that change behavior, not just the default. Flags, environments, config toggles, concurrency - enumerate the axes that could alter the path and confirm each.
12. Prove equivalence exhaustively when replacing load-bearing logic. For a sensitive change, tabulate every input/state and show old-vs-new behavior matches everywhere except the intended delta.
    "It looks equivalent" is not equivalence.

### Working style

13. Resist the bias toward forward motion. The urge to propose/plan/patch fires before diagnosis is done. On sensitive work, treat that urge as a liability and route it back into "go falsify the mechanism first."
14. Internalize backpressure instead of relying on the reviewer to supply it. If a person keeps having to push you back to evidence, pre-empt them: challenge your own claim before presenting it.
15. Prefer the smallest change that maps exactly to the diagnosed cause. Once the mechanism is nailed, the fix should be traceable to it - not a broad rewrite that "probably also" fixes other things.

16. Read the actual current code, not your memory of it. Line numbers drift, functions move, code you "know" has changed. Re-read before reasoning or editing.
