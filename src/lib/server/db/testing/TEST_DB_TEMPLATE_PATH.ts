import { resolve } from 'node:path'

/* Where globalSetup leaves the migrated-but-empty database, for every test file to restore from.

   A file rather than an env var or vitest `provide`: globalSetup runs in its own context, and a path
   both sides can compute needs no plumbing between them. Under node_modules/.tmp so it is already
   gitignored and dies with a `rm -rf node_modules`. */
export const TEST_DB_TEMPLATE_PATH = resolve('./node_modules/.tmp/pglite-template.tgz')
