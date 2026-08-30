/* Stands in for $app/environment under vitest, which SvelteKit generates at build time.

   `dev: false` on purpose. It is the stricter branch: send() throws on a missing RESEND_API_KEY in
   production and only skips silently in dev, and hooks.server.ts substitutes a hardcoded admin when
   dev is true. A test suite that ran as dev would exercise neither guard. */
export const dev = false
export const browser = false
export const building = false
export const version = 'test'
