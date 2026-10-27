import { quoteAmountDue, type AmountDueQuote } from '$lib/general/pricing'
import type { registrations } from '$lib/server/db/schema'
import { getRegistrationByToken } from './getRegistrationByToken'
import { getRegistrationMembers } from './getRegistrationMembers'

/* What is owed on a paid booking, for whoever holds its view token: the registration, and the quote
   for the places added after it was paid. Undefined when the token matches nothing.

   One lookup for the pay page and the Checkout it opens, so the amount shown and the amount charged
   come off the same rows. The quote is empty on any booking that is not paid, because leaving 'paid'
   clears the owed flag (setRegistrationStatus), so callers need no status check of their own. */
export async function getAmountDueByToken(
    viewToken: string,
): Promise<{ registration: typeof registrations.$inferSelect; quote: AmountDueQuote } | undefined> {
    const registration = await getRegistrationByToken(viewToken)
    if (!registration) {
        return undefined
    }
    return {
        registration,
        quote: quoteAmountDue(await getRegistrationMembers(registration.id)),
    }
}
