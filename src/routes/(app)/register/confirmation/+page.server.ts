import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { registrations, reunionEvents, partyMembers, pricingTiers } from '$lib/server/db/schema'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAuth(event)

    const registrationId = event.url.searchParams.get('registration_id')
    if (!registrationId) throw error(404)

    const [registration] = await db
        .select()
        .from(registrations)
        .where(eq(registrations.id, registrationId))

    if (!registration) throw error(404)

    const [reunionEvent] = await db
        .select()
        .from(reunionEvents)
        .where(eq(reunionEvents.id, registration.eventId))

    const members = await db
        .select({
            name: partyMembers.name,
            birthDate: partyMembers.birthDate,
            shirtSize: partyMembers.shirtSize,
            tierLabel: pricingTiers.label,
            priceCents: pricingTiers.priceCents,
        })
        .from(partyMembers)
        .innerJoin(pricingTiers, eq(partyMembers.pricingTierId, pricingTiers.id))
        .where(eq(partyMembers.registrationId, registrationId))

    return {
        registration,
        event: reunionEvent,
        members,
    }
}
