import { formatUsd } from '$lib/utils/formatUsd'
import { offlinePaymentMethods } from './offlinePaymentMethods'

/* The other two ways to pay an owed amount, said after the card. Still said, because every request for
   money names all three, and a relative without a card must not think there is no other way. The
   recipient is a parameter because the site fills it in after mount. */
export function owedOtherWays(netCents: number, zelleRecipient: string): string {
    return `Prefer not to pay by card? Pay ${formatUsd(netCents)} ${offlinePaymentMethods(zelleRecipient)}. An organizer marks it paid when it arrives.`
}
