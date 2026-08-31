import type { RegistrationSummary } from '$lib/server/registrations'

/* How many rooms to hold at the host hotel.

   PARTIES AND PEOPLE BOTH, because neither answers the question alone: a hotel block is negotiated in
   rooms, and a party of five needs more than one. The organiser divides; this reports the two figures
   honestly rather than guessing an occupancy.

   Counted over paid-and-waived bookings only, the same set the shirt and meal counts use, for the
   same reason: a room held for a party that never pays is a room paid for empty.

   'undecided' IS reported, and separately. It is the whole reason the question has three answers —
   collapsing maybes into "no" under-books the block, and into "yes" over-books it.

   NOT ASKED is its own figure too. Every booking taken before the question existed has null, and
   reading those as maybes would inflate the block by the entire history of the reunion. It is a list
   of families to ring, not a number to add. */
export type RoomSummary = {
    stayingParties: number
    stayingPeople: number
    undecidedParties: number
    undecidedPeople: number
    elsewhereParties: number
    /* Bookings that predate the question, so nobody has ever been asked. */
    notAskedParties: number
    /* False when nothing is known at all, so the panel can stay quiet rather than print zeroes. */
    hasAnswers: boolean
}

export function getRoomSummary(registrations: RegistrationSummary[]): RoomSummary {
    const attending = registrations.filter(
        (registration) => registration.status === 'paid' || registration.status === 'waived',
    )

    const of = (answer: RegistrationSummary['stayingAtHostHotel']) =>
        attending.filter((registration) => registration.stayingAtHostHotel === answer)

    const staying = of('yes')
    const undecided = of('undecided')
    const people = (rows: RegistrationSummary[]) =>
        rows.reduce((sum, registration) => sum + registration.memberCount, 0)

    return {
        stayingParties: staying.length,
        stayingPeople: people(staying),
        undecidedParties: undecided.length,
        undecidedPeople: people(undecided),
        elsewhereParties: of('no').length,
        notAskedParties: of(null).length,
        hasAnswers: attending.some((registration) => registration.stayingAtHostHotel !== null),
    }
}
