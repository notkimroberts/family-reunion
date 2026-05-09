# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start dev server (http://localhost:5173)
bun run build            # Production build
bun run check            # Svelte type checking
bun run lint             # Prettier check + ESLint
bun run format           # Prettier write (auto-fix formatting)

bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Apply pending migrations
bun run db:push          # Push schema directly to DB (dev shortcut)
bun run db:seed          # Seed database with test data (idempotent)
bun run db:studio        # Drizzle Studio GUI
```

When schema changes cause interactive prompts in `db:generate` (rename vs create), clear the `drizzle/` directory and regenerate fresh — this is a dev-only database.

For a clean database reset: `dropdb family_reunion && createdb family_reunion && bun db:migrate && bun db:seed`

## Architecture

SvelteKit full-stack app (Svelte 5 with runes). Node adapter for Railway deployment. Bun as package manager and runtime. Please read all the latest documentation for (Svelte Kit)[svelte.dev/llms.txt] and Tailwind CSS to ensure you are familiar with the latest features and best practices before implementing any new features or changes in these areas.

### Data Layer

- **PostgreSQL** via `postgres` driver + **Drizzle ORM** (schema at `src/lib/server/db/schema.ts`)
- DB connection uses lazy init with SvelteKit's `$env/dynamic/private` — standalone scripts (like seed.ts) must create their own `postgres()` client directly
- All person records store `birthYear` (required or nullable depending on table) + optional `birthMonth`/`birthDay`; age is always derived via `getAge()` from `$lib/utils/age`

### Auth

- **Better Auth** with admin plugin. Social SSO only (Google, Apple, Facebook)
- `hooks.server.ts` populates `event.locals.user` per request. In dev mode, falls back to a hardcoded admin user when no session exists
- Guards: `requireAuth()` and `requireAdmin()` in `$lib/server/auth/guards.ts`
- Better Auth manages its own tables (`user`, `session`, `account`) — separate from the app's `user_profiles` table

### Payments

- **Stripe Checkout** for event registration. Webhook at `/api/webhooks/stripe` handles `checkout.session.completed`
- `party_members` are linked to `pricing_tiers` (age-based); the tier FK is the source of truth for what was charged

### Storage & Email

- **Cloudflare R2** for photo uploads (`$lib/server/storage`)
- **Resend** for transactional emails (`$lib/server/email`)

### Family Tree

- Uses `family-chart` library (d3-based). The container element needs class `f3` for the library's CSS to apply
- API: `createChart(element, nodes)` → `.setCardHtml()` → `.updateTree({ initial: true })`
- Card content is fully customizable via `.setCardInnerHtmlCreator((d) => html)` — data lives at `d.data.data` (double-nested)

### Icons

- **unplugin-icons** with full `@iconify/json` collection — only used icons are bundled
- Import as Svelte components: `import MdiHome from 'virtual:icons/mdi/home'`
- Browse available icons at icones.js.org; path format is `virtual:icons/{collection}/{icon-name}`

### Styling

- **Tailwind CSS + DaisyUI** with custom light/dark themes defined in `tailwind.config.js`
- Theme constants (`LIGHT_THEME`, `DARK_THEME`) in `$lib/general/constants/THEMES.ts`
- Theme toggle persisted in localStorage via `$lib/stores/theme`
- **Fonts**: PT Serif (headings) + Lato (body), loaded via Google Fonts in `app.html`

### Mobile Navigation

- Top navbar is **hidden on mobile** (`hidden md:flex`) — only shown on desktop
- **Bottom tab bar** (`BottomTabBar.svelte`) is fixed at the bottom on mobile with 4 tabs (Home, Gallery, Tree, Members) + Menu
- **Bottom sheet** (`BottomSheet.svelte`) opens from the Menu tab with: Program, Shop, Contact, Register, theme toggle, user account
- Main content has `pb-16 md:pb-0` to clear the bottom bar on mobile

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
- **Safe area insets**: handled globally in `app.css` on `html` + bottom bar uses `pb-[env(safe-area-inset-bottom)]`
- **Family tree**: shows a list view on mobile (`md:hidden`), chart on desktop (`hidden md:block`)
- **Bottom bar clearance**: any page with fixed-bottom elements must account for the tab bar height (4rem / `pb-16`)
- **Test mobile layouts**: when adding new pages or changing layouts, verify at 375px width (iPhone SE) in dev tools

# Code style

- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Each Svelte component should declare its own prop types using TypeScript within the same file
- Svelte component files should have constants declared outside the component function
- Use camelCase for variable and function names
- Use PascalCase for Svelte components
- Avoid use of inline styles, prefer Tailwind CSS classes
- Avoid using `any` type in Typescript or casting with as
- Declare constant values and objects using `const`
- Constant values that are objects, do not use CAPS for the variable name, use camelCase instead suffixed with 'Value'
- Event handlers should be named with the `handle` prefix (e.g. `handleClick`)
- Only write code comments when the code is not clear and keep it conscise, avoid commenting out code
- Avoid magic numbers and strings, use constants instead
- Each file should have line break at the end
- Try to limit components and modules up to 200 lines and split in to different components to manage complexity
- Typescript files should be camelCase e.g. myService.ts
- `if` statements and `for` loops should always use brackets; no inline return statements
- Prefer to put functions, constants, and types into individual files; exported through an index.ts barrel file. Be mindful of circular dependency issues and importing server code onto the client!

## File organization

- **Utilities** (`$lib/utils`): `formatPrice`, `getAge`, `getInitials` — import from barrel `$lib/utils`
- **Constants** (`$lib/general/constants`): `APP_NAME`, `THEMES`, `EVENT_STATUSES`, `navigation` — import from barrel `$lib/general/constants`
- **Components** (`$lib/components`): `BottomSheet`, `BottomTabBar`, `Divider`, `PageTitle`, `ThemeToggle` — import from barrel `$lib/components`
- Use `unplugin-icons` for all icons (not inline SVGs): `import MdiMenu from 'virtual:icons/mdi/menu'`
- Price formatting always uses `formatPrice(cents)` from `$lib/utils`, never inline `(x / 100).toFixed(2)`

# Workflow

- Be sure to run `bun run check` when you're done making a series of code changes
- Use `bun run format` whenever the format is not correct
- Prefer running single tests, and not the whole test suite, for performance

# Dependency management

- Ensure to find the latest version of a package before adding it
- Avoid using deprecated packages or APIs
