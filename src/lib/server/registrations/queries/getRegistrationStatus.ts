import { db } from '$lib/server/db'
import { registrations, registrationStatusEnum } from '$lib/server/db/schema'
import { hashManagementToken } from '../hashManagementToken'
import { isManagementTokenValid } from '../isManagementTokenValid'
import { managementTokenCandidate } from '../managementTokenCandidate'

/* Returns the registration id and status for the given plaintext management token; null when not
   found. Used by the post-checkout polling client.

   Accepts a previous token inside its grace period, like every other token path — a registrant
   polling this page while an organiser edits their registration must not be dropped mid-poll. */
export async function getRegistrationStatus(managementToken: string): Promise<{
    id: string
    status: (typeof registrationStatusEnum.enumValues)[number]
} | null> {
    const tokenHash = hashManagementToken(managementToken)
    const [registration] = await db
        .select({
            id: registrations.id,
            status: registrations.status,
            managementToken: registrations.managementToken,
            previousManagementToken: registrations.previousManagementToken,
            previousTokenExpiresAt: registrations.previousTokenExpiresAt,
        })
        .from(registrations)
        .where(managementTokenCandidate(tokenHash))
        .limit(1)

    if (!registration || !isManagementTokenValid(registration, tokenHash)) {
        return null
    }

    return { id: registration.id, status: registration.status }
}
