import { parseBirthDate } from '$lib/utils/age'
import type { MemberInput } from './MemberInput'

/* Everything a party_members row is, in one place.

   Four write paths insert into this table — public checkout (contact row and guest rows),
   admin paper entry, admin add, and the Stripe webhook's add_member — and each used to spell the
   same ~15-field literal out by hand. They had already drifted four ways: two trimmed the name and
   two did not, two set isContact and two could not, and the six `|| null` / two `?? null` rules were
   re-derived every time. A new column meant finding all four.

   What is genuinely different between the paths stays an argument, named at the call site:

   - priceCents. The online paths snapshot the Stripe GROSS (what the card is charged); the offline
     paths snapshot the tier's NET. Passing it in keeps that decision visible one line from the call
     rather than buried in the middle of a literal.
   - isContact. Only the two paths that create a whole registration know which row is the contact.
     Defaults to false, which is what the two add-one-member paths need.
   - the Stripe ids, which only the webhook has.

   The name is always trimmed. Two of the four paths did not, so a trailing space in the public form
   reached the database, the confirmation email and the name badge. */
export function buildPartyMemberRow(params: {
    registrationId: string
    member: Omit<MemberInput, 'tierId'>
    tierLabel: string
    priceCents: number
    isContact?: boolean
    stripePaymentIntentId?: string | null
    stripeCheckoutSessionId?: string | null
}) {
    const { member } = params
    /* Optional, and usually absent — personDetailsSchema.birthDate is .optional(). The three parts
       are written together or not at all; a CHECK constraint enforces that day implies month and
       month implies year. */
    const birthDate = member.birthDate ? parseBirthDate(member.birthDate) : null

    return {
        registrationId: params.registrationId,
        name: member.name.trim(),
        isContact: params.isContact ?? false,
        birthYear: birthDate?.birthYear ?? null,
        birthMonth: birthDate?.birthMonth ?? null,
        birthDay: birthDate?.birthDay ?? null,
        /* `|| null` on the strings, so an empty form field is stored as absent rather than as ''.
           `?? null` on the booleans, because false is a real answer to "vegetarian?" and a
           truthiness test would silently discard it. */
        shirtSize: member.shirtSize || null,
        addressLine1: member.addressLine1 || null,
        addressLine2: member.addressLine2 || null,
        addressCity: member.addressCity || null,
        addressState: member.addressState || null,
        addressZip: member.addressZip || null,
        vegetarianMeal: member.vegetarianMeal ?? null,
        attendedReunion2025: member.attendedReunion2025 ?? null,
        tierLabel: params.tierLabel,
        priceCents: params.priceCents,
        stripePaymentIntentId: params.stripePaymentIntentId ?? null,
        stripeCheckoutSessionId: params.stripeCheckoutSessionId ?? null,
    }
}
