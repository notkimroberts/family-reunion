import { db } from '$lib/server/db'
import { registrationStatusEnum, registrations } from '$lib/server/db/schema'
import { hashViewToken } from '../hashViewToken'
import { isViewTokenValid } from '../isViewTokenValid'
import { viewTokenCandidate } from '../viewTokenCandidate'

/* Returns the registration id and status for the given plaintext view token; null when not
   found. Used by the post-checkout polling client.

   Accepts a previous token inside its grace period, like every other token path — a registrant
   polling this page while an organiser edits their registration must not be dropped mid-poll. */
export async function getRegistrationStatus(viewToken: string): Promise<{
    id: string
    status: (typeof registrationStatusEnum.enumValues)[number]
} | null> {
    const tokenHash = hashViewToken(viewToken)
    const [registration] = await db
        .select({
            id: registrations.id,
            status: registrations.status,
            viewToken: registrations.viewToken,
            previousViewToken: registrations.previousViewToken,
            previousTokenExpiresAt: registrations.previousTokenExpiresAt,
        })
        .from(registrations)
        .where(viewTokenCandidate(tokenHash))
        .limit(1)

    if (!registration || !isViewTokenValid(registration, tokenHash)) {
        return null
    }

    return { id: registration.id, status: registration.status }
}
