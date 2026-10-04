import { describe, expect, it } from 'vitest'
import { APP_DOMAIN, CHECK_PAYEE, ZELLE_RECIPIENT } from '$lib/general/constants'
import { paymentMethods } from './paymentMethods'
import { paymentSafetyCopyValue } from './paymentSafetyCopyValue'

describe('scam warning copy', () => {
    it('names the only three ways to pay', () => {
        const lines = paymentMethods(ZELLE_RECIPIENT).map(
            ({ label, detail }) => `${label} ${detail}`,
        )

        expect(lines).toEqual([
            `Card on ${APP_DOMAIN}`,
            `Zelle to ${ZELLE_RECIPIENT}`,
            `Check made out to "${CHECK_PAYEE}"`,
        ])
    })

    /* What Stripe prints, so a payer recognizes the charge. */
    it('names both card statement descriptors', () => {
        expect(paymentSafetyCopyValue.statementLine).toContain(
            'PATTERSON* REUNION or PATTERSON* GIFT',
        )
    })

    it('sends a doubtful reader to the site, not to the message', () => {
        expect(paymentSafetyCopyValue.verifyLine).toContain(
            `Type ${APP_DOMAIN} into your browser yourself`,
        )
    })
})
