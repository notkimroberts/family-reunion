import type { EventPerson, RegistrationSummary } from '$lib/server/registrations'
import { getBookingDisplayStatus, getPaymentState } from '$lib/utils'

export type FollowUpReason =
    'payment_due' | 'awaiting_check' | 'missing_shirt_size' | 'hotel_undecided' | 'hotel_not_asked'

export type FollowUp = {
    registration: RegistrationSummary
    reasons: FollowUpReason[]
    /* Names of the people in this party with no shirt size, so the call can ask for them. */
    missingShirtNames: string[]
}

/* A check younger than this is still in the post, not a problem. */
const FOLLOW_UP_PENDING_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

/* Every booking an organizer should ring, and why.

   Refunded bookings never appear, nor does an unpaid card checkout: it is someone still on Stripe's
   page, or a row checkout.session.expired deletes within 24 hours. Hotel reasons apply only when a
   host hotel is listed, since otherwise nobody was asked. Most reasons first, then oldest. */
export function getFollowUps(
    registrations: readonly RegistrationSummary[],
    people: readonly EventPerson[],
    options: { now: Date; askHotel: boolean },
): FollowUp[] {
    const pendingCutoff = options.now.getTime() - FOLLOW_UP_PENDING_DAYS * DAY_MS

    return registrations
        .filter(
            (registration) =>
                !['cancelled', 'checkout_incomplete'].includes(getPaymentState(registration)),
        )
        .map((registration) => {
            const missingShirtNames = people
                .filter((person) => person.registrationId === registration.id && !person.shirtSize)
                .map((person) => person.name)
            const isStale = registration.createdAt.getTime() < pendingCutoff
            const candidates: [FollowUpReason, boolean][] = [
                ['payment_due', getBookingDisplayStatus(registration) === 'partly_paid'],
                ['awaiting_check', getPaymentState(registration) === 'awaiting_payment' && isStale],
                ['missing_shirt_size', missingShirtNames.length > 0],
                [
                    'hotel_undecided',
                    options.askHotel && registration.stayingAtHostHotel === 'undecided',
                ],
                ['hotel_not_asked', options.askHotel && registration.stayingAtHostHotel === null],
            ]
            return {
                registration,
                reasons: candidates.filter(([, applies]) => applies).map(([reason]) => reason),
                missingShirtNames,
            }
        })
        .filter((followUp) => followUp.reasons.length > 0)
        .toSorted(
            (a, b) =>
                b.reasons.length - a.reasons.length ||
                a.registration.createdAt.getTime() - b.registration.createdAt.getTime(),
        )
}
