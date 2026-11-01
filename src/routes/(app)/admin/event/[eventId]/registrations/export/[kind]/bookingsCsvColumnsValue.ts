import { HOST_HOTEL } from '$lib/general/constants'
import { REGISTRATION_STATUS_LABELS } from '$lib/general/constants/REGISTRATION_STATUS_LABELS'
import type { RegistrationSummary } from '$lib/server/registrations'
import {
    formatPrice,
    formatReunionDateTime,
    getBookingDisplayStatus,
    type CsvColumn,
} from '$lib/utils'

/* NULL is "never asked" — a booking from before the question — and must not read as no. */
const HOTEL_STAY_LABELS = {
    yes: 'Staying',
    no: 'Elsewhere',
    undecided: 'Not sure',
    unasked: 'Not asked',
}

const HOTEL_COLUMN: CsvColumn<RegistrationSummary> = {
    header: 'Host hotel',
    value: (booking) => HOTEL_STAY_LABELS[booking.stayingAtHostHotel ?? 'unasked'],
}

/* One row per booking, every status — the list for chasing money and ringing families. Amounts are
   plain decimals so a spreadsheet can sum them. */
export const bookingsCsvColumnsValue: CsvColumn<RegistrationSummary>[] = [
    { header: 'Contact', value: (booking) => booking.contactName },
    { header: 'Email', value: (booking) => booking.contactEmail },
    { header: 'Phone', value: (booking) => booking.contactPhone },
    {
        header: 'Status',
        value: (booking) => REGISTRATION_STATUS_LABELS[getBookingDisplayStatus(booking)],
    },
    { header: 'People', value: (booking) => booking.memberCount },
    { header: 'Total', value: (booking) => formatPrice(booking.totalCents) },
    { header: 'Amount due', value: (booking) => formatPrice(booking.amountDueCents) },
    ...(HOST_HOTEL ? [HOTEL_COLUMN] : []),
    { header: 'Booked', value: (booking) => formatReunionDateTime(booking.createdAt, 'short') },
]
