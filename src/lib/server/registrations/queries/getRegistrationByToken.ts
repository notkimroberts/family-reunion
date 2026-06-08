import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { registrations } from '$lib/server/db/schema'
import { hashManagementToken } from '../hashManagementToken'

/* Fetches a registration by its plaintext management token (the URL token). Hashes the input and queries by hash. Returns undefined if not found. */
export async function getRegistrationByToken(
    managementToken: string,
): Promise<typeof registrations.$inferSelect | undefined> {
    const tokenHash = hashManagementToken(managementToken)
    const [registration] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.managementToken, tokenHash))
        .limit(1)
    return registration
}
