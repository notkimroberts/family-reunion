import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { familyMembers, partyMembers, registrations } from '$lib/server/db/schema'

export type EventAttendees = {
    attendees: {
        id: string
        name: string
        birthYear: number | null
        birthMonth: number | null
        birthDay: number | null
        tierLabel: string
        /* All nullable in the schema — party_members addresses have no NOT NULL — so the page must
           handle a missing address rather than assume one. */
        addressLine1: string | null
        addressLine2: string | null
        addressCity: string | null
        addressState: string | null
        addressZip: string | null
        vegetarianMeal: boolean | null
        attendedReunion2025: boolean | null
        familyMemberId: string | null
        linkedName: string | null
        registrationId: string
        contactName: string
        contactEmail: string
    }[]
    members: { id: string; name: string; birthYear: number | null }[]
}

/* Everyone actually attending one reunion, plus the family-tree members they can be linked to.

   'paid' and 'waived' only: a pending registration is not an attendee yet, and a refunded one is not
   one any more.

   Scoped to a single event, which the previous inline version was not — it selected every attendee of
   every reunion and left filtering to the browser, so a bare visit showed all history in one flat
   table. The cross-year reading that appeared to justify that was never built: year was the first sort
   key, so the same cousin's 2025 and 2026 rows sat as far apart as possible, and nothing flagged that
   one of them was already linked. The real cross-year view lives on the family-tree node itself.

   `members` stays UNSCOPED on purpose. The picker has to reach ancestors who never attend anything —
   narrowing it to attendees would make most of the tree unlinkable. */
export async function getAttendeesForEvent(eventId: string): Promise<EventAttendees> {
    const [attendees, members] = await Promise.all([
        db
            .select({
                id: partyMembers.id,
                name: partyMembers.name,
                birthYear: partyMembers.birthYear,
                birthMonth: partyMembers.birthMonth,
                birthDay: partyMembers.birthDay,
                tierLabel: partyMembers.tierLabel,
                addressLine1: partyMembers.addressLine1,
                addressLine2: partyMembers.addressLine2,
                addressCity: partyMembers.addressCity,
                addressState: partyMembers.addressState,
                addressZip: partyMembers.addressZip,
                vegetarianMeal: partyMembers.vegetarianMeal,
                attendedReunion2025: partyMembers.attendedReunion2025,
                familyMemberId: partyMembers.familyMemberId,
                registrationId: registrations.id,
                contactName: registrations.contactName,
                contactEmail: registrations.contactEmail,
            })
            .from(partyMembers)
            .innerJoin(registrations, eq(partyMembers.registrationId, registrations.id))
            /* and(), not JS &&. `eq(...) && inArray(...)` type-checks and silently discards the first
               condition, which here would mean quietly serving every year again. */
            .where(
                and(
                    eq(registrations.eventId, eventId),
                    inArray(registrations.status, ['paid', 'waived']),
                ),
            )
            .orderBy(asc(registrations.contactName), asc(partyMembers.name)),
        db
            .select({
                id: familyMembers.id,
                name: familyMembers.name,
                birthYear: familyMembers.birthYear,
            })
            .from(familyMembers)
            .orderBy(asc(familyMembers.name)),
    ])

    /* Resolved from the same list the picker renders, so the linked-name column and the picker cannot
       disagree, and no second round trip is needed. */
    const nameById = new Map(members.map((member) => [member.id, member.name]))

    return {
        attendees: attendees.map((attendee) => ({
            ...attendee,
            linkedName: attendee.familyMemberId
                ? (nameById.get(attendee.familyMemberId) ?? null)
                : null,
        })),
        members,
    }
}
