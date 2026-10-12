import { eq } from 'drizzle-orm'
import type { ReunionDb } from '$lib/server/db/ReunionDb'
import { session, twoFactor, user } from '$lib/server/db/schema'

export type ResetTwoFactorResult =
    { ok: true; userId: string; sessionsRevoked: number } | { ok: false; reason: 'no-account' }

/* Removes an account's 2FA enrolment, for an admin who lost both the phone and the backup codes.

   The account is NOT left on password alone: with twoFactorEnabled false, hooks.server.ts treats its
   sessions as signed out, so the next sign-in goes straight to enrolment. Deleting the `two_factor`
   row discards the old secret and backup codes, so the lost phone's codes stop working.

   Sessions are revoked for the same reason resetPassword revokes them: a reset prompted by a lost or
   stolen phone should not leave a session signed in on it. The revocation is complete within the
   5-minute session cookie cache: until that expires, a device holding the cookie still passes,
   because Better Auth trusts the signed cache without reading the database.

   The database is a parameter for the reason resetPassword's is: admin:reset-2fa is a standalone
   script with no $env/dynamic/private. */
export async function resetTwoFactor(db: ReunionDb, email: string): Promise<ResetTwoFactorResult> {
    const [found] = await db
        .select({ userId: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1)

    if (!found) {
        return { ok: false, reason: 'no-account' }
    }

    await db.delete(twoFactor).where(eq(twoFactor.userId, found.userId))
    await db
        .update(user)
        .set({ twoFactorEnabled: false, updatedAt: new Date() })
        .where(eq(user.id, found.userId))
    const revoked = await db
        .delete(session)
        .where(eq(session.userId, found.userId))
        .returning({ id: session.id })

    return { ok: true, userId: found.userId, sessionsRevoked: revoked.length }
}
