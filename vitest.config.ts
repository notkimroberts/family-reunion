import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        /* Migrates an empty PGLite once and dumps it; every test restores that dump in ~145ms
           instead of re-running 16 migrations. See db/testing/globalSetup.ts. */
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
            { find: /^\$lib/, replacement: resolve('./src/lib') },
        ],
    },
})
