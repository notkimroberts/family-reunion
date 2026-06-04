import { db } from '$lib/server/db'
import { partyMembers, registrations, registrationStatusEnum } from '$lib/server/db/schema'
import { parseBirthDate } from '$lib/utils/age'
import { fetchAndValidateTiers } from './_fetchAndValidateTiers'

// Inserts a registration directly at the given status (bypasses Stripe); total is derived from tier prices, not passed in
export async function createAdminRegistration(params: {
    eventId: string
    contactName: string
    contactEmail: string | null
    status: (typeof registrationStatusEnum.enumValues)[number]
    members: Array<{ name: string; birthDate?: string; tierId: string; shirtSize?: string }>
}): Promise<{ registrationId: string }> {
    const tierMap = await fetchAndValidateTiers(
        params.eventId,
        params.members.map((m) => m.tierId),
    )

    const totalAmountCents = params.members.reduce(
        (sum, m) => sum + (tierMap.get(m.tierId)?.priceCents ?? 0),
        0,
    )

    const [registration] = await db
        .insert(registrations)
        .values({
            eventId: params.eventId,
            contactName: params.contactName,
            contactEmail: params.contactEmail,
            totalAmountCents,
            status: params.status,
        })
        .returning()

    await db.insert(partyMembers).values(
        params.members.map((m) => {
            const parsed = m.birthDate ? parseBirthDate(m.birthDate) : null
            return {
                registrationId: registration.id,
                name: m.name.trim(),
                birthYear: parsed?.birthYear ?? null,
                birthMonth: parsed?.birthMonth ?? null,
                birthDay: parsed?.birthDay ?? null,
                shirtSize: m.shirtSize || null,
                pricingTierId: m.tierId,
            }
        }),
    )

    return { registrationId: registration.id }
}
