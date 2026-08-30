/* Fails `bun test` immediately, with the reason.

   `bun test` and `bun run test` are different programs, and the difference is silent: the first is
   Bun's own runner, which ignores package.json scripts AND vitest.config.ts. Every alias the suite
   depends on then disappears — $lib/server/db stops resolving to the PGLite adapter and points at the
   real Postgres client, $env/dynamic/private and $app/environment do not resolve at all because
   SvelteKit generates them at build time, and globalSetup never runs so there is no migrated template
   to restore. Bun's `vi` shim is also partial, so tests fail on missing helpers like setSystemTime.

   The result is dozens of failures that look like broken code and are not, and a test count several
   hundred short of the real one — which is the part that could actually mislead someone into thinking
   a run was green.

   Registered as bunfig.toml's [test] preload, which Bun's runner loads and vitest never sees. */
const message = [
    '',
    '  bun test is not this project’s test runner. Use:',
    '',
    '      bun run test',
    '',
    '  (note the `run`). It invokes vitest, which reads vitest.config.ts —',
    '  the module aliases and the PGLite globalSetup the suite depends on.',
    '',
].join('\n')

process.stderr.write(message)
process.exit(1)
