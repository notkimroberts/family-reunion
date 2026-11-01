import { REGISTRATION_STATUS_LABELS } from '$lib/general/constants/REGISTRATION_STATUS_LABELS'
import type { EventPerson } from '$lib/server/registrations'
import { getPersonDisplayStatus, type CsvColumn } from '$lib/utils'
import { getAge } from '$lib/utils/age'

const YES_NO = (value: boolean | null) => (value === null ? '' : value ? 'Yes' : 'No')

/* One row per attendee — the sheet the caterer, the shirt order and the badges come off. Statuses
   are the shown ones, so a person nobody has paid for reads Payment due, as on the People lens. */
export const peopleCsvColumnsValue: CsvColumn<EventPerson>[] = [
    { header: 'Name', value: (person) => person.name },
    { header: 'Booked by', value: (person) => person.contactName },
    { header: 'Contact email', value: (person) => person.contactEmail },
    { header: 'Tier', value: (person) => person.tierLabel },
    { header: 'Shirt size', value: (person) => person.shirtSize },
    { header: 'Vegetarian', value: (person) => YES_NO(person.vegetarianMeal) },
    {
        header: 'Age',
        value: (person) =>
            person.birthYear === null
                ? undefined
                : getAge(person.birthYear, person.birthMonth, person.birthDay),
    },
    { header: 'City', value: (person) => person.addressCity },
    { header: 'State', value: (person) => person.addressState },
    { header: 'Zip', value: (person) => person.addressZip },
    { header: 'Came in 2025', value: (person) => YES_NO(person.attendedReunion2025) },
    {
        header: 'Status',
        value: (person) => REGISTRATION_STATUS_LABELS[getPersonDisplayStatus(person)],
    },
    { header: 'Arrived', value: (person) => (person.checkedInAt ? 'Yes' : 'No') },
    { header: 'Shirt given', value: (person) => (person.shirtGivenAt ? 'Yes' : 'No') },
]
