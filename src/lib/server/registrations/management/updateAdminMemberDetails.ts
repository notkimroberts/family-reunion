import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { partyMembers, registrations } from '$lib/server/db/schema'
import { dbg } from '$lib/server/debug'
import { resolveTierPricing } from '$lib/server/tiers'
import { parseBirthDate } from '$lib/utils/age'
import { assertRegistrationMutable, touchRegistration } from '../lifecycle'

/* Corrects one party member's details on behalf of the registrant.

   Id-based and admin-guarded rather than token-gated: the DB holds only sha256(token), so
   updateMemberDetails' credential is unavailable to admin code.

   Only writes fields the caller explicitly passed, mirroring updateMemberDetails — passing undefined
   means "leave it alone". Without that, a form rendered with shirts disabled would silently null a
   previously-saved size.

   A TIER CHANGE IS REFUSED ON A PAID REGISTRATION. The tier sets priceCents, so changing it after
   money has arrived would leave the recorded total disagreeing with what was actually charged, with
   nothing to reconcile it and no refund issued. Repricing has to go through the registrant's own
   management link, which is the path that actually moves money. Non-financial corrections stay
   available at every status, since a wrong birthday or shirt size has to be fixable. */
export async function updateAdminMemberDetails(params: {
    memberId: string
    name?: string | undefined
    tierId?: string | undefined
    birthDate?: string | undefined
    shirtSize?: string | undefined
    vegetarianMeal?: boolean | undefined
    attendedReunion2025?: boolean | undefined
}): Promise<{ changed: boolean; name: string }> {
    const [member] = await db
        .select({
            id: partyMembers.id,
            name: partyMembers.name,
            tierLabel: partyMembers.tierLabel,
            priceCents: partyMembers.priceCents,
            registrationId: partyMembers.registrationId,
            registrationStatus: registrations.status,
            eventId: registrations.eventId,
        })
        .from(partyMembers)
        .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
        .where(eq(partyMembers.id, params.memberId))
        .limit(1)

    if (!member) {
        throw error(404, 'Party member not found')
    }

    assertRegistrationMutable(
        member.registrationStatus,
        'This registration was cancelled and refunded.',
    )

    const updates: Partial<typeof partyMembers.$inferInsert> = {}

    if (params.name !== undefined) {
        updates.name = params.name.trim()
    }

    if (params.tierId !== undefined) {
        const pricing = (await resolveTierPricing(member.eventId, [params.tierId]))[params.tierId]

        /* Only refuse when the tier actually moves the price. Re-submitting the same tier, which the
           edit form does on every save, must not be mistaken for a repricing attempt. */
        const repricing = pricing.priceCents !== member.priceCents
        if (repricing && member.registrationStatus === 'paid') {
            throw error(
                409,
                'This registration is paid. Changing a tier would change what they owe — use the registrant’s management link so the refund is issued.',
            )
        }

        updates.tierLabel = pricing.label
        updates.priceCents = pricing.priceCents
    }

    if (params.birthDate !== undefined) {
        const parsed = params.birthDate ? parseBirthDate(params.birthDate) : null
        updates.birthYear = parsed?.birthYear ?? null
        updates.birthMonth = parsed?.birthMonth ?? null
        updates.birthDay = parsed?.birthDay ?? null
    }

    if (params.shirtSize !== undefined) {
        updates.shirtSize = params.shirtSize || null
    }

    if (params.vegetarianMeal !== undefined) {
        updates.vegetarianMeal = params.vegetarianMeal
    }

    if (params.attendedReunion2025 !== undefined) {
        updates.attendedReunion2025 = params.attendedReunion2025
    }

    if (Object.keys(updates).length === 0) {
        return { changed: false, name: member.name }
    }

    await db.update(partyMembers).set(updates).where(eq(partyMembers.id, params.memberId))
    await touchRegistration(member.registrationId)

    dbg.register('admin updated member %s (%s)', params.memberId, Object.keys(updates).join(', '))

    return { changed: true, name: updates.name ?? member.name }
}
