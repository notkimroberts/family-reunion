import type { MemberInput } from '$lib/server/registrations'
import { parseYesNo } from '$lib/utils'

/* Wire shape of a member as serialized by PartyMembersBuilder's FormMember: the two yes/no
   answers travel as raw strings because the same values are bound to form controls. */
type RawFormMember = Omit<MemberInput, 'vegetarianMeal' | 'attendedReunion2025'> & {
    vegetarianMeal?: string
    attendedReunion2025?: string
}

/* Parses the JSON blob the party builder posts in a hidden input into MemberInput rows.

   Shared by public registration and admin paper entry so the two paths cannot drift on the
   yes/no conversion. Throws on malformed JSON — callers turn that into a 400.

   MemberInput is imported as a type only, so no server code is emitted here. */
export function parseFormMembers(membersJson: string): MemberInput[] {
    const raw: RawFormMember[] = JSON.parse(membersJson)
    return raw.map((member) => ({
        ...member,
        vegetarianMeal: parseYesNo(member.vegetarianMeal),
        attendedReunion2025: parseYesNo(member.attendedReunion2025),
    }))
}
