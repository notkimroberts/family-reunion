import { eq } from 'drizzle-orm'
import { ORGANIZER_ROLE, OWNER_ROLE } from '$lib/general/constants'
import type { ReunionDb } from '$lib/server/db/ReunionDb'
import { session, user } from '$lib/server/db/schema'

/* What admin:set-role accepts, by the name an operator uses → the stored role. */
export const ROLE_BY_NAME = { owner: OWNER_ROLE, organizer: ORGANIZER_ROLE } as const

export type RoleName = keyof typeof ROLE_BY_NAME

export type SetUserRoleResult =
    { ok: true; userId: string; sessionsRevoked: number } | { ok: false; reason: 'no-account' }

/* Sets an account's role — the ONLY writer of the owner role. Nothing an organizer can reach in the
   app writes one (adminApi.test.ts), so the boundary holds only while this stays a shell script.

   Every session is revoked, so a demotion takes effect at the next request rather than when the
   session expires. Within the 5-minute cookie cache a device still holds the old role: Better Auth
   trusts the signed cache without reading the database.

   The database is a parameter for the reason resetPassword's is: admin:set-role is a standalone
   script with no $env/dynamic/private. */
export async function setUserRole(
    db: ReunionDb,
    email: string,
    roleName: RoleName,
): Promise<SetUserRoleResult> {
    const [updated] = await db
        .update(user)
        .set({ role: ROLE_BY_NAME[roleName], updatedAt: new Date() })
        .where(eq(user.email, email))
        .returning({ userId: user.id })

    if (!updated) {
        return { ok: false, reason: 'no-account' }
    }

    const revoked = await db
        .delete(session)
        .where(eq(session.userId, updated.userId))
        .returning({ id: session.id })

    return { ok: true, userId: updated.userId, sessionsRevoked: revoked.length }
}
