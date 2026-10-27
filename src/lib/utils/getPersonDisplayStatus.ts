import type { DisplayStatus } from './getBookingDisplayStatus'
import type { RegistrationStatus } from './getPaymentState'

/* The status one attendee is shown with: their booking's, except a person added to a paid booking
   whom nobody has paid for, who shows as Payment due rather than borrowing the booking's Paid. */
export function getPersonDisplayStatus(person: {
    status: RegistrationStatus
    paymentDue: boolean
}): DisplayStatus {
    return person.paymentDue ? 'payment_due' : person.status
}
