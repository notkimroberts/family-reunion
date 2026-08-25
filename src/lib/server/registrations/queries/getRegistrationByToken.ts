import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { hashManagementToken } from '../hashManagementToken'
import { isManagementTokenValid } from '../isManagementTokenValid'
import { managementTokenCandidate } from '../managementTokenCandidate'

/* Fetches a registration by its plaintext management token (the URL or cookie token). Accepts the
   current token, or the previous one while still inside its grace period — see
   isManagementTokenValid. Returns undefined when nothing matches or the previous token has expired. */
export async function getRegistrationByToken(
    managementToken: string,
): Promise<typeof registrations.$inferSelect | undefined> {
    const tokenHash = hashManagementToken(managementToken)
    const [registration] = await db
        .select()
        .from(registrations)
        .where(managementTokenCandidate(tokenHash))
        .limit(1)

    if (!registration || !isManagementTokenValid(registration, tokenHash)) {
        return undefined
    }

    return registration
}
