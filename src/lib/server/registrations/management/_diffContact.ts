import type { HotelStayAnswer } from '$lib/general/constants'
import type { RegistrationChange } from '$lib/server/email'
import { describeOptional } from './_describeOptional'

/* The registrations columns an organiser can correct on the contact, as stored. */
export type ContactValues = {
    contactName: string
    contactEmail: string
    contactPhone: string | null
    stayingAtHostHotel: HotelStayAnswer | null
}

/* Short, for a before → after line; the form's full sentences do not fit one. */
const HOTEL_STAY_DESCRIPTIONS: Record<HotelStayAnswer, string> = {
    yes: 'Yes',
    no: 'No, staying elsewhere',
    undecided: 'Not sure yet',
}

const FIELDS: { label: string; describe: (values: ContactValues) => string }[] = [
    { label: 'Contact name', describe: (values) => values.contactName },
    { label: 'Contact email', describe: (values) => values.contactEmail },
    { label: 'Phone', describe: (values) => describeOptional(values.contactPhone) },
    {
        label: 'Staying at the host hotel',
        describe: (values) =>
            describeOptional(
                values.stayingAtHostHotel
                    ? HOTEL_STAY_DESCRIPTIONS[values.stayingAtHostHotel]
                    : undefined,
            ),
    },
]

/* What an organiser's edit changed about the booking's contact, as before → after lines for the
   update email. Empty when nothing moved. */
export function diffContact(before: ContactValues, after: ContactValues): RegistrationChange[] {
    return FIELDS.flatMap(({ label, describe }) => {
        const was = describe(before)
        const now = describe(after)
        return was === now ? [] : [{ summary: label, before: was, after: now }]
    })
}
