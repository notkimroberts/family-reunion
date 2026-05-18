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
bun run db:seed          # Seed database with test data (idempotent)
bun run db:studio        # Drizzle Studio GUI
```

### Migration rules

**Never delete or modify existing migration files.** Drizzle tracks applied migrations by file hash; removing or regenerating a file breaks production deploys. Always add new migrations on top of existing ones.

Schema changes must follow this sequence:

1. Edit `src/lib/server/db/schema.ts`
2. Run `bun run db:generate` — Drizzle diffs the latest snapshot against the schema and produces a new `NNNN_*.sql` file
3. If the generated SQL would drop data (e.g. dropping a column with existing data, changing a column type), **edit the migration file** to add the safe sequence: add the new column → backfill data → set constraints → drop the old column
4. Run `bun run db:migrate` locally, then commit both the schema change and the new migration files together

**Do not use `db:push`** in any environment where data must be preserved — it bypasses the migration tracker.

For a clean local database reset (dev only): `dropdb family_reunion && createdb family_reunion && bun run db:migrate && bun run db:seed`

## Architecture

SvelteKit full-stack app (Svelte 5 with runes). Node adapter for Railway deployment. Bun as package manager and runtime. Please read all the latest documentation for (Svelte Kit)[svelte.dev/llms.txt] and Tailwind CSS to ensure you are familiar with the latest features and best practices before implementing any new features or changes in these areas.

### Data Layer

- **PostgreSQL** via `postgres` driver + **Drizzle ORM** (schema at `src/lib/server/db/schema.ts`)
- DB connection uses lazy init with SvelteKit's `$env/dynamic/private` — standalone scripts (like seed.ts) must create their own `postgres()` client directly
- All person records store a single `birthDate` (`date` column, ISO string `YYYY-MM-DD`); age is always derived via `getAgeFromDate()` from `$lib/utils/age`

### Auth

- **Better Auth** with admin plugin. Social SSO (Google, Apple, Facebook) + magic link email
- Magic link plugin configured in `src/lib/server/auth/index.ts`; email sent via `sendMagicLinkEmail` in `$lib/server/email`
- `hooks.server.ts` populates `event.locals.user` per request. In dev mode, falls back to a hardcoded admin user when no session exists
- Guards: `requireAuth()` and `requireAdmin()` in `$lib/server/auth/guards.ts`
- Better Auth manages its own tables (`user`, `session`, `account`) — separate from the app's `user_profiles` table
- **Lazy-init typing**: `betterAuth({...})` returns a concrete parameterized type that TypeScript can't directly assign to `ReturnType<typeof betterAuth>`. To avoid `any`, extract the call into a `createAuthInstance()` function and type the singleton as `ReturnType<typeof createAuthInstance> | undefined`

### Sign-up & Registration Flow

Two-step flow made visually explicit to users:

1. **Step 1** — SSO account creation/sign-in (`/login`)
2. **Step 2** — Event registration (`/register`)

Route groups:

- `(auth)` — `/login` only, no nav, full-screen card layout with step indicator. All SSO providers use `callbackURL: '/register'` so new and returning users land directly on event registration after sign-in
- `(app)` — all authenticated routes including `/register`

### Forms

- **sveltekit-superforms** + **zod** for server-validated forms. Always use the zod v4 adapters:
  - Server: `import { superValidate } from 'sveltekit-superforms/server'` and `import { zod4 as zod } from 'sveltekit-superforms/adapters'`
  - Client: `import { superForm } from 'sveltekit-superforms'` and `import { zod4Client as zodClient } from 'sveltekit-superforms/adapters'`
  - Never import `superValidate` from the `sveltekit-superforms` barrel on the server — it re-exports `SuperDebug.svelte` which breaks SSR
- **shadcn-svelte field components** (`$lib/components/ui/field/`) for form field structure: `Field.Group`, `Field.Field`, `Field.Label`, `Field.Error`, `Field.Description`
- **bits-ui Select** has a `string | string[]` union for `value` — avoid `bind:value` on a `string` variable; use a native `<select>` styled with Tailwind or use `onValueChange` without bind
- Define zod schemas in a co-located `schema.ts` file next to the route
- **Initializing `$state` from load data**: don't use `$state(undefined)` + `$effect(() => { x = derived })` — this triggers the `svelte/prefer-writable-derived` lint error. Instead compute the value directly: `let x = $state(computedValue)`. This is intentional for "local copy" edit patterns where the value starts from server data but can be independently modified.

### Payments

- **Stripe Checkout** for event registration. Webhook at `/api/webhooks/stripe` handles `checkout.session.completed`
- `party_members` are linked to `pricing_tiers` (age-based); the tier FK is the source of truth for what was charged

### Storage & Email

- **Cloudflare R2** for photo uploads (`$lib/server/storage`)
- In dev mode, uploads save to `static/uploads/` (served by Vite) instead of hitting R2 — no R2 credentials needed locally
- **Resend** for transactional emails (`$lib/server/email`)

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
- **Side drawer** (`MobileDrawer.svelte`) slides in from the left on mobile, triggered by a hamburger button in `AppHeader`. Contains: app logo/name, Family links, Reunion links, Register CTA, theme toggle, profile/admin/sign-out
- Main content has no bottom-bar clearance (bottom tab bar was removed)

### Versioning

- **commit-and-tag-version** for semantic versioning and changelog generation
- App version injected at build time via Vite `define` (`__APP_VERSION__` from package.json)
- Release workflow: `bun run release` (patch), `release:minor`, `release:major`, `release:first`

### Deployment

- **Railway** with Node adapter. Internal Postgres at `postgres.railway.internal`
- Build: `vite build` (DB is not reachable during build — Railway internal DNS is runtime-only)
- Predeploy command (Railway setting): `drizzle-kit migrate` — runs migrations before the server starts
- Start: `node build/index.js`
- DB migrations are idempotent — Drizzle tracks applied migrations and skips them on subsequent deploys

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

## File organization

- **Utilities** (`$lib/utils`): `formatPrice`, `getAge`, `getInitials` — import from barrel `$lib/utils`
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

# Dependency management

- Ensure to find the latest version of a package before adding it
- Avoid using deprecated packages or APIs

# LLM

- shadcn-svelte: https://shadcn-svelte.com/llms.txt
- Svelte & SvelteKit: https://svelte.dev/llms-full.txt
- Bun: https://bun.sh/llms.txt

## Runtime, Package Manager, Test

Always use `bun`, not `npm`.
