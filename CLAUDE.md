# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (http://localhost:5173)
bun run build            # Production build
bun run check            # Svelte type checking
bun run lint             # Prettier check + ESLint
bun run format           # Prettier write (auto-fix formatting)
bun run test             # Run Vitest unit tests

bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply pending migrations
bun run db:push          # Push schema directly to DB (dev shortcut)
bun run db:seed          # Seed database if empty (skips if data already exists)
bun run db:reseed        # Always truncate all app tables and re-seed
bun run db:studio        # Drizzle Studio GUI
```

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
- All person records store birth date as split nullable integers (`birthYear`, `birthMonth`, `birthDay`); a CHECK constraint enforces prefix-consistency (day ⇒ month, month ⇒ year). `family_members` allows partial dates (year-only is fine for ancestors); registration party members come through the form which requires a full date

### Server modules

Server logic lives under `src/lib/server/`, one domain per folder. Each exported function has its own file; barrel `index.ts` files expose the public API. Private helpers shared within a folder are prefixed with `_` and not re-exported from the barrel.

| Module        | Path                        | Responsibility                                                                                    |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| Registrations | `$lib/server/registrations` | Barrel delegating to `checkout/`, `management/`, `queries/`                                       |
| — checkout    | `registrations/checkout/`   | Pending registration, add-member checkout, admin direct creation, Stripe fulfillment              |
| — management  | `registrations/management/` | Post-payment mutations: remove member, cancel, update member details, link to family tree         |
| — queries     | `registrations/queries/`    | All registration reads                                                                            |
| Payments      | `$lib/server/payments`      | Stripe checkout creation, refunds, session retrieval; metadata encode/decode in `stripeMetadata/` |
| Email         | `$lib/server/email`         | Template rendering in `templates/`; Resend delivery in `send/`                                    |
| Storage       | `$lib/server/storage`       | Cloudflare R2 uploads/deletes; local-dev writes to `static/uploads/`                              |
| Auth          | `$lib/server/auth`          | Better Auth setup; guards in `guards/`                                                            |

### Auth

- **Better Auth** with admin plugin and email + password sign-in
- Magic link has been removed — admins sign in at `/login` with credentials only
- `hooks.server.ts` populates `event.locals.user` per request. In dev mode, falls back to a hardcoded admin user when no session exists
- Guards: `requireAuth()` and `requireAdmin()` in `$lib/server/auth/guards`. Used by `/admin/*` and the `restoreSnapshot` family-tree action only — registration is fully public
- Better Auth manages its own tables (`user`, `session`, `account`)
- **Lazy-init typing**: `betterAuth({...})` returns a concrete parameterized type that TypeScript can't directly assign to `ReturnType<typeof betterAuth>`. To avoid `any`, extract the call into a `createAuthInstance()` function and type the singleton as `ReturnType<typeof createAuthInstance> | undefined`

#### Bootstrapping admins

`bun run admin:create <email> <password> [name]` creates a Better Auth user and sets `role='admin'` on the user row. Reads `DATABASE_URL` from the environment. Run once on a fresh DB; subsequent admins can be added via the admin panel.

### Registration Flow

Registration is **fully public — no sign-in required**. Anyone with a name + email can register and pay.

1. **Register** (`/register`) — public form collects contact name, email, party members. Submitting creates a pending registration with a `managementToken` and redirects to Stripe Checkout.
2. **Manage** (`/register/manage?token=…`) — public; the success URL after Stripe checkout. Shows pending/processing while polling, switches to `RegistrationManager` once paid. All add/edit/remove/cancel actions take the token as a hidden form field.
3. **Recover** (`/register/recover`) — public; enter the registration email and the management link is re-sent via email.

The token is the only credential — no per-request auth check. Email enumeration is avoided in `/register/recover` by always returning a generic success message.

Route groups:

- `(auth)` — `/login` only, no nav, full-screen card layout. Admin sign-in only.
- `(app)` — public paths include `/`, `/family-tree`, `/gallery`, `/program`, `/shop`, `/register`. Everything else (e.g. `/admin/*`) requires sign-in. Contact is a section on `/` (`#contact`), not its own route.

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
  - Never import `superValidate` from the `sveltekit-superforms` barrel on the server — it re-exports `SuperDebug.svelte` which breaks SSR
- **shadcn-svelte field components** (`$lib/components/ui/field/`) for form field structure: `Field.Group`, `Field.Field`, `Field.Label`, `Field.Error`, `Field.Description`
- **bits-ui Select** has a `string | string[]` union for `value` — avoid `bind:value` on a `string` variable; use a native `<select>` styled with Tailwind or use `onValueChange` without bind
- Define zod schemas in a co-located `schema.ts` file next to the route
- **Initializing `$state` from load data**: don't use `$state(undefined)` + `$effect(() => { x = derived })` — this triggers the `svelte/prefer-writable-derived` lint error. Instead compute the value directly: `let x = $state(computedValue)`. This is intentional for "local copy" edit patterns where the value starts from server data but can be independently modified.
- **Reactive collections**: use `SvelteMap` and `SvelteSet` from `svelte/reactivity` instead of `Map` and `Set` inside Svelte components — the ESLint rule `svelte/prefer-svelte-reactivity` enforces this and will block commits.

### Payments

- **Stripe Checkout** for event registration. Webhook at `/api/webhooks/stripe` handles `checkout.session.completed`
- Each registration carries a `managementToken` (32 random bytes, base64url) — the credential the registrant uses to manage their party afterward. The DB only stores `sha256(token)`; the plaintext lives in URLs/email and is carried through Stripe metadata so the webhook can build the manage URL in the confirmation email
- `/register/manage?token=…` sets a `reg_token` HttpOnly cookie on first land and redirects to a clean URL, keeping the plaintext out of subsequent access logs / Sentry breadcrumbs / referers
- `party_members` are denormalized: tier label and price are snapshotted onto the row at registration time so subsequent tier rename/reprice don't change historical refund amounts
- Stripe session metadata is typed via `encodeRegistrationMetadata` / `encodeAddMemberMetadata` / `decodeSessionMetadata` in `$lib/server/payments/stripeMetadata` — never access `session.metadata` keys directly. `decodeSessionMetadata` fails closed (returns null) when required fields are missing
- Refund flows pass a stable Stripe idempotency key (`remove-member-<id>`, `cancel-registration-<id>-<intent>`) so retries cannot double-refund

### Family Tree

- Uses `family-chart` library (d3-based). The container element needs class `f3` for the library's CSS to apply
- API: `createChart(element, nodes)` → `.setCardHtml()` → `.updateTree({ initial: true })`
- Card content is fully customizable via `.setCardInnerHtmlCreator((d) => html)` — data lives at `d.data.data` (double-nested)

### Icons

- **@lucide/svelte** for all icons — import as named components: `import { Home, Users } from '@lucide/svelte'`
- Browse available icons at lucide.dev; use PascalCase component names (e.g. `CalendarClock`, `ShoppingBag`)
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
- **Side drawer** (`MobileDrawer.svelte`) slides in from the left on mobile, triggered by a hamburger button in `AppHeader`. Contains: app logo/name, Family links, Reunion links, Register CTA, theme toggle (sign-in / sign-out are admin-only and live inside the admin shell)
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
- Predeploy command (Railway setting): `bun run db:migrate` (`scripts/migrate.ts`) — runs migrations before the server starts. It wraps `drizzle-orm`'s migrator directly instead of shelling out to `drizzle-kit migrate`, because drizzle-kit's spinner UI writes progress via carriage-return redraws that collapse to nothing useful over a non-TTY log pipe (Railway's), hiding the real error behind a bare "exited with code 1". The script also retries the initial connection for ~30s, since a scaled-to-zero Postgres only reliably wakes on public-proxy traffic, not the internal `DATABASE_URL` predeploy uses — without the retry, the first connection attempt can race a still-sleeping database and fail fast with no useful error at all.
- Start: `node build/index.js`
- DB migrations are idempotent — Drizzle tracks applied migrations and skips them on subsequent deploys
- Required Railway environment variables: `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT=production`
- **Watch paths**: `family-reunion-app`'s Railway build config sets `watchPatterns` to `["src/**", "static/**", "drizzle/**", "package.json", "bun.lock", "svelte.config.js", "vite.config.ts", "tsconfig.json"]`, so pushes to `main` that only touch docs/tooling (`CLAUDE.md`, `.claude/**`, `.agents/**`, `skills-lock.json`, etc.) don't trigger a deploy. If you add a new source directory, config file, or build input outside these paths, update the pattern list (`railway environment edit --environment production --service-config family-reunion-app build.watchPatterns '[...]'`) or it'll silently stop deploying real changes.

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

**Do not run `bun run db:seed` against production as a shortcut for real content.** It generates a fictional 100-person family tree via faker, fake historical events, and fake registrations with fake Stripe session IDs — meant for local dev only. Add real family members and the real event through `/admin` instead.

## Mobile-first guidelines

The app is fully responsive with a `md:` (768px) breakpoint separating mobile and desktop layouts. Follow these rules to keep mobile working:

- **Never use fixed widths** on form inputs (no `w-24`, `w-28`, etc.). Use grid/flex layouts that collapse to full-width on mobile
- **Grid layouts must include a mobile breakpoint**: use `grid-cols-1 md:grid-cols-N`, never bare `grid-cols-2` or higher
- **Data tables need a mobile card view**: show `md:hidden` stacked cards + `hidden md:block` table. Each card should display the key info (name/title + 1-2 secondary details) without horizontal scrolling
- **Tap targets**: `app.css` enforces 44px min-height on interactive elements below `md:`. Don't override this on mobile
- **Safe area insets**: handled globally in `app.css` on `html`
- **Family tree**: shows a list view on mobile (`md:hidden`), chart on desktop (`hidden md:block`)
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
- **Components** (`$lib/components`): `AppHeader`, `MobileDrawer`, `DatePicker`, `Footer`, `Divider`, `PageTitle`, `ThemeToggle` — import from barrel `$lib/components`
- **shadcn-svelte UI components** (`$lib/components/ui/`): `Button`, `Badge`, `Card`, `Input`, `Textarea`, `Select`, `Table`, `Alert`, `Avatar`, `Separator`, `Dialog`, `DropdownMenu`, `Sheet`, `Tooltip`, `Breadcrumb`, `Pagination`, `Calendar`, `Sonner`, `Field` — import directly from the component path
- Use `@lucide/svelte` for all icons (not inline SVGs or unplugin-icons): `import { Home } from '@lucide/svelte'`
- Price formatting always uses `formatPrice(cents)` from `$lib/utils`, never inline `(x / 100).toFixed(2)`

# Workflow

- Be sure to run `bun run check` when you're done making a series of code changes
- Use `bun run format` whenever the format is not correct
- Prefer running single tests, and not the whole test suite, for performance
- **Tests**: run `bun run test` after any change to logic covered by tests; add or update co-located `.test.ts` files whenever new utility functions or server logic is added or modified. Tests live next to the source file (e.g. `price.test.ts` beside `price.ts`)
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
