import { defineConfig } from '@playwright/test'
import {
    E2E_ADMIN_EMAIL,
    E2E_BASE_URL,
    E2E_OUTBOX_DIR,
    E2E_PORT,
    E2E_PREVIEW_KEY,
    e2eDatabaseUrl,
} from './support/env'

/* Run through `bun run e2e` (e2e/run.ts), which builds the app, migrates the e2e database, recreates
   the e2e organizer and starts `stripe listen` before this config starts the server — the webhook
   secret it prints is passed in as E2E_STRIPE_WEBHOOK_SECRET.

   One worker: every scenario shares the server, the database and the Stripe listener, and resets the
   database at its start. */

/* Behind an HTTP proxy (the Claude sandbox), the browser and the server's Stripe calls go through it;
   NODE_USE_ENV_PROXY makes Node's https honor HTTPS_PROXY. Unset, both connect directly. */
const proxyServer = process.env.HTTPS_PROXY ?? process.env.https_proxy

export default defineConfig({
    testDir: './tests',
    testMatch: '**/*.e2e.ts',
    outputDir: './.artifacts',
    globalSetup: './globalSetup.ts',
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 180_000,
    expect: { timeout: 20_000 },
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: './report' }],
        ['./reporters/outcomesReporter.ts'],
    ],
    use: {
        baseURL: E2E_BASE_URL,
        headless: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        /* Needs Playwright's ffmpeg (`bunx playwright install ffmpeg`); traces cover the rest. */
        video: process.env.E2E_VIDEO ? 'retain-on-failure' : 'off',
        ...(proxyServer ? { proxy: { server: proxyServer, bypass: 'localhost,127.0.0.1' } } : {}),
        launchOptions: process.env.PW_CHROMIUM_PATH
            ? { executablePath: process.env.PW_CHROMIUM_PATH }
            : {},
    },
    webServer: {
        command: 'node build/index.js',
        cwd: '..',
        url: `${E2E_BASE_URL}/api/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            HOST: '127.0.0.1',
            PORT: String(E2E_PORT),
            ORIGIN: E2E_BASE_URL,
            BETTER_AUTH_URL: E2E_BASE_URL,
            BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
            DATABASE_URL: e2eDatabaseUrl(process.env.DATABASE_URL ?? ''),
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
            STRIPE_WEBHOOK_SECRET: process.env.E2E_STRIPE_WEBHOOK_SECRET ?? '',
            EMAIL_OUTBOX_DIR: E2E_OUTBOX_DIR,
            OWNER_EMAIL: E2E_ADMIN_EMAIL,
            REGISTRATION_PREVIEW_KEY: E2E_PREVIEW_KEY,
            BODY_SIZE_LIMIT: '20M',
            /* Off unless asked for: reunion:db prints every query, tokens included. */
            DEBUG: process.env.E2E_DEBUG ? 'reunion:*' : '',
            ...(proxyServer
                ? {
                      HTTPS_PROXY: proxyServer,
                      NO_PROXY: 'localhost,127.0.0.1',
                      NODE_USE_ENV_PROXY: '1',
                  }
                : {}),
        },
    },
})
