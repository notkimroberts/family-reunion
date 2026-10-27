/* One place for the end-to-end run's fixed settings, read by the runner, the Playwright config and
   the tests alike. The server is a production build on its own port, against its own database, so a
   run can never touch the development data in DATABASE_URL. */
export const E2E_PORT = 4173
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`
export const E2E_DATABASE_NAME = 'family_reunion_e2e'
export const E2E_OUTBOX_DIR = 'e2e/.outbox'
export const E2E_STATE_DIR = 'e2e/.state'
export const E2E_RESULTS_DIR = 'e2e/results'

/* The organizer the admin scenarios sign in as. Also OWNER_EMAIL, so settings are reachable. */
export const E2E_ADMIN_EMAIL = 'e2e-owner@example.com'
export const E2E_ADMIN_PASSWORD = 'e2e-password-123456'
export const E2E_ADMIN_NAME = 'E2E Owner'

/* At least 32 characters, hex, like the real one must be. */
export const E2E_PREVIEW_KEY = 'e2e0preview0key0000000000000000000000000000000000000000000000001'

/* The development DATABASE_URL with its database swapped for the e2e one. */
export function e2eDatabaseUrl(developmentUrl: string): string {
    const url = new URL(developmentUrl)
    url.pathname = `/${E2E_DATABASE_NAME}`
    return url.toString()
}
