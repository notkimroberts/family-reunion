import { APP_DOMAIN, CHECK_PAYEE } from '$lib/general/constants'
import type { PaymentMethod } from './PaymentMethod'

/* The only three ways the reunion takes money. The recipient is a parameter only because the site
   fills it in after mount, so plain HTML scrapers never see the raw address. */
export function paymentMethods(zelleRecipient: string): PaymentMethod[] {
    return [
        { kind: 'card', label: 'Card', detail: `on ${APP_DOMAIN}` },
        { kind: 'zelle', label: 'Zelle', detail: `to ${zelleRecipient}` },
        { kind: 'check', label: 'Check', detail: `made out to "${CHECK_PAYEE}"` },
    ]
}
