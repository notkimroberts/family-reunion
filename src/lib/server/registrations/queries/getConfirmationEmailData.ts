import { eq } from 'drizzle-orm'
import { sumMemberPrices } from '$lib/general/pricing'
import { db } from '$lib/server/db'
import { partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import type { ConfirmationStatus, RegistrationConfirmationData } from '$lib/server/email'
import { formatDateRange } from '$lib/utils'
import { getAge } from '$lib/utils/age'

/* Assembles everything the confirmation email needs for one registration: contact, event
   details, the party breakdown, and the total.

   Shared by the Stripe webhook and admin paper entry so the two paths cannot drift — the
   member detail string and the total are computed once, here. Returns undefined when the
   registration or its event is missing, which the callers treat as "nothing to send".

   The total sums party_members.priceCents (the snapshot of what was actually charged), not
   current tier prices, so a later reprice never changes a historical confirmation. */
export async function getConfirmationEmailData(params: {
    registrationId: string
    manageUrl: string
}): Promise<{ to: string; data: RegistrationConfirmationData } | undefined> {
    const [registration] = await db
        .select({
            eventId: registrations.eventId,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            status: registrations.status,
        })
        .from(registrations)
        .where(eq(registrations.id, params.registrationId))
        .limit(1)

    if (!registration) {
        return undefined
    }

    /* A refunded registration has no confirmation to send. */
    if (registration.status === 'refunded') {
        return undefined
    }

    const [[reunionEvent], members] = await Promise.all([
        db
            .select({
                title: reunionEvents.title,
                startDate: reunionEvents.startDate,
                endDate: reunionEvents.endDate,
                metadata: reunionEvents.metadata,
            })
            .from(reunionEvents)
            .where(eq(reunionEvents.id, registration.eventId))
            .limit(1),
        db
            .select({
                name: partyMembers.name,
                birthYear: partyMembers.birthYear,
                birthMonth: partyMembers.birthMonth,
                birthDay: partyMembers.birthDay,
                shirtSize: partyMembers.shirtSize,
                tierLabel: partyMembers.tierLabel,
                priceCents: partyMembers.priceCents,
            })
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, params.registrationId)),
    ])

    if (!reunionEvent) {
        return undefined
    }

    const eventDateRange = reunionEvent.startDate
        ? formatDateRange(reunionEvent.startDate, reunionEvent.endDate ?? reunionEvent.startDate)
        : undefined

    return {
        to: registration.contactEmail,
        data: {
            name: registration.contactName,
            eventTitle: reunionEvent.title,
            eventDateRange,
            venueName: reunionEvent.metadata.venue?.name,
            venueAddress: reunionEvent.metadata.venue?.address,
            status: registration.status satisfies ConfirmationStatus,
            partyMembers: members.map((member) => {
                const extras: string[] = []
                if (member.birthYear) {
                    extras.push(
                        `age ${getAge(member.birthYear, member.birthMonth, member.birthDay)}`,
                    )
                }
                if (member.shirtSize) {
                    extras.push(`shirt ${member.shirtSize}`)
                }
                return {
                    name: member.name,
                    tierLabel: member.tierLabel,
                    priceCents: member.priceCents,
                    detail: extras.length > 0 ? extras.join(', ') : undefined,
                }
            }),
            totalCents: sumMemberPrices(members),
            manageUrl: params.manageUrl,
        },
    }
}
