/* Runs the Stripe registration scenarios end to end.
   Usage: bun run e2e [--no-build] [-- <playwright args>]

   1. Builds the app (vite build), unless --no-build.
   2. Creates the e2e database (family_reunion_e2e on the same local Postgres as DATABASE_URL) if it is
      missing, and migrates it with the real migrations.
   3. Recreates the e2e organizer with admin:create; globalSetup enrolls it in 2FA.
   4. Starts `stripe listen`, forwarding test-mode webhooks to the e2e server, and passes its secret on.
   5. Runs Playwright (e2e/playwright.config.ts), which starts the built server and stops it after.

   Bun loads .env, so STRIPE_SECRET_KEY (a TEST key — refused otherwise), BETTER_AUTH_SECRET and
   DATABASE_URL come from there. */
import { $, spawn } from 'bun'
import {
    E2E_ADMIN_EMAIL,
    E2E_ADMIN_NAME,
    E2E_ADMIN_PASSWORD,
    E2E_BASE_URL,
    E2E_DATABASE_NAME,
    e2eDatabaseUrl,
} from './support/env'

const args = process.argv.slice(2)
const separator = args.indexOf('--')
const playwrightArgs = separator === -1 ? [] : args.slice(separator + 1)
const skipBuild = args.includes('--no-build')

const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
if (!stripeKey.startsWith('sk_test_')) {
    console.error(
        'STRIPE_SECRET_KEY must be a TEST key (sk_test_…): these scenarios make real charges.',
    )
    process.exit(1)
}
const developmentUrl = process.env.DATABASE_URL ?? ''
const databaseUrl = e2eDatabaseUrl(developmentUrl)

if (!skipBuild) {
    await $`bun run build`
}

const exists = (
    await $`psql ${developmentUrl} -Atc ${`SELECT 1 FROM pg_database WHERE datname = '${E2E_DATABASE_NAME}'`}`.text()
).trim()
if (exists !== '1') {
    await $`psql ${developmentUrl} -c ${`CREATE DATABASE ${E2E_DATABASE_NAME}`}`
}
await $`bun scripts/migrate.ts`.env({ ...process.env, DATABASE_URL: databaseUrl })

await $`psql ${databaseUrl} -c ${`DELETE FROM "user" WHERE email = '${E2E_ADMIN_EMAIL}'`}`.quiet()
await $`bun scripts/createAdmin.ts ${E2E_ADMIN_EMAIL} ${E2E_ADMIN_PASSWORD} ${E2E_ADMIN_NAME}`.env({
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: E2E_BASE_URL,
})

const webhookSecret = (await $`stripe listen --api-key ${stripeKey} --print-secret`.text()).trim()
const listener = spawn(
    [
        'stripe',
        'listen',
        '--api-key',
        stripeKey,
        '--forward-to',
        `${E2E_BASE_URL}/api/webhooks/stripe`,
    ],
    { stdout: 'inherit', stderr: 'pipe' },
)

/* `stripe listen` prints "Ready!" on stderr once it can forward. */
const ready = await (async () => {
    const decoder = new TextDecoder()
    const reader = listener.stderr.getReader()
    const deadline = Date.now() + 30_000
    let seen = ''
    while (Date.now() < deadline) {
        const { value, done } = await reader.read()
        if (done) {
            return false
        }
        seen += decoder.decode(value)
        if (seen.includes('Ready!')) {
            reader.releaseLock()
            return true
        }
    }
    return false
})()
if (!ready) {
    listener.kill()
    console.error(
        'stripe listen did not become ready. Is wss://stripecli-ws-*.stripe.com reachable?',
    )
    process.exit(1)
}

/* node rather than bunx: under bunx the server Playwright starts could not open its port here. */
const playwright = spawn(
    [
        'node',
        'node_modules/@playwright/test/cli.js',
        'test',
        '-c',
        'e2e/playwright.config.ts',
        ...playwrightArgs,
    ],
    {
        stdout: 'inherit',
        stderr: 'inherit',
        env: { ...process.env, E2E_STRIPE_WEBHOOK_SECRET: webhookSecret },
    },
)
const exitCode = await playwright.exited
listener.kill()
process.exit(exitCode)
