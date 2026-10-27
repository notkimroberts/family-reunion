import type { RegistrationStatus } from './getPaymentState'

/* A status as it is SHOWN, which is the stored one except where the stored one would mislead:
   'partly_paid' for a booking and 'payment_due' for a person. Neither is a column — see
   party_members.paymentDue. */
export type DisplayStatus = RegistrationStatus | 'partly_paid' | 'payment_due'

/* The status a booking is shown with.

   A booking stays 'paid' in the database once someone is added to it after payment, because the
   people who paid are coming and must stay on the check-in list. Shown as Paid, though, a booking
   that still owes $165 reads as settled. So a booking with anything owed shows as Partly paid. Only a
   paid booking can owe this way — leaving 'paid' clears the flag (setRegistrationStatus) — so every
   other status shows as stored. */
export function getBookingDisplayStatus(booking: {
    status: RegistrationStatus
    amountDueCents: number
}): DisplayStatus {
    return booking.amountDueCents > 0 ? 'partly_paid' : booking.status
}
