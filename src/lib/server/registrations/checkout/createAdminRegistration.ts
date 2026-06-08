import { db } from '$lib/server/db'
import { partyMembers, registrations, registrationStatusEnum } from '$lib/server/db/schema'
import { parseBirthDate } from '$lib/utils/age'
import { generateManagementToken } from '../hashManagementToken'
import { fetchAndValidateTiers } from './_fetchAndValidateTiers'

/* Inserts a registration directly at the given status (bypasses Stripe). Generates a managementToken so the contact can self-manage later; the DB stores only the SHA-256 hash, the plaintext is returned to the caller. */
export async function createAdminRegistration(params: {
    eventId: string
    contactName: string
    contactEmail: string
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: Array<{ name: string; birthDate?: string; tierId: string; shirtSize?: string }>
}): Promise<{ registrationId: string; managementToken: string }> {
    const tierMap = await fetchAndValidateTiers(
        params.eventId,
        params.members.map((m) => m.tierId),
    )

    const { plaintext: managementToken, hash: tokenHash } = generateManagementToken()

    const [registration] = await db
        .insert(registrations)
        .values({
            managementToken: tokenHash,
            eventId: params.eventId,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            status: params.status,
        })
        .returning()

    await db.insert(partyMembers).values(
        params.members.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            const tier = tierMap.get(m.tierId)!
            return {
                registrationId: registration.id,
                name: m.name.trim(),
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                tierLabel: tier.label,
                priceCents: tier.priceCents,
            }
        }),
    )

    return { registrationId: registration.id, managementToken }
}
