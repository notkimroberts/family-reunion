import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { and, eq } from 'drizzle-orm'
import type { ReunionDb } from '$lib/server/db/ReunionDb'
import { account, session, user } from '$lib/server/db/schema'

/* Better Auth's own minimum. Enforced here too, or a reset "succeeds" and sign-in then refuses the
   password with no explanation. */
export const MIN_PASSWORD_LENGTH = 8

export type ResetPasswordResult =
    | { ok: true; userId: string; role: string | null; sessionsRevoked: number }
    | { ok: false; reason: 'no-account' | 'too-short' | 'hash-unverifiable' }

/* Sets a new password for an existing credential account, and signs out every session it had.

   There is no password-reset email and no account-management screen, so this is the only route back
   into a locked-out admin account. admin:create cannot do it — that calls signUpEmail, which fails
   outright when the account exists.

   Hashes with Better Auth's OWN hashPassword. The stored format — salt, parameters, envelope — is
   Better Auth's to define, and a hash written any other way is silently unverifiable at sign-in,
   which presents as a wrong password rather than as a broken hash. The result is verified before it
   is written for exactly that reason.

   Sessions are revoked deliberately. Better Auth leaves them alive across a password change, which
   is wrong for a RESET: if the reason for resetting is that somebody else knows the old password,
   leaving their session signed in defeats the point.

   The password lives on the `account` row with providerId 'credential'; the `user` row holds none.

   The database is a parameter rather than the `db` singleton because the caller that matters is
   admin:reset-password, a standalone script with no $env/dynamic/private to build one from. That is
   the whole reason this logic was duplicated into the script before, where it could drift from the
   tested copy. */
export async function resetPassword(
    db: ReunionDb,
    email: string,
    password: string,
): Promise<ResetPasswordResult> {
    if (password.length < MIN_PASSWORD_LENGTH) {
        return { ok: false, reason: 'too-short' }
    }

    const [found] = await db
        .select({ accountId: account.id, userId: user.id, role: user.role })
        .from(user)
        .innerJoin(account, eq(account.userId, user.id))
        .where(and(eq(user.email, email), eq(account.providerId, 'credential')))
        .limit(1)

    if (!found) {
        return { ok: false, reason: 'no-account' }
    }

    const hash = await hashPassword(password)
    if (!(await verifyPassword({ hash, password }))) {
        return { ok: false, reason: 'hash-unverifiable' }
    }

    await db
        .update(account)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(account.id, found.accountId))

    const revoked = await db
        .delete(session)
        .where(eq(session.userId, found.userId))
        .returning({ id: session.id })

    return {
        ok: true,
        userId: found.userId,
        role: found.role,
        sessionsRevoked: revoked.length,
    }
}
