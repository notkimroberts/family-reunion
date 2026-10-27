import { resolve } from 'path'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        /* Agent tooling, not app code. The security-audit skill ships node:test files that vitest
           collects (they match *.test.cjs) and fails as "No test suite found". */
        /* e2e/ is Playwright's (bun run e2e): it needs a built server and Stripe, not vitest. */
        exclude: [...configDefaults.exclude, '.claude/**', '.agents/**', 'e2e/**'],
        /* Migrates an empty PGLite once and dumps it; the first resetTestDb in each test file
           restores that dump, and every later one truncates instead. See db/testing/resetTestDb.ts
           for why truncating rather than restoring per test, and what it does not undo. */
        globalSetup: ['./src/lib/server/db/testing/globalSetup.ts'],
    },
    resolve: {
        /* Array form, and the exact-match regex, both matter. Vite aliases replace by PREFIX, so a
           plain `'$lib/server/db'` key would also rewrite `$lib/server/db/schema` and every test
           would import a schema module that does not exist. */
        alias: [
            {
                find: /^\$lib\/server\/db$/,
                replacement: resolve('./src/lib/server/db/testing/pgliteDb.ts'),
            },
            /* SvelteKit generates this module at build time, so it does not exist in a node test
               run. Without it, importing any real server module fails the moment one of its
               transitive dependencies reads an environment variable. */
            {
                find: /^\$env\/dynamic\/private$/,
                replacement: resolve('./src/lib/server/testing/envStub.ts'),
            },
            {
                find: /^\$app\/environment$/,
                replacement: resolve('./src/lib/server/testing/appEnvironmentStub.ts'),
            },
            { find: /^\$lib/, replacement: resolve('./src/lib') },
        ],
    },
})
