import { fail } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { reunionEvents, pricingTiers, registrations, partyMembers } from '$lib/server/db/schema'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    const openEvents = await db.select().from(reunionEvents).where(eq(reunionEvents.status, 'open'))

    const tiers =
        openEvents.length > 0
            ? await db
                  .select()
                  .from(pricingTiers)
                  .where(eq(pricingTiers.eventId, openEvents[0].id))
                  .orderBy(pricingTiers.minAge)
            : []

    return {
        events: openEvents,
        tiers,
    }
}

export const actions: Actions = {
    default: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()

        const eventId = (data.get('eventId') as string)?.trim()
        const contactName = (data.get('contactName') as string)?.trim()
        const contactEmail = (data.get('contactEmail') as string)?.trim().toLowerCase() || null
        const status = (data.get('status') as string)?.trim()
        const membersJson = data.get('members') as string

        if (!eventId) {
            return fail(400, { error: 'Event is required' })
        }
        if (!contactName) {
            return fail(400, { error: 'Contact name is required' })
        }
        if (!['paid', 'pending', 'waived'].includes(status)) {
            return fail(400, { error: 'Invalid payment status' })
        }

        type MemberEntry = { name: string; birthDate: string; tierId: string }
        let members: MemberEntry[]
        try {
            members = JSON.parse(membersJson)
        } catch {
            return fail(400, { error: 'Invalid member data' })
        }

        if (members.length === 0) {
            return fail(400, { error: 'At least one party member is required' })
        }
        if (members.some((m) => !m.name?.trim() || !m.tierId)) {
            return fail(400, { error: 'Each party member requires a name and pricing tier' })
        }

        const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.eventId, eventId))
        const tierMap = new Map(tiers.map((t) => [t.id, t]))

        for (const m of members) {
            if (!tierMap.has(m.tierId)) {
                return fail(400, { error: 'Invalid pricing tier' })
            }
        }

        const totalAmountCents = members.reduce((sum, m) => {
            return sum + (tierMap.get(m.tierId)?.priceCents ?? 0)
        }, 0)

        const [registration] = await db
            .insert(registrations)
            .values({
                eventId,
                contactName,
                contactEmail,
                totalAmountCents,
                status: status as 'paid' | 'pending' | 'waived',
            })
            .returning()

        await db.insert(partyMembers).values(
            members.map((m) => ({
                registrationId: registration.id,
                name: m.name.trim(),
                birthDate: m.birthDate || null,
                pricingTierId: m.tierId,
            })),
        )

        return { success: true, registrationId: registration.id }
    },
}
