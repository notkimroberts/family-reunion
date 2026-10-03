import type { RegistrationChange } from '$lib/server/email'
import { formatUsd } from '$lib/utils'
import { formatPartialBirthDate } from '$lib/utils/age'
import { describeOptional } from './_describeOptional'

/* The party_members columns an organiser can correct, as stored. */
export type MemberDetailValues = {
    name: string
    tierLabel: string
    priceCents: number
    birthYear: number | null
    birthMonth: number | null
    birthDay: number | null
    shirtSize: string | null
    vegetarianMeal: boolean | null
    attendedReunion2025: boolean | null
}

function describeYesNo(value: boolean | null): string {
    if (value === null) {
        return describeOptional(undefined)
    }
    return value ? 'Yes' : 'No'
}

/* Field by field, the value as the registrant would recognise it. Labels match the registration
   form's, so the email names a field the way the person filled it in. The tier carries its price
   because a tier change is a price change, and the price is what the registrant will check. */
const FIELDS: { label: string; describe: (values: MemberDetailValues) => string }[] = [
    { label: 'Name', describe: (values) => values.name },
    {
        label: 'Registration tier',
        describe: (values) => `${values.tierLabel} (${formatUsd(values.priceCents)})`,
    },
    {
        label: 'Birthday',
        describe: (values) =>
            describeOptional(
                formatPartialBirthDate(values.birthYear, values.birthMonth, values.birthDay),
            ),
    },
    { label: 'T-shirt', describe: (values) => describeOptional(values.shirtSize) },
    { label: 'Vegetarian meal', describe: (values) => describeYesNo(values.vegetarianMeal) },
    {
        label: 'Attended the 2025 reunion',
        describe: (values) => describeYesNo(values.attendedReunion2025),
    },
]

/* What an organiser's edit actually changed about one attendee, as before → after lines for the
   update email. Compared on the DESCRIBED values, so only a difference the reader could see is
   reported. Empty when nothing moved — the edit form resubmits every row on each save, and the old
   blanket "Bo's details were updated" fired for every attendee whether anything changed or not. */
export function diffMemberDetails(
    before: MemberDetailValues,
    after: MemberDetailValues,
): RegistrationChange[] {
    return FIELDS.flatMap(({ label, describe }) => {
        const was = describe(before)
        const now = describe(after)
        return was === now
            ? []
            : [{ summary: `${before.name} — ${label}`, before: was, after: now }]
    })
}
