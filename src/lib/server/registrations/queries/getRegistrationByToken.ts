import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { hashViewToken } from '../hashViewToken'
import { isViewTokenValid } from '../isViewTokenValid'
import { viewTokenCandidate } from '../viewTokenCandidate'

/* Fetches a registration by its plaintext view token (the URL or cookie token). Accepts the
   current token, or the previous one while still inside its grace period — see
   isViewTokenValid. Returns undefined when nothing matches or the previous token has expired. */
export async function getRegistrationByToken(
    viewToken: string,
): Promise<typeof registrations.$inferSelect | undefined> {
    const tokenHash = hashViewToken(viewToken)
    const [registration] = await db
        .select()
        .from(registrations)
        .where(viewTokenCandidate(tokenHash))
        .limit(1)

    if (!registration || !isViewTokenValid(registration, tokenHash)) {
        return undefined
    }

    return registration
}
