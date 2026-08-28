/* How long a rotated-away token keeps working. Long enough that a link emailed before an
   organiser's edit is still usable when the registrant gets round to opening it. */
export const MANAGEMENT_TOKEN_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export type ManagementTokenColumns = {
    managementToken: string
    previousManagementToken: string | null
    previousTokenExpiresAt: Date | null
}

/* The single authority on whether a plaintext management token grants access to a registration.

   Rotation is unavoidable whenever a link must be re-sent: the database stores only sha256(token),
   so the original plaintext cannot be recovered by anyone, including an admin. Rotating alone would
   invalidate every link already in the registrant's inbox and log out an open manage session, since
   the plaintext lives in their reg_token cookie. So the outgoing hash stays valid for a grace
   period.

   Callers fetch a candidate row on either hash and then ask this. Splitting it that way keeps the
   expiry rule — the part that matters — in exactly one place, and fails closed if the fetch is ever
   broader than it should be.

   Only ONE generation is honoured. Two rotations in quick succession drop the oldest token
   immediately, which is correct: the registrant has been sent a newer link twice by then. */
export function isManagementTokenValid(
    row: ManagementTokenColumns,
    tokenHash: string,
    now: Date = new Date(),
): boolean {
    if (row.managementToken === tokenHash) {
        return true
    }

    if (row.previousManagementToken !== tokenHash) {
        return false
    }

    /* A null expiry means no rotation has been recorded, so the previous column cannot be trusted
       to have ever been current. Absent an expiry, refuse. */
    return (
        row.previousTokenExpiresAt !== null && row.previousTokenExpiresAt.getTime() > now.getTime()
    )
}
