import { CHECK_PAYEE } from '$lib/general/constants'

/* The two ways to pay other than a card on the site, as one phrase: "by Zelle to …, or by check
   made out to …". Every place that asks for payment uses this, so no message can name a different
   account. The recipient is a parameter only because the site fills it in after mount. */
export function offlinePaymentMethods(zelleRecipient: string): string {
    return `by Zelle to ${zelleRecipient}, or by check made out to "${CHECK_PAYEE}"`
}
