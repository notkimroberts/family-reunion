# Family Reunion

[![CI](https://github.com/notkimroberts/family-reunion/actions/workflows/ci.yml/badge.svg)](https://github.com/notkimroberts/family-reunion/actions/workflows/ci.yml)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/project/879a5c19-03d9-426a-aee3-207aec98321a/service/f968a4a8-5fc2-473c-b4a7-fa737dbe9e17)
[![Sentry](https://img.shields.io/badge/sentry-monitored-362d59)](https://22aae0d29adf.sentry.io/projects/family-reunion/?project=4511474410061824)

A web application for managing family reunions — registration, payments, family tree, photo gallery, and more.

## Tech Stack

- **Framework**: SvelteKit (full-stack, Svelte 5 with runes)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth (email + password, admin only — public sign-up disabled)
- **Payments**: Stripe Checkout
- **Storage**: Cloudflare R2
- **Email**: Resend
- **Error monitoring**: Sentry
- **Styling**: Tailwind CSS v4 + shadcn-svelte
- **Hosting**: Railway

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- PostgreSQL (local instance)
- Stripe account
- Cloudflare R2 bucket
- Resend account
- OAuth credentials for Google, Apple, and/or Facebook

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env`. The file is grouped into sections: database, Better Auth, OAuth providers (Google, Apple, Facebook), Stripe, Cloudflare R2, Resend, and Sentry.

### 3. Initialize the database

Apply migrations to your local database:

```bash
bun run db:migrate
```

Optionally seed with sample data:

```bash
bun run db:seed
```

> `db:generate` is only needed when you change `src/lib/server/db/schema.ts` — not during initial setup. Read the migration rules in `CLAUDE.md` before modifying the schema.

### 4. Set admin user

After signing in for the first time via SSO or magic link, set yourself as admin directly in the database:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Run the dev server

```bash
bun run dev
```

The app will be available at `http://localhost:5173`.

> The dev script sets `NODE_TLS_REJECT_UNAUTHORIZED=0` to bypass TLS verification locally — safe for development only.

### 6. Forward Stripe webhooks (for payment testing)

Stripe delivers webhook events to a public URL, so local dev requires the Stripe CLI to forward them to your running server. In a second terminal:

```bash
bun run stripe:dev
```

This finds your dev server rather than assuming port 5173 — Vite increments to 5174 and up when the port is taken, and a forward to the wrong port fails **silently**: the app never sees `checkout.session.completed`, so no confirmation email is sent and the registration sits at `pending` while the payer believes they have paid. The script probes `/api/health` and prints the URL it is forwarding to; if it finds nothing it refuses to start instead of forwarding into the void.

Set `PORT=5180 bun run stripe:dev` for a tunnel or container the probe cannot reach — that port is used without probing. Anything after `--` is passed to the Stripe CLI, e.g. `bun run stripe:dev -- --events checkout.session.completed`.

The CLI will print a webhook signing secret (`whsec_...`). Set that value as `STRIPE_WEBHOOK_SECRET` in your `.env` — it's different from your production secret. Leave it running alongside `bun run dev` whenever testing the registration or checkout flow.

## Database Commands

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `bun run db:generate` | Generate a new migration from schema changes        |
| `bun run db:migrate`  | Apply pending migrations                            |
| `bun run db:push`     | Push schema directly to DB (dev only, no migration) |
| `bun run db:seed`     | Seed the database if empty (skips if data exists)   |
| `bun run db:reseed`   | Truncate all app tables and re-seed from scratch    |
| `bun run db:studio`   | Open Drizzle Studio (database GUI)                  |

## Project Structure

```
src/
├── lib/
│   ├── components/        # Shared UI components (AppHeader, MobileDrawer, etc.)
│   │   └── ui/            # shadcn-svelte components
│   ├── general/
│   │   └── constants/     # App-wide constants
│   ├── server/
│   │   ├── auth/          # Better Auth config + guards
│   │   ├── db/            # Drizzle schema + connection
│   │   ├── email/         # Resend email utilities
│   │   ├── payments/      # Stripe helpers
│   │   ├── registrations/ # Registration logic
│   │   ├── storage/       # Cloudflare R2 utilities
│   │   └── users/         # User profile logic
│   ├── stores/            # Svelte stores (theme)
│   ├── types/             # Type declarations
│   ├── utils/             # Shared utilities (formatPrice, getAge, cn, etc.)
│   └── auth-client.ts     # Client-side auth
└── routes/
    ├── (app)/             # Authenticated routes
    │   ├── admin/         # Admin dashboard
    │   ├── changelog/     # App changelog
    │   ├── family-tree/   # Family tree visualization
    │   ├── gallery/       # Photo gallery + upload
    │   ├── profile/       # User profile + relationship management
    │   ├── program/       # Reunion program page
    │   ├── register/      # Registration + Stripe checkout
    │   └── shop/          # External shop link page
    ├── (auth)/            # Unauthenticated routes
    │   └── login/         # SSO + magic link login
    └── api/
        ├── registration/      # Registration API endpoints
        └── webhooks/stripe/   # Stripe webhook handler
```

## Deployment (Railway)

The app uses `@sveltejs/adapter-node`. Configure the following in your Railway service settings (Railway has no config file — these are set in the dashboard):

| Setting            | Value                 |
| ------------------ | --------------------- |
| Build command      | `vite build`          |
| Start command      | `node build/index.js` |
| Pre-deploy command | `drizzle-kit migrate` |

Set all environment variables from `.env.example` in Railway's environment panel. Use Railway's internal Postgres connection string for `DATABASE_URL` (e.g. `postgres.railway.internal/...`).
