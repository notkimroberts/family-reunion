import { and, eq } from 'drizzle-orm'
import { quoteAmountDue, sumMemberPrices } from '$lib/general/pricing'
import { db } from '$lib/server/db'
import { donations, partyMembers, registrations, reunionEvents } from '$lib/server/db/schema'
import type { ConfirmationStatus, RegistrationConfirmationData } from '$lib/server/email'
import { formatDateRange } from '$lib/utils'
import { getAge } from '$lib/utils/age'

const PAY_PATH = '/register/pay'

/* The pay page on the same origin, carrying the same token as the view link. /register/pay accepts
   ?token= exactly as /register/view does, so callers keep passing one URL. */
function toPayUrl(viewUrl: string): string {
    const payUrl = new URL(viewUrl)
    payUrl.pathname = PAY_PATH
    return payUrl.toString()
}

/* Assembles everything the confirmation email needs for one registration: contact, event
   details, the party breakdown, and the total.

   Shared by the Stripe webhook and admin paper entry so the two paths cannot drift — the
   member detail string and the total are computed once, here. Returns undefined when the
   registration or its event is missing, which the callers treat as "nothing to send".

   The total sums party_members.priceCents (the snapshot of what was actually charged), not
   current tier prices, so a later reprice never changes a historical confirmation. */
export async function getConfirmationEmailData(params: {
    registrationId: string
    viewUrl: string
}): Promise<{ to: string; data: RegistrationConfirmationData } | undefined> {
    const [registration] = await db
        .select({
            eventId: registrations.eventId,
            contactName: registrations.contactName,
            contactEmail: registrations.contactEmail,
            status: registrations.status,
            stripePaymentIntentId: registrations.stripePaymentIntentId,
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

    const [[reunionEvent], members, gifts] = await Promise.all([
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
                id: partyMembers.id,
                name: partyMembers.name,
                birthYear: partyMembers.birthYear,
                birthMonth: partyMembers.birthMonth,
                birthDay: partyMembers.birthDay,
                shirtSize: partyMembers.shirtSize,
                tierLabel: partyMembers.tierLabel,
                priceCents: partyMembers.priceCents,
                paymentDue: partyMembers.paymentDue,
                cardFeeCents: partyMembers.cardFeeCents,
            })
            .from(partyMembers)
            .where(eq(partyMembers.registrationId, params.registrationId)),
        /* Gifts given with this booking. Refunded ones are excluded, so a confirmation re-sent
           after a gift was reversed does not still bill for it. Summed rather than taking the
           first: an admin can record a gift on a paper entry that already carries one. */
        db
            .select({ amountCents: donations.amountCents })
            .from(donations)
            .where(
                and(
                    eq(donations.registrationId, params.registrationId),
                    eq(donations.status, 'paid'),
                ),
            ),
    ])

    if (!reunionEvent) {
        return undefined
    }

    const eventDateRange = reunionEvent.startDate
        ? formatDateRange(reunionEvent.startDate, reunionEvent.endDate ?? reunionEvent.startDate)
        : undefined

    const donationCents = gifts.reduce((sum, gift) => sum + gift.amountCents, 0)

    /* People an organizer added after the booking was paid, and not paid for since. */
    const owed = quoteAmountDue(members)

    return {
        to: registration.contactEmail,
        data: {
            name: registration.contactName,
            eventTitle: reunionEvent.title,
            eventDateRange,
            venueName: reunionEvent.metadata.venue?.name,
            venueAddress: reunionEvent.metadata.venue?.address,
            status: registration.status satisfies ConfirmationStatus,
            /* Written only by the webhook's pending → paid transition. Paper entries and an
               organizer's status change never set it, so it is the one reliable sign of a card. */
            paidByCard: registration.stripePaymentIntentId !== null,
            partyMembers: members.map((member) => {
                const extras: string[] = []
                if (member.birthYear) {
                    extras.push(
                        `Age ${getAge(member.birthYear, member.birthMonth, member.birthDay)}`,
                    )
                }
                if (member.shirtSize) {
                    extras.push(`Shirt ${member.shirtSize}`)
                }
                if (member.paymentDue) {
                    extras.push('Payment needed')
                }
                return {
                    name: member.name,
                    tierLabel: member.tierLabel,
                    priceCents: member.priceCents,
                    detail: extras.length > 0 ? extras.join(', ') : undefined,
                    cardFeeCents: member.cardFeeCents,
                }
            }),
            /* The party plus any gift: this figure has to be what the card was charged, and the
               template prints the gift as its own row so the two agree. */
            totalCents: sumMemberPrices(members) + donationCents,
            donationCents: donationCents > 0 ? donationCents : undefined,
            amountDue:
                owed.netCents > 0
                    ? {
                          netCents: owed.netCents,
                          cardTotalCents: owed.cardTotalCents,
                          payUrl: toPayUrl(params.viewUrl),
                      }
                    : undefined,
            viewUrl: params.viewUrl,
        },
    }
}
