import { error } from '@sveltejs/kit'
import { isChildTierLabel } from '$lib/general/tiers'
import type { TierPricing } from '$lib/server/tiers'
import type { MemberInput } from './MemberInput'

/* The person who books and pays for a party is an adult, so their own place cannot be a child one.

   Enforced on the server as well as hidden from the tier dropdown, because the dropdown is not a
   guard: both create paths post a tier ID chosen by the client, and the contact's row is the one
   that carries the booking's contact details and its management token.

   Silent when the party is empty or the contact's tier did not resolve — resolveTierPricing has
   already rejected an unknown id by then, and inventing a second failure mode here would report the
   wrong reason. */
export function assertContactTierIsAdult(
    members: MemberInput[],
    pricingByTierId: Record<string, TierPricing>,
): void {
    const contactTier = members[0] && pricingByTierId[members[0].tierId]

    if (contactTier && isChildTierLabel(contactTier.label)) {
        throw error(400, 'The person registering the party must be booked on an adult tier.')
    }
}
