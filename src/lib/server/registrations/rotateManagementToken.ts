import { eq, sql } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { MANAGEMENT_TOKEN_GRACE_PERIOD_MS } from './isManagementTokenValid'

/* Persists a rotated management token, demoting the outgoing hash so it keeps working for the grace
   period. See isManagementTokenValid for why the grace period exists.

   CALL THIS ONLY AFTER A CONFIRMED SEND. Every caller emails the new link first and rotates second.
   Rotating before a successful send leaves the registrant holding a link that no longer hashes to
   anything stored and a replacement they never received — locked out permanently, with nothing in
   the database to recover from. That bug has shipped here once already.

   The demotion happens inside the UPDATE rather than via a read-then-write: Postgres evaluates the
   right-hand side of SET against the old row, so previous_management_token receives the value
   management_token had before this statement. One statement, so two concurrent rotations cannot
   interleave into a state where neither old hash is retained. */
export async function rotateManagementToken(params: {
    registrationId: string
    newHash: string
    now?: Date
}): Promise<void> {
    const now = params.now ?? new Date()

    await db
        .update(registrations)
        .set({
            managementToken: params.newHash,
            previousManagementToken: sql`${registrations.managementToken}`,
            previousTokenExpiresAt: new Date(now.getTime() + MANAGEMENT_TOKEN_GRACE_PERIOD_MS),
            updatedAt: now,
        })
        .where(eq(registrations.id, params.registrationId))

    dbg.register(
        'rotated management token for registration %s; previous valid for %dms',
        params.registrationId,
        MANAGEMENT_TOKEN_GRACE_PERIOD_MS,
    )
}
