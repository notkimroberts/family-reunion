# Family Reunion

A web application for managing family reunions — registration, payments, family tree, photo gallery, and more.

## Tech Stack

- **Framework**: SvelteKit (full-stack)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth (Google, Apple, Facebook SSO)
- **Payments**: Stripe
- **Storage**: Cloudflare R2
- **Email**: Resend
- **Styling**: Tailwind CSS + DaisyUI
- **Family Tree**: family-chart
- **Hosting**: Railway

## Prerequisites

- [Bun](https://bun.sh) (v1.3+)
- PostgreSQL database (local or Railway)
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

Fill in all values in `.env`. See `.env.example` for the full list.

### 3. Initialize the database

Generate the migration files from the Drizzle schema:

```bash
bun run db:generate
```

Push the schema directly to your database (for development):

```bash
bun run db:push
```

Or run migrations (for production):

```bash
bun run db:migrate
```

Better Auth will automatically create its own tables (`user`, `session`, `account`) on first request.

### 4. Set admin user

After signing in for the first time via SSO, set yourself as admin by updating the Better Auth `user` table directly:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Run the dev server

```bash
bun run dev
```

The app will be available at `http://localhost:5173`.

## Database Commands

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `bun run db:generate` | Generate migration files from schema changes |
| `bun run db:migrate`  | Run pending migrations                       |
| `bun run db:push`     | Push schema directly to DB (dev only)        |
| `bun run db:studio`   | Open Drizzle Studio (database GUI)           |

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── auth/       # Better Auth config + guards
│   │   ├── db/         # Drizzle schema + connection
│   │   ├── email/      # Resend email utilities
│   │   └── storage/    # Cloudflare R2 utilities
│   ├── stores/         # Svelte stores (theme)
│   └── auth-client.ts  # Client-side auth
├── routes/
│   ├── admin/          # Admin dashboard, user/event/photo management
│   ├── api/            # Auth endpoints, Stripe webhook
│   ├── contact/        # Contact form
│   ├── family-tree/    # Family tree visualization
│   ├── gallery/        # Photo gallery + upload
│   ├── login/          # SSO login page
│   ├── members/        # Family member directory
│   ├── profile/        # User profile + relationship management
│   ├── program/        # Reunion program page
│   ├── register/       # Registration + Stripe checkout
│   └── shop/           # External shop link page
└── types/              # Type declarations
```

## Deployment (Railway)

1. Create a new Railway project with a PostgreSQL service
2. Connect your repo and set all environment variables
3. Railway will auto-detect the Node adapter and deploy

Set `DATABASE_URL` to the Railway-provided Postgres connection string.
