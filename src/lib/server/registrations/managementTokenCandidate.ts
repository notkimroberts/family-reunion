import { eq, or } from 'drizzle-orm'
import { registrations } from '$lib/server/db/schema'

/* WHERE condition matching a registration by either its current or its previous token hash.

   Deliberately does NOT check the expiry: this only narrows the fetch, and isManagementTokenValid is
   what decides. Keeping the expiry rule out of SQL means there is one implementation of it rather
   than two that can drift, and a too-broad fetch here is harmless because the predicate still
   refuses. */
export function managementTokenCandidate(tokenHash: string) {
    return or(
        eq(registrations.managementToken, tokenHash),
        eq(registrations.previousManagementToken, tokenHash),
    )
}
