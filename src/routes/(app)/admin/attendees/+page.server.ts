import { fail } from '@sveltejs/kit'
import { eq, asc, inArray } from 'drizzle-orm'
import { requireAdmin } from '$lib/server/auth/guards'
import { db } from '$lib/server/db'
import { familyMembers, partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import { linkPartyMember } from '$lib/server/registrations'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
    requireAdmin(event)

    /* Run independent queries in parallel: paid attendees joined with their registration + event,
       and the full family-tree member list (for both the picker and the linked-name lookup). */
    const [attendees, allMembers] = await Promise.all([
        db
            .select({
                id: partyMembers.id,
                name: partyMembers.name,
                birthYear: partyMembers.birthYear,
                birthMonth: partyMembers.birthMonth,
                birthDay: partyMembers.birthDay,
                tierLabel: partyMembers.tierLabel,
                familyMemberId: partyMembers.familyMemberId,
                registrationId: registrations.id,
                contactName: registrations.contactName,
                contactEmail: registrations.contactEmail,
                eventId: registrations.eventId,
                eventYear: reunionEvents.year,
                eventTitle: reunionEvents.title,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            .innerJoin(reunionEvents, eq(registrations.eventId, reunionEvents.id))
            .where(inArray(registrations.status, ['paid', 'waived']))
            .orderBy(
                asc(reunionEvents.year),
                asc(registrations.contactName),
                asc(partyMembers.name),
            ),
        db
            .select({
                id: familyMembers.id,
                name: familyMembers.name,
                birthYear: familyMembers.birthYear,
            })
            .from(familyMembers)
            .orderBy(asc(familyMembers.name)),
    ])

    /* allMembers is already loaded; resolve linked names from it instead of a second round-trip. */
    const memberById = new Map(allMembers.map((m) => [m.id, m]))

    return {
        attendees: attendees.map((a) => ({
            ...a,
            linkedName: a.familyMemberId ? (memberById.get(a.familyMemberId)?.name ?? null) : null,
        })),
        members: allMembers,
    }
}

export const actions: Actions = {
    link: async (event) => {
        requireAdmin(event)
        const data = await event.request.formData()
        const partyMemberId = (data.get('partyMemberId') as string)?.trim()
        const familyMemberIdRaw = (data.get('familyMemberId') as string)?.trim()
        const familyMemberId = familyMemberIdRaw || null

        if (!partyMemberId) {
            return fail(400, { error: 'Missing party member' })
        }

        await linkPartyMember(partyMemberId, familyMemberId)
        return { success: true }
    },
}
