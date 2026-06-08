import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations, registrationStatusEnum } from '$lib/server/db/schema'
import { hashManagementToken } from '../hashManagementToken'

/* Returns the registration id and status for the given plaintext management token; null when not found. Used by the post-checkout polling client. */
export async function getRegistrationStatus(managementToken: string): Promise<{
    id: string
    status: (typeof registrationStatusEnum.enumValues)[number]
} | null> {
    const tokenHash = hashManagementToken(managementToken)
    const [registration] = await db
        .select({ id: registrations.id, status: registrations.status })
        .from(registrations)
        .where(eq(registrations.managementToken, tokenHash))
        .limit(1)
    return registration ?? null
}
