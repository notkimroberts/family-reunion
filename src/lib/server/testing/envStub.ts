/* Stands in for $env/dynamic/private under vitest.

   SvelteKit generates that module at build time, so it does not resolve in a plain node test run.
   Eight test files each mocked it by hand; aliasing it once in vitest.config.ts means a test can
   import a real server module without first knowing which of its transitive dependencies happen to
   read an environment variable. A file that cares about a specific value still overrides this with
   its own vi.mock.

   Deliberately not real secrets and deliberately not empty: RESEND_API_KEY absent makes send() throw
   in production mode, and a test that reaches it should fail on its own assertion rather than on a
   missing variable. Nothing here is a live key — every external service is mocked. */
export const env: Record<string, string> = {
    DATABASE_URL: 'postgres://test/test',
    STRIPE_SECRET_KEY: 'sk_test_stub',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_stub',
    RESEND_API_KEY: 're_test_stub',
    RESEND_WEBHOOK_SECRET: 'whsec_resend_test_stub',
    BETTER_AUTH_URL: 'http://localhost:5173',
    OWNER_EMAIL: 'owner@example.com',
}
