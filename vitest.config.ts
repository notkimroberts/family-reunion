import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
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
