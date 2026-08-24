import type { MemberInput } from '$lib/server/registrations'
import { parseYesNo } from '$lib/utils'
import type { MemberData } from './schema'

/* Converts validated form members into the shape the registration services take.

   Replaces parseFormMembers, which had to JSON.parse a string field because `members` used to
   travel as a hidden input. The form now posts $form as JSON, so members arrives as a real
   validated array and the only work left is turning the two yes/no answers into booleans.

   MemberInput is imported as a type only, so no server code is emitted here. */
export function toMemberInputs(members: MemberData[]): MemberInput[] {
    return members.map((member) => ({
        ...member,
        vegetarianMeal: parseYesNo(member.vegetarianMeal),
        attendedReunion2025: parseYesNo(member.attendedReunion2025),
    }))
}
